import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

@Controller("api/organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.organizationsService.create(createOrganizationDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.organizationsService.findAll(currentUser);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.organizationsService.findOne(id, currentUser);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN)
  async remove(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.organizationsService.remove(id, currentUser);
  }
}
