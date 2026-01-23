import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateRoomTypeInput {
  hotelId: string;
  name: string;
  description?: string;
  maxOccupancy: number;
  baseRate: number;
}

function parsePositiveNumber(value: unknown, field: string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num) || num <= 0) {
    throw new AppError(`${field} must be a positive number`, HTTP_STATUS.BAD_REQUEST);
  }
  return num;
}

export function validateCreateRoomTypeInput(body: unknown): CreateRoomTypeInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.hotelId)) {
    throw new AppError('hotelId is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (!isNonEmptyString(data.name)) {
    throw new AppError('Room type name is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    hotelId: data.hotelId.trim(),
    name: data.name.trim(),
    description: isNonEmptyString(data.description) ? data.description.trim() : undefined,
    maxOccupancy: parsePositiveNumber(data.maxOccupancy ?? 2, 'maxOccupancy'),
    baseRate: parsePositiveNumber(data.baseRate, 'baseRate'),
  };
}
