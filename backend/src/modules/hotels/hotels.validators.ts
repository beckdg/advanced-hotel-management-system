import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateHotelInput {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

export interface UpdateHotelInput {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  isActive?: boolean;
}

function parseOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

export function validateCreateHotelInput(body: unknown): CreateHotelInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  if (!isNonEmptyString(data.name)) {
    throw new AppError('Hotel name is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    name: data.name.trim(),
    address: parseOptionalString(data.address),
    city: parseOptionalString(data.city),
    country: parseOptionalString(data.country),
    phone: parseOptionalString(data.phone),
    email: parseOptionalString(data.email),
    timezone: parseOptionalString(data.timezone) ?? 'UTC',
  };
}

export function validateUpdateHotelInput(body: unknown): UpdateHotelInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateHotelInput = {};

  if (data.name !== undefined) {
    if (!isNonEmptyString(data.name)) {
      throw new AppError('Hotel name must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.name = data.name.trim();
  }

  if (data.address !== undefined) input.address = parseOptionalString(data.address);
  if (data.city !== undefined) input.city = parseOptionalString(data.city);
  if (data.country !== undefined) input.country = parseOptionalString(data.country);
  if (data.phone !== undefined) input.phone = parseOptionalString(data.phone);
  if (data.email !== undefined) input.email = parseOptionalString(data.email);
  if (data.timezone !== undefined) input.timezone = parseOptionalString(data.timezone);

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== 'boolean') {
      throw new AppError('isActive must be a boolean', HTTP_STATUS.BAD_REQUEST);
    }
    input.isActive = data.isActive;
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}
