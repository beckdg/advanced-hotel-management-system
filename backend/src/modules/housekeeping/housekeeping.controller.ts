import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import {
  validateCreateHousekeepingInput,
  validateUpdateHousekeepingInput,
} from './housekeeping.validators';
import {
  createHousekeepingTask,
  listHousekeepingTasks,
  getHousekeepingTaskById,
  updateHousekeepingTask,
  startHousekeepingTask,
  inspectHousekeepingTask,
  completeHousekeepingTask,
  HOUSEKEEPING_SORT_FIELDS,
} from './housekeeping.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateHousekeepingInput(req.body);
  const task = await createHousekeepingTask(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: task });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...HOUSEKEEPING_SORT_FIELDS],
    'createdAt',
  );
  const result = await listHousekeepingTasks(pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const task = await getHousekeepingTaskById(req.params.id);
  res.status(200).json({ status: 'success', data: task });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateHousekeepingInput(req.body);
  const task = await updateHousekeepingTask(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: task });
}

export async function start(req: Request, res: Response): Promise<void> {
  const task = await startHousekeepingTask(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: task });
}

export async function inspect(req: Request, res: Response): Promise<void> {
  const task = await inspectHousekeepingTask(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: task });
}

export async function complete(req: Request, res: Response): Promise<void> {
  const task = await completeHousekeepingTask(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: task });
}
