export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'CLIENT_USER';
  organization: string | null;
  assignedRole: string | null;
}
