import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { Role, RoleSchema } from "./schemas/role.schema";
import { RoleAssignment, RoleAssignmentSchema } from "./schemas/role-assignment.schema";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ClientsModule,
    MongooseModule.forFeature([
      {
        name: Role.name,
        schema: RoleSchema,
      },
      {
        name: RoleAssignment.name,
        schema: RoleAssignmentSchema,
      },
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
