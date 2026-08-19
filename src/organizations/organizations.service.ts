import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import {
  Organization,
  OrganizationDocument,
} from "./schemas/organization.schema";
import { OrganizationStatus } from "./schemas/organization.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { UserRole } from "../users/schemas/user.schema";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { InjectConnection } from "@nestjs/mongoose";
import { Role, RoleDocument } from "../roles/schemas/role.schema";
import { AVAILABLE_PERMISSIONS } from "../roles/permissions";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    currentUser: AuthenticatedUser,
  ) {
    // Only SUPER_ADMIN can create organizations
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only SUPER_ADMIN can create organizations");
    }

    const {
      name,
      email,
      phone,
      website,
      address,
      adminName,
      adminEmail,
      adminPassword,
    } = createOrganizationDto;

    // Normalize emails for consistency
    const normalizedOrgEmail = email.toLowerCase().trim();
    const normalizedAdminEmail = adminEmail.toLowerCase().trim();

    // Check if organization email already exists
    const existingOrg = await this.organizationModel
      .findOne({ email: normalizedOrgEmail })
      .exec();

    if (existingOrg) {
      throw new ConflictException(
        "An organization with this email already exists",
      );
    }

    // Check if admin email already exists
    const existingAdmin = await this.userModel
      .findOne({ email: normalizedAdminEmail })
      .exec();

    if (existingAdmin) {
      throw new ConflictException("An account with this email already exists");
    }

    // Start a MongoDB transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Create the AGENCY_ADMIN user first
      const createdAdmin = (
        await this.userModel.create(
          [
            {
              name: adminName.trim(),
              email: normalizedAdminEmail,
              password: adminPassword,
              role: UserRole.AGENCY_ADMIN,
              emailVerified: true,
            },
          ],
          { session },
        )
      )[0] as UserDocument;

      // Create the organization with the admin as owner
      const createdOrg = (
        await this.organizationModel.create(
          [
            {
              name: name.trim(),
              email: normalizedOrgEmail,
              phone: phone?.trim(),
              website: website?.trim(),
              address: address?.trim(),
              owner: createdAdmin._id.toString(),
              status: OrganizationStatus.ACTIVE,
            },
          ],
          { session },
        )
      )[0] as OrganizationDocument;

      // Update the admin with the organization reference
      createdAdmin.organization = createdOrg._id.toString();
      await createdAdmin.save({ session });

      // Create default system roles for the organization
      await this.roleModel.create(
        [
          {
            name: "Admin",
            description: "Full access (system role)",
            organization: createdOrg._id.toString(),
            permissions: [...AVAILABLE_PERMISSIONS],
            isSystem: true,
          },
        ],
        { session },
      );

      await this.roleModel.create(
        [
          {
            name: "Viewer",
            description: "Read-only (system role)",
            organization: createdOrg._id.toString(),
            permissions: [
              "clients:read",
              "leads:read",
              "revenue:read",
              "reports:read",
              "seo:read",
              "settings:read",
            ],
            isSystem: true,
          },
        ],
        { session },
      );

      // Commit the transaction
      await session.commitTransaction();

      return {
        success: true,
        message: "Organization created successfully",
        data: {
          organization: createdOrg.toJSON(),
          admin: {
            id: createdAdmin._id.toString(),
            email: createdAdmin.email,
          },
        },
      };
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      console.error("Error creating organization:", error);
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  }

  async findAll(currentUser: AuthenticatedUser) {
    let organizations;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can see all organizations
      organizations = await this.organizationModel
        .find()
        .populate("owner", "name email")
        .exec();
    } else if (currentUser.role === UserRole.AGENCY_ADMIN) {
      // AGENCY_ADMIN can only see their own organization
      if (!currentUser.organization) {
        return {
          success: true,
          data: {
            organizations: [],
          },
        };
      }

      organizations = await this.organizationModel
        .find({ _id: currentUser.organization })
        .populate("owner", "name email")
        .exec();
    } else {
      throw new ForbiddenException("Insufficient permissions");
    }

    return {
      success: true,
      data: {
        organizations: organizations.map((org) => org.toJSON()),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel
      .findById(id)
      .populate("owner", "name email")
      .exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // AGENCY_ADMIN can only access their own organization
    if (
      currentUser.role === UserRole.AGENCY_ADMIN &&
      currentUser.organization !== id
    ) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    return {
      success: true,
      data: {
        organization: organization.toJSON(),
      },
    };
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    currentUser: AuthenticatedUser,
  ) {
    // Only SUPER_ADMIN can update organizations
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only SUPER_ADMIN can update organizations");
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Check email conflict if email is being updated
    if (updateOrganizationDto.email) {
      const normalizedEmail = updateOrganizationDto.email.toLowerCase().trim();
      const existingOrg = await this.organizationModel
        .findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        })
        .exec();

      if (existingOrg) {
        throw new ConflictException(
          "An organization with this email already exists",
        );
      }

      updateOrganizationDto.email = normalizedEmail;
    }

    // Update organization fields
    if (updateOrganizationDto.name) {
      organization.name = updateOrganizationDto.name.trim();
    }
    if (updateOrganizationDto.email) {
      organization.email = updateOrganizationDto.email;
    }
    if (updateOrganizationDto.phone !== undefined) {
      organization.phone = updateOrganizationDto.phone?.trim();
    }
    if (updateOrganizationDto.website !== undefined) {
      organization.website = updateOrganizationDto.website?.trim();
    }
    if (updateOrganizationDto.address !== undefined) {
      organization.address = updateOrganizationDto.address?.trim();
    }

    await organization.save();

    return {
      success: true,
      message: "Organization updated successfully",
      data: {
        organization: organization.toJSON(),
      },
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    // Only SUPER_ADMIN can suspend organizations
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Only SUPER_ADMIN can suspend organizations",
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Soft delete: set status to suspended
    organization.status = OrganizationStatus.SUSPENDED;
    await organization.save();

    return {
      success: true,
      message: "Organization suspended successfully",
    };
  }
}
