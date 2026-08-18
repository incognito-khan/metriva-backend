import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RolesGuard } from './guards/roles.guard';
import { OrgAccessGuard } from './guards/org-access.guard';
import { ClientAccessGuard } from './guards/client-access.guard';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    HttpExceptionFilter,
    RolesGuard,
    OrgAccessGuard,
    ClientAccessGuard,
  ],
  exports: [
    HttpExceptionFilter,
    RolesGuard,
    OrgAccessGuard,
    ClientAccessGuard,
  ],
})
export class CommonModule {}
