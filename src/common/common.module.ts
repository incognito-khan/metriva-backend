import { Module, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { RolesGuard } from "./guards/roles.guard";
import { OrgAccessGuard } from "./guards/org-access.guard";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [HttpExceptionFilter, RolesGuard, OrgAccessGuard],
  exports: [HttpExceptionFilter, RolesGuard, OrgAccessGuard],
})
export class CommonModule {}
