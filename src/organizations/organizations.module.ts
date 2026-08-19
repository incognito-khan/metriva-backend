import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrganizationsService } from "./organizations.service";
import { OrganizationsController } from "./organizations.controller";
import {
  Organization,
  OrganizationSchema,
} from "./schemas/organization.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Role, RoleSchema } from "../roles/schemas/role.schema";
import { UsersModule } from "../users/users.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
