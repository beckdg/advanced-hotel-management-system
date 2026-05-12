import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import { validateCreateGuestInput, validateUpdateGuestInput } from './guests.validators';
import { createGuest, listGuests, getGuestById, updateGuest, GUEST_SORT_FIELDS } from './guests.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateGuestInput(req.body);
  const guest = await createGuest(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: guest });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...GUEST_SORT_FIELDS],
    'lastName',
  );
  const result = await listGuests(pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const guest = await getGuestById(req.params.id);
  res.status(200).json({ status: 'success', data: guest });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateGuestInput(req.body);
  const guest = await updateGuest(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: guest });
}
