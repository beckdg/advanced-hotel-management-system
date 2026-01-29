import { Request, Response } from 'express';
import {
  validateCreateRoomInput,
  validateUpdateRoomInput,
  parseRoomFilters,
} from './rooms.validators';
import { createRoom, listRooms, getRoomById, updateRoom } from './rooms.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateRoomInput(req.body);
  const room = await createRoom(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: room });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const filters = parseRoomFilters(req.query as Record<string, unknown>);
  const rooms = await listRooms(filters);
  res.status(200).json({ status: 'success', data: rooms });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const room = await getRoomById(req.params.id);
  res.status(200).json({ status: 'success', data: room });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateRoomInput(req.body);
  const room = await updateRoom(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: room });
}
