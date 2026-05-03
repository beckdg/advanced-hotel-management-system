import { MaintenanceStatus, RoomStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { ACTIVE_MAINTENANCE_STATUSES } from '../../common/utils/roomAvailability';
import {
  validateMaintenanceTransition,
  MAINTENANCE_OUT_OF_SERVICE_STATUSES,
} from './maintenance.state';
import { notifyMaintenanceAssigned } from '../notifications';
import { PaginationParams, paginate } from '../../common/pagination';
import {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from './maintenance.validators';

export const MAINTENANCE_SORT_FIELDS = ['priority', 'status', 'createdAt', 'title'] as const;

const requestInclude = {
  room: {
    select: {
      id: true,
      roomNumber: true,
      status: true,
      hotel: { select: { id: true, name: true } },
    },
  },
  reportedBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
};

async function validateRoomExists(roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }
  return room;
}

async function validateUserExists(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', HTTP_STATUS.BAD_REQUEST);
  }
}

export async function createMaintenanceRequest(
  input: CreateMaintenanceInput,
  reportedByUserId: string,
  ipAddress?: string,
) {
  await validateRoomExists(input.roomId);

  const request = await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: input.roomId },
      data: { status: RoomStatus.OUT_OF_SERVICE },
    });

    return tx.maintenanceRequest.create({
      data: {
        roomId: input.roomId,
        reportedByUserId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: MaintenanceStatus.OPEN,
      },
      include: requestInclude,
    });
  });

  await createAuditLog({
    userId: reportedByUserId,
    action: 'maintenance.create',
    entity: 'MaintenanceRequest',
    entityId: request.id,
    ipAddress,
  });

  return request;
}

export async function listMaintenanceRequests(pagination: PaginationParams) {
  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.maintenanceRequest.findMany({ include: requestInclude, orderBy, skip, take }),
    count: () => prisma.maintenanceRequest.count(),
  });
}

export async function bulkAssignMaintenanceRequests(
  requestIds: string[],
  assignedToUserId: string,
  actorId: string,
  ipAddress?: string,
) {
  await validateUserExists(assignedToUserId);

  const requests = await prisma.maintenanceRequest.findMany({
    where: { id: { in: requestIds } },
  });

  if (requests.length !== requestIds.length) {
    throw new AppError('One or more maintenance requests not found', HTTP_STATUS.BAD_REQUEST, {
      code: 'MAINTENANCE_NOT_FOUND',
    });
  }

  const results = [];
  for (const request of requests) {
    if (request.status === MaintenanceStatus.OPEN) {
      results.push(
        await assignMaintenanceRequest(request.id, assignedToUserId, actorId, ipAddress),
      );
    } else if (request.assignedToUserId !== assignedToUserId) {
      results.push(
        await prisma.maintenanceRequest.update({
          where: { id: request.id },
          data: { assignedToUserId },
          include: requestInclude,
        }),
      );
    } else {
      results.push(
        await prisma.maintenanceRequest.findUnique({
          where: { id: request.id },
          include: requestInclude,
        }),
      );
    }
  }

  return results.filter(Boolean);
}

export async function getMaintenanceRequestById(id: string) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: requestInclude,
  });

  if (!request) {
    throw new AppError('Maintenance request not found', HTTP_STATUS.NOT_FOUND);
  }

  return request;
}

export async function updateMaintenanceRequest(
  id: string,
  input: UpdateMaintenanceInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Maintenance request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (input.assignedToUserId) {
    await validateUserExists(input.assignedToUserId);
  }

  if (input.status) {
    validateMaintenanceTransition(existing.status, input.status);
  }

  const request = await prisma.$transaction(async (tx) => {
    const effectiveStatus = input.status ?? existing.status;

    if (MAINTENANCE_OUT_OF_SERVICE_STATUSES.includes(effectiveStatus)) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.OUT_OF_SERVICE },
      });
    } else if (effectiveStatus === MaintenanceStatus.CLOSED) {
      const otherActive = await tx.maintenanceRequest.findFirst({
        where: {
          roomId: existing.roomId,
          id: { not: id },
          status: { in: ACTIVE_MAINTENANCE_STATUSES },
        },
      });
      if (!otherActive) {
        await tx.room.update({
          where: { id: existing.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
    }

    return tx.maintenanceRequest.update({
      where: { id },
      data: input,
      include: requestInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'maintenance.update',
    entity: 'MaintenanceRequest',
    entityId: id,
    ipAddress,
  });

  return request;
}

async function transitionMaintenance(
  id: string,
  nextStatus: MaintenanceStatus,
  actorId: string,
  action: string,
  extraData?: { assignedToUserId?: string },
  ipAddress?: string,
) {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Maintenance request not found', HTTP_STATUS.NOT_FOUND);
  }

  validateMaintenanceTransition(existing.status, nextStatus);

  if (extraData?.assignedToUserId) {
    await validateUserExists(extraData.assignedToUserId);
  }

  const request = await prisma.$transaction(async (tx) => {
    if (nextStatus === MaintenanceStatus.CLOSED) {
      const otherActive = await tx.maintenanceRequest.findFirst({
        where: {
          roomId: existing.roomId,
          id: { not: id },
          status: { in: ACTIVE_MAINTENANCE_STATUSES },
        },
      });
      if (!otherActive) {
        await tx.room.update({
          where: { id: existing.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
    } else if (MAINTENANCE_OUT_OF_SERVICE_STATUSES.includes(nextStatus)) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.OUT_OF_SERVICE },
      });
    }

    return tx.maintenanceRequest.update({
      where: { id },
      data: { status: nextStatus, ...extraData },
      include: requestInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action,
    entity: 'MaintenanceRequest',
    entityId: id,
    ipAddress,
  });

  return request;
}

export async function assignMaintenanceRequest(
  id: string,
  assignedToUserId: string,
  actorId: string,
  ipAddress?: string,
) {
  const request = await transitionMaintenance(
    id,
    MaintenanceStatus.ASSIGNED,
    actorId,
    'maintenance.assign',
    { assignedToUserId },
    ipAddress,
  );

  await notifyMaintenanceAssigned(assignedToUserId, request.id, request.title);

  return request;
}

export function startMaintenanceRequest(id: string, actorId: string, ipAddress?: string) {
  return transitionMaintenance(
    id,
    MaintenanceStatus.IN_PROGRESS,
    actorId,
    'maintenance.start',
    undefined,
    ipAddress,
  );
}

export function resolveMaintenanceRequest(id: string, actorId: string, ipAddress?: string) {
  return transitionMaintenance(
    id,
    MaintenanceStatus.RESOLVED,
    actorId,
    'maintenance.resolve',
    undefined,
    ipAddress,
  );
}

export function closeMaintenanceRequest(id: string, actorId: string, ipAddress?: string) {
  return transitionMaintenance(
    id,
    MaintenanceStatus.CLOSED,
    actorId,
    'maintenance.close',
    undefined,
    ipAddress,
  );
}
