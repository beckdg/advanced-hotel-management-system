import { Request, Response } from 'express';
import { parseReportFilters } from './reports.validators';
import {
  getOccupancyReport,
  getRevenueReport,
  getOperationsReport,
} from './reports.service';

export async function occupancy(req: Request, res: Response): Promise<void> {
  const filters = parseReportFilters(req.query as Record<string, unknown>);
  const report = await getOccupancyReport(filters);
  res.status(200).json({ status: 'success', data: report });
}

export async function revenue(req: Request, res: Response): Promise<void> {
  const filters = parseReportFilters(req.query as Record<string, unknown>);
  const report = await getRevenueReport(filters);
  res.status(200).json({ status: 'success', data: report });
}

export async function operations(req: Request, res: Response): Promise<void> {
  const filters = parseReportFilters(req.query as Record<string, unknown>);
  const report = await getOperationsReport(filters);
  res.status(200).json({ status: 'success', data: report });
}
