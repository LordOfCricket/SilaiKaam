// Identity/authorization domain types shared across services and the web app.

export const ROLES = [
  'CUSTOMER',
  'TAILOR',
  'FITTING_EXPERT',
  'SHOP_OWNER',
  'STAFF',
  'SUPER_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
