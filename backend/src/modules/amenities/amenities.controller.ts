import { Request, Response } from 'express';
import { validateCreateAmenityInput } from './amenities.validators';
import { createAmenity, listAmenities, getAmenityById } from './amenities.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateAmenityInput(req.body);
  const amenity = await createAmenity(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: amenity });
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const amenities = await listAmenities();
  res.status(200).json({ status: 'success', data: amenities });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const amenity = await getAmenityById(req.params.id);
  res.status(200).json({ status: 'success', data: amenity });
}
