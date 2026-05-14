import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import {
  validateCreateRoomInput,
  validateUpdateRoomInput,
  parseRoomFilters,
  validateBulkRoomStatusInput,
} from './rooms.validators';
import {
  createRoom,
  listRooms,
  getRoomById,
  updateRoom,
  bulkUpdateRoomStatus,
  ROOM_SORT_FIELDS,
} from './rooms.service';

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
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...ROOM_SORT_FIELDS],
    'roomNumber',
  );
  const result = await listRooms(filters, pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function bulkStatus(req: Request, res: Response): Promise<void> {
  const input = validateBulkRoomStatusInput(req.body);
  const rooms = await bulkUpdateRoomStatus(
    input.roomIds,
    input.status,
    req.user!.id,
    getIpAddress(req),
  );
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
