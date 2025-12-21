export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface TokenPayload {
  sub: string;
  email: string;
  roleId: string;
  roleName: string;
  type: 'access' | 'refresh';
}
