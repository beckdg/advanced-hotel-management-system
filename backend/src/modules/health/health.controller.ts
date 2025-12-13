import { Request, Response } from 'express';
import { SERVICE_NAME } from '../../common/constants';

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
  });
}
