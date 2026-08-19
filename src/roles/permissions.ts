export const AVAILABLE_PERMISSIONS = [
  'clients:read',
  'clients:write',
  'clients:delete',
  'leads:read',
  'leads:write',
  'leads:delete',
  'revenue:read',
  'revenue:write',
  'reports:read',
  'reports:export',
  'seo:read',
  'settings:read',
  'settings:write',
] as const;

export type AvailablePermission = typeof AVAILABLE_PERMISSIONS[number];
