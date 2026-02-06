import { Request, Response } from 'express';
import { validateCreateGuestInput, validateUpdateGuestInput } from './guests.validators';
import { createGuest, listGuests, getGuestById, updateGuest } from './guests.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateGuestInput(req.body);
  const guest = await createGuest(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: guest });
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const guests = await listGuests();
  res.status(200).json({ status: 'success', data: guests });
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
