import { Request, Response } from 'express';
import { validateCreateRoomTypeInput } from './room-types.validators';
import { createRoomType, listRoomTypes, getRoomTypeById } from './room-types.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateRoomTypeInput(req.body);
  const roomType = await createRoomType(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: roomType });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const hotelId = typeof req.query.hotelId === 'string' ? req.query.hotelId : undefined;
  const roomTypes = await listRoomTypes(hotelId);
  res.status(200).json({ status: 'success', data: roomTypes });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const roomType = await getRoomTypeById(req.params.id);
  res.status(200).json({ status: 'success', data: roomType });
}
