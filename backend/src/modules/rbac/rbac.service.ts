import { prisma } from '../../config/database';
import { AuthUser } from './rbac.types';

const userWithRoleSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  isActive: true,
  role: {
    select: {
      name: true,
      permissions: {
        select: {
          permission: {
            select: { name: true },
          },
        },
      },
    },
  },
} as const;

type UserWithRole = {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  isActive: boolean;
  role: {
    name: string;
    permissions: { permission: { name: string } }[];
  };
};

export function mapUserToAuthUser(user: UserWithRole): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.name),
  };
}

export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userWithRoleSelect,
  });

  if (!user || !user.isActive) {
    return null;
  }

  return mapUserToAuthUser(user);
}

export function userHasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission);
}
