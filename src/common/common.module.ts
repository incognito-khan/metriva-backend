import { Module, Global, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { RolesGuard } from "./guards/roles.guard";
import { OrgAccessGuard } from "./guards/org-access.guard";
import { LoggerMiddleware } from "./middleware/logger.middleware";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    HttpExceptionFilter,
    RolesGuard,
    OrgAccessGuard,
    LoggerMiddleware,
  ],
  exports: [HttpExceptionFilter, RolesGuard, OrgAccessGuard, LoggerMiddleware],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
