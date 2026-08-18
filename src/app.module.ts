import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import configuration from "./config/configuration";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { EmailModule } from "./email/email.module";
import { CommonModule } from "./common/common.module";
import { HealthController } from "./common/controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        "mongodb://admin:password123@127.0.0.1:27017/metriva?authSource=admin",
    ),
    CommonModule,
    AuthModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
