import { HousekeepingStatus, RoomStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { validateHousekeepingTransition } from './housekeeping.state';
import { notifyHousekeepingAssigned } from '../notifications';
import {
  CreateHousekeepingTaskInput,
  UpdateHousekeepingTaskInput,
} from './housekeeping.validators';

const taskInclude = {
  room: {
    select: {
      id: true,
      roomNumber: true,
      status: true,
      hotel: { select: { id: true, name: true } },
    },
  },
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
    throw new AppError('Assigned user not found or inactive', HTTP_STATUS.BAD_REQUEST);
  }
}

export async function createHousekeepingTask(
  input: CreateHousekeepingTaskInput,
  actorId: string,
  ipAddress?: string,
) {
  await validateRoomExists(input.roomId);
  if (input.assignedToUserId) {
    await validateUserExists(input.assignedToUserId);
  }

  const task = await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: input.roomId },
      data: { status: RoomStatus.DIRTY },
    });

    return tx.housekeepingTask.create({
      data: {
        roomId: input.roomId,
        assignedToUserId: input.assignedToUserId,
        notes: input.notes,
        status: HousekeepingStatus.DIRTY,
      },
      include: taskInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'housekeeping.create',
    entity: 'HousekeepingTask',
    entityId: task.id,
    ipAddress,
  });

  if (task.assignedToUserId) {
    await notifyHousekeepingAssigned(
      task.assignedToUserId,
      task.id,
      task.room.roomNumber,
    );
  }

  return task;
}

export async function listHousekeepingTasks() {
  return prisma.housekeepingTask.findMany({
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getHousekeepingTaskById(id: string) {
  const task = await prisma.housekeepingTask.findUnique({
    where: { id },
    include: taskInclude,
  });

  if (!task) {
    throw new AppError('Housekeeping task not found', HTTP_STATUS.NOT_FOUND);
  }

  return task;
}

export async function updateHousekeepingTask(
  id: string,
  input: UpdateHousekeepingTaskInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.housekeepingTask.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Housekeeping task not found', HTTP_STATUS.NOT_FOUND);
  }

  if (input.assignedToUserId) {
    await validateUserExists(input.assignedToUserId);
  }

  if (input.status) {
    validateHousekeepingTransition(existing.status, input.status);
  }

  const task = await prisma.$transaction(async (tx) => {
    if (input.status === HousekeepingStatus.CLEANING) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.CLEANING },
      });
    } else if (input.status === HousekeepingStatus.READY) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
    }

    return tx.housekeepingTask.update({
      where: { id },
      data: {
        assignedToUserId: input.assignedToUserId,
        notes: input.notes,
        status: input.status,
        completedAt: input.status === HousekeepingStatus.READY ? new Date() : undefined,
      },
      include: taskInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'housekeeping.update',
    entity: 'HousekeepingTask',
    entityId: id,
    ipAddress,
  });

  if (
    input.assignedToUserId &&
    input.assignedToUserId !== existing.assignedToUserId
  ) {
    await notifyHousekeepingAssigned(
      input.assignedToUserId,
      task.id,
      task.room.roomNumber,
    );
  }

  return task;
}

async function transitionTask(
  id: string,
  nextStatus: HousekeepingStatus,
  actorId: string,
  action: string,
  ipAddress?: string,
) {
  const existing = await prisma.housekeepingTask.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Housekeeping task not found', HTTP_STATUS.NOT_FOUND);
  }

  validateHousekeepingTransition(existing.status, nextStatus);

  const task = await prisma.$transaction(async (tx) => {
    if (nextStatus === HousekeepingStatus.CLEANING) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.CLEANING },
      });
    } else if (nextStatus === HousekeepingStatus.READY) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
    }

    return tx.housekeepingTask.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === HousekeepingStatus.READY ? new Date() : undefined,
      },
      include: taskInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action,
    entity: 'HousekeepingTask',
    entityId: id,
    ipAddress,
  });

  return task;
}

export function startHousekeepingTask(id: string, actorId: string, ipAddress?: string) {
  return transitionTask(
    id,
    HousekeepingStatus.CLEANING,
    actorId,
    'housekeeping.start',
    ipAddress,
  );
}

export function inspectHousekeepingTask(id: string, actorId: string, ipAddress?: string) {
  return transitionTask(
    id,
    HousekeepingStatus.INSPECTING,
    actorId,
    'housekeeping.inspect',
    ipAddress,
  );
}

export function completeHousekeepingTask(id: string, actorId: string, ipAddress?: string) {
  return transitionTask(id, HousekeepingStatus.READY, actorId, 'housekeeping.complete', ipAddress);
}
