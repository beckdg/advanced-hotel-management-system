import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateGuestInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
}

export interface UpdateGuestInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date | null;
}

function parseOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function parseDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, HTTP_STATUS.BAD_REQUEST);
  }
  return date;
}

export function validateCreateGuestInput(body: unknown): CreateGuestInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.firstName)) {
    throw new AppError('firstName is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.lastName)) {
    throw new AppError('lastName is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: parseOptionalString(data.email),
    phone: parseOptionalString(data.phone),
    dateOfBirth: parseDate(data.dateOfBirth, 'dateOfBirth'),
  };
}

export function validateUpdateGuestInput(body: unknown): UpdateGuestInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateGuestInput = {};

  if (data.firstName !== undefined) {
    if (!isNonEmptyString(data.firstName)) {
      throw new AppError('firstName must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.firstName = data.firstName.trim();
  }

  if (data.lastName !== undefined) {
    if (!isNonEmptyString(data.lastName)) {
      throw new AppError('lastName must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.lastName = data.lastName.trim();
  }

  if (data.email !== undefined) input.email = parseOptionalString(data.email);
  if (data.phone !== undefined) input.phone = parseOptionalString(data.phone);

  if (data.dateOfBirth !== undefined) {
    input.dateOfBirth =
      data.dateOfBirth === null ? null : parseDate(data.dateOfBirth, 'dateOfBirth');
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}
