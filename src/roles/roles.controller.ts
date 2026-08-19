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
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

@Controller("api/roles")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Static routes MUST come before /:id routes

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.create(createRoleDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.rolesService.findAll(currentUser);
  }

  @Get("permissions")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async getAvailablePermissions() {
    return this.rolesService.getAvailablePermissions();
  }

  @Post("assign")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.assignRole(assignRoleDto, currentUser);
  }

  @Delete("assign/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async removeRoleAssignment(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.removeRoleAssignment(id, currentUser);
  }

  @Get("user/:userId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async getUserRoles(
    @Param("userId") userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.getUserRoles(userId, currentUser);
  }

  // /:id routes MUST come after static routes

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.findOne(id, currentUser);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async update(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.update(id, updateRoleDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async remove(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.remove(id, currentUser);
  }
}
