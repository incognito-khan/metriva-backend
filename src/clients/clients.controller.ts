import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { QueryClientDto } from "./dto/query-client.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ClientAccessGuard } from "../common/guards/client-access.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

@Controller("api/clients")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.clientsService.create(createClientDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findAll(
    @Query() queryDto: QueryClientDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.clientsService.findAll(queryDto, currentUser);
  }

  @Get(":id")
  @UseGuards(ClientAccessGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.clientsService.findOne(id, currentUser);
  }

  @Patch(":id")
  @UseGuards(ClientAccessGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async update(
    @Param("id") id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.clientsService.update(id, updateClientDto, currentUser);
  }

  @Delete(":id")
  @UseGuards(ClientAccessGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async remove(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.clientsService.remove(id, currentUser);
  }
}
