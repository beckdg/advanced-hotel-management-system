import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { mapUserToAuthUser } from '../rbac';
import { UpdateUserInput } from './users.validators';

const userWithRoleSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      name: true,
      permissions: {
        select: {
          permission: { select: { name: true } },
        },
      },
    },
  },
} as const;

function formatUser(user: {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: { name: string; permissions: { permission: { name: string } }[] };
}) {
  return {
    ...mapUserToAuthUser(user),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userWithRoleSelect,
  });

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return formatUser(user);
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    select: userWithRoleSelect,
    orderBy: { createdAt: 'desc' },
  });

  return users.map(formatUser);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userWithRoleSelect,
  });

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return formatUser(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (input.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: input.email, id: { not: id } },
    });
    if (emailTaken) {
      throw new AppError('Email already in use', HTTP_STATUS.BAD_REQUEST);
    }
  }

  if (input.roleId) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: input,
    select: userWithRoleSelect,
  });

  await createAuditLog({
    userId: actorId,
    action: 'users.update',
    entity: 'User',
    entityId: id,
    metadata: { changes: input } as unknown as Prisma.InputJsonValue,
    ipAddress,
  });

  return formatUser(user);
}
