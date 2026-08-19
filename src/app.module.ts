import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import configuration from "./config/configuration";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { EmailModule } from "./email/email.module";
import { CommonModule } from "./common/common.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ClientsModule } from "./clients/clients.module";
import { HealthController } from "./common/controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        "mongodb://admin:password123@localhost:27017/metriva?retryWrites=false&authSource=admin",
    ),
    CommonModule,
    AuthModule,
    UsersModule,
    EmailModule,
    OrganizationsModule,
    ClientsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
