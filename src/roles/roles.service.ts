import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Role, RoleDocument } from "./schemas/role.schema";
import {
  RoleAssignment,
  RoleAssignmentDocument,
} from "./schemas/role-assignment.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UserRole } from "../users/schemas/user.schema";
import { AVAILABLE_PERMISSIONS } from "./permissions";

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
    @InjectModel(RoleAssignment.name)
    private roleAssignmentModel: Model<RoleAssignmentDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(createRoleDto: CreateRoleDto, currentUser: AuthenticatedUser) {
    // Validate organization
    if (!Types.ObjectId.isValid(createRoleDto.organization)) {
      throw new BadRequestException("Invalid organization ID");
    }

    // Server-side: AGENCY_ADMIN can only create roles in their own org
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new BadRequestException("You must belong to an organization");
      }
      if (createRoleDto.organization !== currentUser.organization) {
        throw new ForbiddenException(
          "You can only create roles in your own organization",
        );
      }
    }
    // SUPER_ADMIN can create roles in any org

    // Validate permissions against fixed list
    const invalidPermissions = createRoleDto.permissions.filter(
      (perm) => !AVAILABLE_PERMISSIONS.includes(perm as any),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(", ")}`,
      );
    }

    // Check for duplicate role name in organization
    const existingRole = await this.roleModel.findOne({
      organization: createRoleDto.organization,
      name: createRoleDto.name.trim(),
    });
    if (existingRole) {
      throw new ConflictException(
        "A role with this name already exists in this organization",
      );
    }

    // Create the role
    const createdRole = await this.roleModel.create({
      name: createRoleDto.name.trim(),
      description: createRoleDto.description?.trim(),
      organization: createRoleDto.organization,
      permissions: createRoleDto.permissions,
      isSystem: false,
    });

    return {
      success: true,
      message: "Role created successfully",
      data: {
        role: createdRole.toJSON(),
      },
    };
  }

  async findAll(currentUser: AuthenticatedUser) {
    const query: any = {};

    // Isolation: AGENCY_ADMIN can only see their own org's roles
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        return {
          success: true,
          data: {
            roles: [],
          },
        };
      }
      query.organization = currentUser.organization;
    }
    // SUPER_ADMIN can see all roles (no org filter)

    const roles = await this.roleModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    return {
      success: true,
      data: {
        roles: roles.map((role) => role.toJSON()),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid role ID");
    }

    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }

      if (role.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }
    }
    // SUPER_ADMIN can access any role

    return {
      success: true,
      data: {
        role: role.toJSON(),
      },
    };
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    currentUser: AuthenticatedUser,
  ) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid role ID");
    }

    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // System roles cannot be modified
    if (role.isSystem) {
      throw new ForbiddenException("System roles cannot be modified");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }

      if (role.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }
    }
    // SUPER_ADMIN can update any role

    // Validate permissions if provided
    if (updateRoleDto.permissions) {
      const invalidPermissions = updateRoleDto.permissions.filter(
        (perm) => !AVAILABLE_PERMISSIONS.includes(perm as any),
      );
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(
          `Invalid permissions: ${invalidPermissions.join(", ")}`,
        );
      }
    }

    // Check for duplicate name if name is being changed
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleModel.findOne({
        organization: role.organization,
        name: updateRoleDto.name.trim(),
        _id: { $ne: id },
      });
      if (existingRole) {
        throw new ConflictException(
          "A role with this name already exists in this organization",
        );
      }
    }

    // Update role fields
    if (updateRoleDto.name) {
      role.name = updateRoleDto.name.trim();
    }
    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description?.trim();
    }
    if (updateRoleDto.permissions) {
      role.permissions = updateRoleDto.permissions;
    }

    await role.save();

    return {
      success: true,
      message: "Role updated successfully",
      data: {
        role: role.toJSON(),
      },
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid role ID");
    }

    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // System roles cannot be deleted
    if (role.isSystem) {
      throw new ForbiddenException("System roles cannot be deleted");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }

      if (role.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this role");
      }
    }
    // SUPER_ADMIN can delete any role

    // Check for active assignments
    const activeAssignments = await this.roleAssignmentModel.countDocuments({
      role: id,
    });
    if (activeAssignments > 0) {
      throw new ConflictException(
        "Cannot delete a role that has active assignments",
      );
    }

    await this.roleModel.findByIdAndDelete(id).exec();

    return {
      success: true,
      message: "Role deleted successfully",
    };
  }

  async assignRole(
    assignRoleDto: AssignRoleDto,
    currentUser: AuthenticatedUser,
  ) {
    // Validate ObjectIds
    if (!Types.ObjectId.isValid(assignRoleDto.user)) {
      throw new BadRequestException("Invalid user ID");
    }
    if (!Types.ObjectId.isValid(assignRoleDto.role)) {
      throw new BadRequestException("Invalid role ID");
    }
    if (assignRoleDto.client && !Types.ObjectId.isValid(assignRoleDto.client)) {
      throw new BadRequestException("Invalid client ID");
    }

    // Fetch role
    const role = await this.roleModel.findById(assignRoleDto.role).exec();
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // Fetch user
    const user = await this.userModel.findById(assignRoleDto.user).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Server-side: All entities must belong to the same organization
    const targetOrganization = role.organization.toString();

    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new BadRequestException("You must belong to an organization");
      }
      if (currentUser.organization !== targetOrganization) {
        throw new ForbiddenException(
          "You can only assign roles in your own organization",
        );
      }
    }
    // SUPER_ADMIN can assign roles in any org

    // Verify user belongs to the target organization
    if (
      !user.organization ||
      user.organization.toString() !== targetOrganization
    ) {
      throw new BadRequestException(
        "User does not belong to the role's organization",
      );
    }

    // Verify client (if provided) belongs to the target organization
    if (assignRoleDto.client) {
      const ClientModel = this.roleModel.db.model("Client");
      const client = await ClientModel.findById(assignRoleDto.client).exec();
      if (!client) {
        throw new NotFoundException("Client not found");
      }
      if (client.organization.toString() !== targetOrganization) {
        throw new BadRequestException(
          "Client does not belong to the role's organization",
        );
      }
    }

    // Check for duplicate assignment
    const existingAssignment = await this.roleAssignmentModel.findOne({
      user: assignRoleDto.user,
      role: assignRoleDto.role,
      organization: targetOrganization,
      ...(assignRoleDto.client ? { client: assignRoleDto.client } : {}),
    });
    if (existingAssignment) {
      throw new ConflictException("This role is already assigned to this user");
    }

    // Create the assignment
    await this.roleAssignmentModel.create({
      user: assignRoleDto.user,
      role: assignRoleDto.role,
      organization: targetOrganization,
      client: assignRoleDto.client || undefined,
    });

    // Update user's assignedRole
    user.assignedRole = assignRoleDto.role;
    await user.save();

    return {
      success: true,
      message: "Role assigned successfully",
    };
  }

  async removeRoleAssignment(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid assignment ID");
    }

    const assignment = await this.roleAssignmentModel.findById(id).exec();

    if (!assignment) {
      throw new NotFoundException("Role assignment not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException(
          "You do not have access to this assignment",
        );
      }

      if (assignment.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException(
          "You do not have access to this assignment",
        );
      }
    }
    // SUPER_ADMIN can remove any assignment

    // Clear user's assignedRole if it matches this assignment
    const user = await this.userModel.findById(assignment.user).exec();
    if (
      user &&
      user.assignedRole &&
      user.assignedRole.toString() === assignment.role.toString()
    ) {
      user.assignedRole = undefined;
      await user.save();
    }

    await this.roleAssignmentModel.findByIdAndDelete(id).exec();

    return {
      success: true,
      message: "Role assignment removed successfully",
    };
  }

  async getUserRoles(userId: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user ID");
    }

    // Server-side: AGENCY_ADMIN can only view roles for users in their org
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new BadRequestException("You must belong to an organization");
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException("User not found");
      }

      if (
        !user.organization ||
        user.organization.toString() !== currentUser.organization
      ) {
        throw new ForbiddenException(
          "You do not have access to this user's roles",
        );
      }
    }
    // SUPER_ADMIN can view any user's roles

    const assignments = await this.roleAssignmentModel
      .find({ user: userId })
      .populate("role")
      .exec();

    return {
      success: true,
      data: {
        assignments: assignments.map((assignment) => ({
          ...assignment.toJSON(),
          role: (assignment as any).role?.toJSON(),
        })),
      },
    };
  }

  getAvailablePermissions() {
    return {
      success: true,
      data: {
        permissions: AVAILABLE_PERMISSIONS,
      },
    };
  }
}
