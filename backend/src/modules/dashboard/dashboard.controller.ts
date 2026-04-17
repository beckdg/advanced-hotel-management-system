import { Request, Response } from 'express';
import { getDashboardMetrics } from '../reservations/reservations.service';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const metrics = await getDashboardMetrics(req.user!.id, req.user!.permissions);
  res.status(200).json({ status: 'success', data: metrics });
}
