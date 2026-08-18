import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Read access token from HttpOnly cookie
    const accessToken = request.cookies.accessToken;

    // If access token is missing, return 401 Unauthorized
    if (!accessToken) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      // Verify the access token
      const decoded = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      });

      // Ensure the token is of the correct type
      if (decoded.type !== "access") {
        throw new UnauthorizedException(
          "Invalid or expired authentication token",
        );
      }

      // Attach authenticated user's identity to request object
      request.user = { id: decoded.sub };

      return true;
    } catch (error) {
      // If token is invalid, malformed, expired, or incorrectly signed, return 401
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }
  }
}
