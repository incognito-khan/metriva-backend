import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Read refresh token from HttpOnly cookie
    const refreshToken = request.cookies.refreshToken;

    // If refresh token is missing, return 401 Unauthorized
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token required");
    }

    try {
      // Verify the refresh token
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      // Ensure the token is of the correct type
      if (decoded.type !== "refresh") {
        throw new UnauthorizedException("Invalid or expired refresh token");
      }

      // Attach authenticated user's identity to request object
      request.user = { id: decoded.sub };

      return true;
    } catch (error) {
      // If token is invalid, malformed, expired, or incorrectly signed, return 401
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
