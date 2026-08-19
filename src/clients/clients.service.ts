import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Client, ClientDocument } from "./schemas/client.schema";
import { ClientStatus } from "./schemas/client.schema";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { QueryClientDto } from "./dto/query-client.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UserRole } from "../users/schemas/user.schema";

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
  ) {}

  async create(createClientDto: CreateClientDto, currentUser: AuthenticatedUser) {
    let organizationId: string;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN must provide organization in body
      if (!createClientDto.organization) {
        throw new BadRequestException("Organization is required");
      }
      organizationId = createClientDto.organization;
    } else if (currentUser.role === UserRole.AGENCY_ADMIN) {
      // AGENCY_ADMIN's organization is always their own (ignore body)
      if (!currentUser.organization) {
        throw new BadRequestException("You must belong to an organization");
      }
      organizationId = currentUser.organization;
    } else {
      throw new ForbiddenException("Insufficient permissions");
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException("Invalid organization ID");
    }

    // Normalize email if provided
    if (createClientDto.email) {
      createClientDto.email = createClientDto.email.toLowerCase().trim();
    }

    // Create the client
    const createdClient = await this.clientModel.create({
      businessName: createClientDto.businessName.trim(),
      website: createClientDto.website?.trim(),
      businessCategory: createClientDto.businessCategory?.trim(),
      location: createClientDto.location?.trim(),
      phone: createClientDto.phone?.trim(),
      email: createClientDto.email,
      timezone: createClientDto.timezone?.trim() || "UTC",
      organization: organizationId,
      status: createClientDto.status || ClientStatus.ACTIVE,
    });

    return {
      success: true,
      message: "Client created successfully",
      data: {
        client: createdClient.toJSON(),
      },
    };
  }

  async findAll(queryDto: QueryClientDto, currentUser: AuthenticatedUser) {
    const { page = 1, limit = 20, search, status } = queryDto;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Isolation: AGENCY_ADMIN can only see their own org's clients
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        return {
          success: true,
          data: {
            clients: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          },
        };
      }
      query.organization = currentUser.organization;
    }
    // SUPER_ADMIN can see all clients (no org filter)

    // Status filter
    if (status) {
      query.status = status;
    }

    // Case-insensitive search on businessName
    if (search) {
      query.businessName = { $regex: search, $options: "i" };
    }

    // Get total count
    const total = await this.clientModel.countDocuments(query);

    // Get clients with pagination
    const clients = await this.clientModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      success: true,
      data: {
        clients: clients.map((client) => client.toJSON()),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid client ID");
    }

    const client = await this.clientModel.findById(id).exec();

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }

      if (client.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }
    }
    // SUPER_ADMIN can access any client

    return {
      success: true,
      data: {
        client: client.toJSON(),
      },
    };
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    currentUser: AuthenticatedUser,
  ) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid client ID");
    }

    const client = await this.clientModel.findById(id).exec();

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }

      if (client.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }
    }
    // SUPER_ADMIN can update any client

    // Normalize email if provided
    if (updateClientDto.email) {
      updateClientDto.email = updateClientDto.email.toLowerCase().trim();
    }

    // Update client fields
    if (updateClientDto.businessName) {
      client.businessName = updateClientDto.businessName.trim();
    }
    if (updateClientDto.website !== undefined) {
      client.website = updateClientDto.website?.trim();
    }
    if (updateClientDto.businessCategory !== undefined) {
      client.businessCategory = updateClientDto.businessCategory?.trim();
    }
    if (updateClientDto.location !== undefined) {
      client.location = updateClientDto.location?.trim();
    }
    if (updateClientDto.phone !== undefined) {
      client.phone = updateClientDto.phone?.trim();
    }
    if (updateClientDto.email !== undefined) {
      client.email = updateClientDto.email;
    }
    if (updateClientDto.timezone !== undefined) {
      client.timezone = updateClientDto.timezone?.trim() || "UTC";
    }
    if (updateClientDto.status !== undefined) {
      client.status = updateClientDto.status;
    }

    await client.save();

    return {
      success: true,
      message: "Client updated successfully",
      data: {
        client: client.toJSON(),
      },
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid client ID");
    }

    const client = await this.clientModel.findById(id).exec();

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    // Server-side isolation check
    if (currentUser.role === UserRole.AGENCY_ADMIN) {
      if (!currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }

      if (client.organization.toString() !== currentUser.organization) {
        throw new ForbiddenException("You do not have access to this client");
      }
    }
    // SUPER_ADMIN can delete any client

    // Soft delete: set status to inactive
    client.status = ClientStatus.INACTIVE;
    await client.save();

    return {
      success: true,
      message: "Client disabled successfully",
    };
  }

  async countByOrganization(organizationId: string) {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const count = await this.clientModel.countDocuments({
      organization: organizationId,
      status: ClientStatus.ACTIVE,
    });

    return {
      success: true,
      data: {
        count,
      },
    };
  }
}
