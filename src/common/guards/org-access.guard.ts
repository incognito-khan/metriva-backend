import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class OrgAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      console.warn('OrgAccessGuard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (user.role === 'CLIENT_USER') {
      console.warn(`OrgAccessGuard: CLIENT_USER ${user.id} attempted organization access`);
      throw new ForbiddenException('You do not have access to this organization');
    }

    if (user.role === 'AGENCY_ADMIN') {
      const targetOrgId = 
        request.params.orgId || 
        request.params.id || 
        request.body.organization;

      if (!targetOrgId) {
        console.warn(`OrgAccessGuard: No organization ID found in request for AGENCY_ADMIN ${user.id}`);
        throw new ForbiddenException('Organization ID required');
      }

      if (user.organization !== targetOrgId) {
        console.warn(`OrgAccessGuard: AGENCY_ADMIN ${user.id} attempted access to organization ${targetOrgId} but belongs to ${user.organization}`);
        throw new ForbiddenException('You do not have access to this organization');
      }

      return true;
    }

    console.warn(`OrgAccessGuard: Unknown role ${user.role} for user ${user.id}`);
    throw new ForbiddenException('Invalid user role');
  }
}
