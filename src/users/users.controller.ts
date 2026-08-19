import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UserRole } from "./schemas/user.schema";

@Controller("api/users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.AGENCY_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.create(createUserDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findAll(currentUser);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  async findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.findOne(id, currentUser);
  }
}
