import { Request, Response } from 'express';
import { PermissionName } from '../rbac/rbac.constants';
import { parseSearchQuery } from './search.validators';
import { globalSearch } from './search.service';

export async function search(req: Request, res: Response): Promise<void> {
  const query = parseSearchQuery(req.query as Record<string, unknown>);
  const results = await globalSearch(query, req.user!.permissions as PermissionName[]);
  res.status(200).json({ status: 'success', data: results });
}
