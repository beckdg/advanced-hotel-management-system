import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import {
  validateCreateMaintenanceInput,
  validateUpdateMaintenanceInput,
  validateAssignMaintenanceInput,
  validateBulkAssignMaintenanceInput,
} from './maintenance.validators';
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  assignMaintenanceRequest,
  startMaintenanceRequest,
  resolveMaintenanceRequest,
  closeMaintenanceRequest,
  bulkAssignMaintenanceRequests,
  MAINTENANCE_SORT_FIELDS,
} from './maintenance.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateMaintenanceInput(req.body);
  const request = await createMaintenanceRequest(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: request });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...MAINTENANCE_SORT_FIELDS],
    'createdAt',
  );
  const result = await listMaintenanceRequests(pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function bulkAssign(req: Request, res: Response): Promise<void> {
  const input = validateBulkAssignMaintenanceInput(req.body);
  const requests = await bulkAssignMaintenanceRequests(
    input.requestIds,
    input.assignedToUserId,
    req.user!.id,
    getIpAddress(req),
  );
  res.status(200).json({ status: 'success', data: requests });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const request = await getMaintenanceRequestById(req.params.id);
  res.status(200).json({ status: 'success', data: request });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateMaintenanceInput(req.body);
  const request = await updateMaintenanceRequest(
    req.params.id,
    input,
    req.user!.id,
    getIpAddress(req),
  );
  res.status(200).json({ status: 'success', data: request });
}

export async function assign(req: Request, res: Response): Promise<void> {
  const input = validateAssignMaintenanceInput(req.body);
  const request = await assignMaintenanceRequest(
    req.params.id,
    input.assignedToUserId,
    req.user!.id,
    getIpAddress(req),
  );
  res.status(200).json({ status: 'success', data: request });
}

export async function start(req: Request, res: Response): Promise<void> {
  const request = await startMaintenanceRequest(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: request });
}

export async function resolve(req: Request, res: Response): Promise<void> {
  const request = await resolveMaintenanceRequest(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: request });
}

export async function close(req: Request, res: Response): Promise<void> {
  const request = await closeMaintenanceRequest(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: request });
}
