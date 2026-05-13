import { ReservationStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateReservationInput {
  hotelId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalGuests: number;
  notes?: string;
  guestIds: string[];
  status?: ReservationStatus;
}

export interface UpdateReservationInput {
  roomId?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  totalGuests?: number;
  notes?: string;
  status?: ReservationStatus;
  guestIds?: string[];
}

export interface ReservationFilterQuery {
  hotelId?: string;
  roomId?: string;
  status?: ReservationStatus;
  guestId?: string;
}

const VALID_STATUSES = Object.values(ReservationStatus);

function parseDate(value: unknown, field: string): Date {
  if (!value) {
    throw new AppError(`${field} is required`, HTTP_STATUS.BAD_REQUEST);
  }
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, HTTP_STATUS.BAD_REQUEST);
  }
  return date;
}

function validateDateRange(checkIn: Date, checkOut: Date): void {
  if (checkOut <= checkIn) {
    throw new AppError('checkOutDate must be after checkInDate', HTTP_STATUS.BAD_REQUEST);
  }
}

export function validateReservationStatus(value: unknown): ReservationStatus {
  if (!isNonEmptyString(value) || !VALID_STATUSES.includes(value as ReservationStatus)) {
    throw new AppError(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return value as ReservationStatus;
}

export function validateCreateReservationInput(body: unknown): CreateReservationInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.hotelId)) {
    throw new AppError('hotelId is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.roomId)) {
    throw new AppError('roomId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const checkInDate = parseDate(data.checkInDate, 'checkInDate');
  const checkOutDate = parseDate(data.checkOutDate, 'checkOutDate');
  validateDateRange(checkInDate, checkOutDate);

  const totalGuests = typeof data.totalGuests === 'number' ? data.totalGuests : 1;
  if (totalGuests < 1) {
    throw new AppError('totalGuests must be at least 1', HTTP_STATUS.BAD_REQUEST);
  }

  if (!Array.isArray(data.guestIds) || data.guestIds.length === 0) {
    throw new AppError('At least one guestId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const guestIds = data.guestIds.filter((id) => isNonEmptyString(id)) as string[];
  if (guestIds.length === 0) {
    throw new AppError('At least one valid guestId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const input: CreateReservationInput = {
    hotelId: data.hotelId.trim(),
    roomId: data.roomId.trim(),
    checkInDate,
    checkOutDate,
    totalGuests,
    notes: isNonEmptyString(data.notes) ? data.notes.trim() : undefined,
    guestIds,
  };

  if (data.status !== undefined) {
    input.status = validateReservationStatus(data.status);
  }

  return input;
}

export function validateUpdateReservationInput(body: unknown): UpdateReservationInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateReservationInput = {};

  if (data.roomId !== undefined) {
    if (!isNonEmptyString(data.roomId)) {
      throw new AppError('roomId must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.roomId = data.roomId.trim();
  }

  if (data.checkInDate !== undefined) input.checkInDate = parseDate(data.checkInDate, 'checkInDate');
  if (data.checkOutDate !== undefined) {
    input.checkOutDate = parseDate(data.checkOutDate, 'checkOutDate');
  }

  if (data.totalGuests !== undefined) {
    if (typeof data.totalGuests !== 'number' || data.totalGuests < 1) {
      throw new AppError('totalGuests must be at least 1', HTTP_STATUS.BAD_REQUEST);
    }
    input.totalGuests = data.totalGuests;
  }

  if (data.notes !== undefined) {
    input.notes = isNonEmptyString(data.notes) ? data.notes.trim() : undefined;
  }

  if (data.status !== undefined) {
    input.status = validateReservationStatus(data.status);
  }

  if (data.guestIds !== undefined) {
    if (!Array.isArray(data.guestIds) || data.guestIds.length === 0) {
      throw new AppError('guestIds must be a non-empty array', HTTP_STATUS.BAD_REQUEST);
    }
    input.guestIds = data.guestIds.filter((id) => isNonEmptyString(id)) as string[];
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}

export function parseReservationFilters(query: Record<string, unknown>): ReservationFilterQuery {
  const filters: ReservationFilterQuery = {};

  if (isNonEmptyString(query.hotelId)) filters.hotelId = query.hotelId;
  if (isNonEmptyString(query.roomId)) filters.roomId = query.roomId;
  if (isNonEmptyString(query.guestId)) filters.guestId = query.guestId;
  if (isNonEmptyString(query.status)) filters.status = validateReservationStatus(query.status);

  return filters;
}

export interface BulkCancelInput {
  reservationIds: string[];
}

export function validateBulkCancelInput(body: unknown): BulkCancelInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  if (!Array.isArray(data.reservationIds) || data.reservationIds.length === 0) {
    throw new AppError('reservationIds must be a non-empty array', HTTP_STATUS.BAD_REQUEST);
  }

  const reservationIds = data.reservationIds.filter((id) => isNonEmptyString(id)) as string[];
  if (reservationIds.length !== data.reservationIds.length) {
    throw new AppError('reservationIds must contain valid string ids', HTTP_STATUS.BAD_REQUEST);
  }

  return { reservationIds };
}
