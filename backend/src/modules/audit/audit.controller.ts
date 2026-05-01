import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import { parseAuditLogFilters } from './audit.validators';
import { listAuditLogs, AUDIT_SORT_FIELDS } from './audit.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  const filters = parseAuditLogFilters(req.query as Record<string, unknown>);
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...AUDIT_SORT_FIELDS],
    'createdAt',
  );
  const result = await listAuditLogs(filters, pagination);
  res.status(200).json({ status: 'success', ...result });
}
