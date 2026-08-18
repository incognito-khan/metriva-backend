import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export function checkOrganizationAccess(user: AuthenticatedUser, resourceOrgId: string): void {
  if (user.role === 'SUPER_ADMIN') {
    return;
  }

  if (user.organization !== resourceOrgId) {
    throw new ForbiddenException('You do not have access to this resource');
  }
}
