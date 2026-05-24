import { Request, Response } from 'express';
import { SERVICE_NAME } from '../../common/constants';
import { getHealthDetails } from './health.service';

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
  });
}

export async function getHealthDetailsHandler(_req: Request, res: Response): Promise<void> {
  const details = await getHealthDetails();
  const statusCode = details.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(details);
}
