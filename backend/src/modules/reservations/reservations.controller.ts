import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import {
  validateCreateReservationInput,
  validateUpdateReservationInput,
  parseReservationFilters,
  validateBulkCancelInput,
} from './reservations.validators';
import {
  createReservation,
  listReservations,
  getReservationById,
  updateReservation,
  checkInReservation,
  checkOutReservation,
  bulkCancelReservations,
  RESERVATION_SORT_FIELDS,
} from './reservations.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateReservationInput(req.body);
  const reservation = await createReservation(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: reservation });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const filters = parseReservationFilters(req.query as Record<string, unknown>);
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...RESERVATION_SORT_FIELDS],
    'checkInDate',
  );
  const result = await listReservations(filters, pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function bulkCancel(req: Request, res: Response): Promise<void> {
  const input = validateBulkCancelInput(req.body);
  const reservations = await bulkCancelReservations(
    input.reservationIds,
    req.user!.id,
    getIpAddress(req),
  );
  res.status(200).json({ status: 'success', data: reservations });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const reservation = await getReservationById(req.params.id);
  res.status(200).json({ status: 'success', data: reservation });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateReservationInput(req.body);
  const reservation = await updateReservation(
    req.params.id,
    input,
    req.user!.id,
    getIpAddress(req),
  );
  res.status(200).json({ status: 'success', data: reservation });
}

export async function checkIn(req: Request, res: Response): Promise<void> {
  const reservation = await checkInReservation(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: reservation });
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const reservation = await checkOutReservation(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: reservation });
}
