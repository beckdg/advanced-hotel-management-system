import { RoomStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

const VALID_STATUSES = Object.values(RoomStatus);

export interface CreateRoomInput {
  hotelId: string;
  roomNumber: string;
  floorId: string;
  roomTypeId: string;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface UpdateRoomInput {
  roomNumber?: string;
  floorId?: string;
  roomTypeId?: string;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface RoomFilterQuery {
  hotelId?: string;
  roomTypeId?: string;
  status?: RoomStatus;
  floorId?: string;
}

export function validateRoomStatus(value: unknown): RoomStatus {
  if (!isNonEmptyString(value) || !VALID_STATUSES.includes(value as RoomStatus)) {
    throw new AppError(
      `Invalid room status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return value as RoomStatus;
}

export function validateCreateRoomInput(body: unknown): CreateRoomInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.hotelId)) {
    throw new AppError('hotelId is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.roomNumber)) {
    throw new AppError('roomNumber is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.floorId)) {
    throw new AppError('floorId is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.roomTypeId)) {
    throw new AppError('roomTypeId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const input: CreateRoomInput = {
    hotelId: data.hotelId.trim(),
    roomNumber: data.roomNumber.trim(),
    floorId: data.floorId.trim(),
    roomTypeId: data.roomTypeId.trim(),
  };

  if (data.status !== undefined) {
    input.status = validateRoomStatus(data.status);
  }

  if (data.amenityIds !== undefined) {
    if (!Array.isArray(data.amenityIds)) {
      throw new AppError('amenityIds must be an array', HTTP_STATUS.BAD_REQUEST);
    }
    input.amenityIds = data.amenityIds.filter((id) => isNonEmptyString(id)) as string[];
  }

  return input;
}

export function validateUpdateRoomInput(body: unknown): UpdateRoomInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateRoomInput = {};

  if (data.roomNumber !== undefined) {
    if (!isNonEmptyString(data.roomNumber)) {
      throw new AppError('roomNumber must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.roomNumber = data.roomNumber.trim();
  }

  if (data.floorId !== undefined) {
    if (!isNonEmptyString(data.floorId)) {
      throw new AppError('floorId must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.floorId = data.floorId.trim();
  }

  if (data.roomTypeId !== undefined) {
    if (!isNonEmptyString(data.roomTypeId)) {
      throw new AppError('roomTypeId must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.roomTypeId = data.roomTypeId.trim();
  }

  if (data.status !== undefined) {
    input.status = validateRoomStatus(data.status);
  }

  if (data.amenityIds !== undefined) {
    if (!Array.isArray(data.amenityIds)) {
      throw new AppError('amenityIds must be an array', HTTP_STATUS.BAD_REQUEST);
    }
    input.amenityIds = data.amenityIds.filter((id) => isNonEmptyString(id)) as string[];
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}

export function parseRoomFilters(query: Record<string, unknown>): RoomFilterQuery {
  const filters: RoomFilterQuery = {};

  if (isNonEmptyString(query.hotelId)) filters.hotelId = query.hotelId;
  if (isNonEmptyString(query.roomTypeId)) filters.roomTypeId = query.roomTypeId;
  if (isNonEmptyString(query.floorId)) filters.floorId = query.floorId;
  if (isNonEmptyString(query.status)) filters.status = validateRoomStatus(query.status);

  return filters;
}
