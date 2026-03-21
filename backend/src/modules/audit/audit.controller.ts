import { Request, Response } from 'express';
import { parseAuditLogFilters } from './audit.validators';
import { listAuditLogs } from './audit.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  const filters = parseAuditLogFilters(req.query as Record<string, unknown>);
  const logs = await listAuditLogs(filters);
  res.status(200).json({ status: 'success', data: logs });
}
