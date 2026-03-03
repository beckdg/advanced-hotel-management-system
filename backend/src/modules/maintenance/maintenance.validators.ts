import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateMaintenanceInput {
  roomId: string;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  assignedToUserId?: string | null;
}

export interface AssignMaintenanceInput {
  assignedToUserId: string;
}

export function validateCreateMaintenanceInput(body: unknown): CreateMaintenanceInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.roomId)) {
    throw new AppError('roomId is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.title)) {
    throw new AppError('title is required', HTTP_STATUS.BAD_REQUEST);
  }

  const input: CreateMaintenanceInput = {
    roomId: data.roomId.trim(),
    title: data.title.trim(),
    description: isNonEmptyString(data.description) ? data.description.trim() : undefined,
  };

  if (data.priority !== undefined) {
    const valid = Object.values(MaintenancePriority);
    if (!isNonEmptyString(data.priority) || !valid.includes(data.priority as MaintenancePriority)) {
      throw new AppError('Invalid priority', HTTP_STATUS.BAD_REQUEST);
    }
    input.priority = data.priority as MaintenancePriority;
  }

  return input;
}

export function validateUpdateMaintenanceInput(body: unknown): UpdateMaintenanceInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateMaintenanceInput = {};

  if (data.title !== undefined) {
    if (!isNonEmptyString(data.title)) {
      throw new AppError('title must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.title = data.title.trim();
  }

  if (data.description !== undefined) {
    input.description = isNonEmptyString(data.description) ? data.description.trim() : undefined;
  }

  if (data.priority !== undefined) {
    const valid = Object.values(MaintenancePriority);
    if (!isNonEmptyString(data.priority) || !valid.includes(data.priority as MaintenancePriority)) {
      throw new AppError('Invalid priority', HTTP_STATUS.BAD_REQUEST);
    }
    input.priority = data.priority as MaintenancePriority;
  }

  if (data.status !== undefined) {
    const valid = Object.values(MaintenanceStatus);
    if (!isNonEmptyString(data.status) || !valid.includes(data.status as MaintenanceStatus)) {
      throw new AppError('Invalid status', HTTP_STATUS.BAD_REQUEST);
    }
    input.status = data.status as MaintenanceStatus;
  }

  if (data.assignedToUserId !== undefined) {
    input.assignedToUserId =
      data.assignedToUserId === null
        ? null
        : isNonEmptyString(data.assignedToUserId)
          ? data.assignedToUserId.trim()
          : undefined;
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}

export function validateAssignMaintenanceInput(body: unknown): AssignMaintenanceInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const { assignedToUserId } = body as Record<string, unknown>;

  if (!isNonEmptyString(assignedToUserId)) {
    throw new AppError('assignedToUserId is required', HTTP_STATUS.BAD_REQUEST);
  }

  return { assignedToUserId: assignedToUserId.trim() };
}
