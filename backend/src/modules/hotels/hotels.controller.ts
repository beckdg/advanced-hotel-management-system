import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import { validateCreateHotelInput, validateUpdateHotelInput } from './hotels.validators';
import { createHotel, listHotels, getHotelById, updateHotel, HOTEL_SORT_FIELDS } from './hotels.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateHotelInput(req.body);
  const hotel = await createHotel(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: hotel });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...HOTEL_SORT_FIELDS],
    'name',
  );
  const result = await listHotels(pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const hotel = await getHotelById(req.params.id);
  res.status(200).json({ status: 'success', data: hotel });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateHotelInput(req.body);
  const hotel = await updateHotel(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: hotel });
}
