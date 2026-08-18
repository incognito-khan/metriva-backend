import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class ClientAccessGuard implements CanActivate {
  constructor(@InjectModel("Client") private clientModel: Model<any>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      console.warn("ClientAccessGuard: No user found in request");
      throw new ForbiddenException("Authentication required");
    }

    const clientId = request.params.id || request.params.clientId;

    if (!clientId) {
      console.warn("ClientAccessGuard: No client ID found in request");
      throw new NotFoundException("Client ID required");
    }

    const client = await this.clientModel
      .findById(clientId)
      .select("organization")
      .exec();

    if (!client) {
      console.warn(`ClientAccessGuard: Client not found with ID: ${clientId}`);
      throw new NotFoundException("Client not found");
    }

    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    if (user.role === "AGENCY_ADMIN") {
      const clientOrgId = client.organization?.toString();

      if (!clientOrgId) {
        console.warn(
          `ClientAccessGuard: Client ${clientId} has no organization`,
        );
        throw new ForbiddenException("Client has no organization");
      }

      if (user.organization !== clientOrgId) {
        console.warn(
          `ClientAccessGuard: AGENCY_ADMIN ${user.id} attempted access to client ${clientId} in organization ${clientOrgId} but belongs to ${user.organization}`,
        );
        throw new ForbiddenException("You do not have access to this client");
      }

      return true;
    }

    if (user.role === "CLIENT_USER") {
      console.warn(
        `ClientAccessGuard: CLIENT_USER ${user.id} attempted client access`,
      );
      throw new ForbiddenException("CLIENT_USER role not yet implemented");
    }

    console.warn(
      `ClientAccessGuard: Unknown role ${user.role} for user ${user.id}`,
    );
    throw new ForbiddenException("Invalid user role");
  }
}
