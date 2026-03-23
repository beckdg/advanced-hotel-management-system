import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuditLogFilterQuery } from './audit.validators';

export interface AuditLogInput {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

const auditInclude = {
  user: { select: { id: true, name: true, email: true } },
};

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    },
  });
}

function buildAuditWhere(filters: AuditLogFilterQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.entityType) where.entity = filters.entityType;
  if (filters.action) where.action = filters.action;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return where;
}

export async function listAuditLogs(filters: AuditLogFilterQuery, limit = 100) {
  return prisma.auditLog.findMany({
    where: buildAuditWhere(filters),
    include: auditInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getRecentAuditLogs(limit = 5) {
  return prisma.auditLog.findMany({
    include: auditInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
