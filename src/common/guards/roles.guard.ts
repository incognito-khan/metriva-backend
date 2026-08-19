import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user || !user.role) {
      console.warn("RolesGuard: No user found in request");
      throw new ForbiddenException("Authentication required");
    }

    if (!requiredRoles.includes(user.role)) {
      console.warn(
        `RolesGuard: User role ${user.role} not in required roles ${requiredRoles.join(", ")}`,
      );
      throw new ForbiddenException(
        "You do not have permission to perform this action",
      );
    }

    return true;
  }
}
