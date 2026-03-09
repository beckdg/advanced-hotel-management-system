import { HousekeepingStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateHousekeepingTaskInput {
  roomId: string;
  assignedToUserId?: string;
  notes?: string;
}

export interface UpdateHousekeepingTaskInput {
  assignedToUserId?: string | null;
  notes?: string;
  status?: HousekeepingStatus;
}

export function validateCreateHousekeepingInput(body: unknown): CreateHousekeepingTaskInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.roomId)) {
    throw new AppError('roomId is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    roomId: data.roomId.trim(),
    assignedToUserId: isNonEmptyString(data.assignedToUserId)
      ? data.assignedToUserId.trim()
      : undefined,
    notes: isNonEmptyString(data.notes) ? data.notes.trim() : undefined,
  };
}

export function validateUpdateHousekeepingInput(body: unknown): UpdateHousekeepingTaskInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateHousekeepingTaskInput = {};

  if (data.assignedToUserId !== undefined) {
    input.assignedToUserId =
      data.assignedToUserId === null
        ? null
        : isNonEmptyString(data.assignedToUserId)
          ? data.assignedToUserId.trim()
          : undefined;
    if (data.assignedToUserId !== null && !input.assignedToUserId) {
      throw new AppError('assignedToUserId must be a non-empty string or null', HTTP_STATUS.BAD_REQUEST);
    }
  }

  if (data.notes !== undefined) {
    input.notes = isNonEmptyString(data.notes) ? data.notes.trim() : undefined;
  }

  if (data.status !== undefined) {
    const valid = Object.values(HousekeepingStatus);
    if (!isNonEmptyString(data.status) || !valid.includes(data.status as HousekeepingStatus)) {
      throw new AppError('Invalid housekeeping status', HTTP_STATUS.BAD_REQUEST);
    }
    input.status = data.status as HousekeepingStatus;
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}
