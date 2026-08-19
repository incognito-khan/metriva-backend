import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import { UserRole } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: AuthenticatedUser) {
    // Only AGENCY_ADMIN can create users
    if (currentUser.role !== UserRole.AGENCY_ADMIN) {
      throw new ForbiddenException("Only AGENCY_ADMIN can create users");
    }

    // AGENCY_ADMIN must belong to an organization
    if (!currentUser.organization) {
      throw new BadRequestException("You must belong to an organization");
    }

    // Normalize email
    const normalizedEmail = createUserDto.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    // Create user with CLIENT_USER role, admin's organization, and emailVerified: true
    const createdUser = await this.userModel.create({
      name: createUserDto.name.trim(),
      email: normalizedEmail,
      password: createUserDto.password,
      role: UserRole.CLIENT_USER,
      organization: currentUser.organization,
      emailVerified: true,
    });

    return {
      success: true,
      message: "User created successfully",
      data: {
        user: createdUser.toJSON(),
      },
    };
  }

  async findAll(currentUser: AuthenticatedUser) {
    const query: any = {};

    // Isolation: AGENCY_ADMIN can only see users in their own org
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        return {
          success: true,
          data: {
            users: [],
          },
        };
      }
      query.organization = currentUser.organization;
    }
    // SUPER_ADMIN can see all users (no org filter)

    const users = await this.userModel
      .find(query)
      .populate("assignedRole", "name")
      .select(
        "-password -passwordResetToken -passwordResetExpires -otpHash -otpExpiresAt",
      )
      .sort({ createdAt: -1 })
      .exec();

    return {
      success: true,
      data: {
        users: users.map((user) => user.toJSON()),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid user ID");
    }

    const user = await this.userModel
      .findById(id)
      .populate("assignedRole", "name")
      .select(
        "-password -passwordResetToken -passwordResetExpires -otpHash -otpExpiresAt",
      )
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this resource");
      }

      if (
        !user.organization ||
        user.organization.toString() !== currentUser.organization
      ) {
        throw new ForbiddenException("You do not have access to this resource");
      }
    }
    // SUPER_ADMIN can access any user

    return {
      success: true,
      data: {
        user: user.toJSON(),
      },
    };
  }
}
