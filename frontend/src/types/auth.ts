export interface User {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  roleName: string;
  permissions: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  status: 'success';
  data: AuthTokens & { user: User };
}

export interface LoginCredentials {
  email: string;
  password: string;
}
