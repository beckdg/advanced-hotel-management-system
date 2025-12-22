import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface AuditLogInput {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
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
