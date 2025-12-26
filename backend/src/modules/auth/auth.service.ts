import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import {
  hashPassword,
  comparePassword,
  hashToken,
  compareToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  createAuditLog,
} from '../../common/utils';
import { ROLES, mapUserToAuthUser } from '../rbac';
import { RegisterInput, LoginInput } from './auth.validators';

const userWithRoleSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  passwordHash: true,
  isActive: true,
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

function buildTokens(user: { id: string; email: string; roleId: string; role: { name: string } }) {
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  };

  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

export async function registerUser(input: RegisterInput, ipAddress?: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already registered', HTTP_STATUS.BAD_REQUEST);
  }

  const defaultRole = await prisma.role.findUnique({ where: { name: ROLES.FRONT_DESK } });
  if (!defaultRole) {
    throw new AppError('Default role not configured. Run database seed.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      roleId: defaultRole.id,
    },
    select: userWithRoleSelect,
  });

  const tokens = buildTokens(user);
  const tokenHash = await hashToken(tokens.refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'auth.register',
    entity: 'User',
    entityId: user.id,
    ipAddress,
  });

  return {
    user: mapUserToAuthUser(user),
    ...tokens,
  };
}

export async function loginUser(input: LoginInput, ipAddress?: string) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: userWithRoleSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const tokens = buildTokens(user);
  const tokenHash = await hashToken(tokens.refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'auth.login',
    entity: 'User',
    entityId: user.id,
    ipAddress,
  });

  return {
    user: mapUserToAuthUser(user),
    ...tokens,
  };
}

export async function refreshAccessToken(refreshToken: string, ipAddress?: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let matchedTokenId: string | null = null;
  for (const stored of storedTokens) {
    const isMatch = await compareToken(refreshToken, stored.tokenHash);
    if (isMatch) {
      matchedTokenId = stored.id;
      break;
    }
  }

  if (!matchedTokenId) {
    throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userWithRoleSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', HTTP_STATUS.UNAUTHORIZED);
  }

  await prisma.refreshToken.update({
    where: { id: matchedTokenId },
    data: { revokedAt: new Date() },
  });

  const tokens = buildTokens(user);
  const tokenHash = await hashToken(tokens.refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'auth.refresh',
    entity: 'User',
    entityId: user.id,
    ipAddress,
  });

  return {
    user: mapUserToAuthUser(user),
    ...tokens,
  };
}

export async function logoutUser(refreshToken: string, userId?: string, ipAddress?: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const targetUserId = userId ?? payload.sub;

    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        userId: targetUserId,
        revokedAt: null,
      },
    });

    for (const stored of storedTokens) {
      const isMatch = await compareToken(refreshToken, stored.tokenHash);
      if (isMatch) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    await createAuditLog({
      userId: targetUserId,
      action: 'auth.logout',
      entity: 'User',
      entityId: targetUserId,
      ipAddress,
    });
  } catch {
    // Silently succeed on invalid tokens during logout
  }
}
