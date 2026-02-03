import { Request, Response } from 'express';
import { getDashboardMetrics } from '../reservations/reservations.service';

export async function getMetrics(_req: Request, res: Response): Promise<void> {
  const metrics = await getDashboardMetrics();
  res.status(200).json({ status: 'success', data: metrics });
}
