import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { EmailModule } from "../email/email.module";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { JwtRefreshGuard } from "../common/guards/jwt-refresh.guard";
import { User, UserSchema } from "../users/schemas/user.schema";

@Module({
  imports: [
    UsersModule,
    EmailModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.accessSecret"),
        signOptions: {
          expiresIn: (configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m") as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, JwtRefreshGuard],
  exports: [AuthService, JwtAuthGuard, JwtRefreshGuard],
})
export class AuthModule {}
