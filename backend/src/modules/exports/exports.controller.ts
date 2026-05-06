import { Request, Response } from 'express';
import { parseExportFormat } from './exports.validators';
import {
  exportReservations,
  exportInvoices,
  exportAuditLogs,
  reservationsToCsv,
  invoicesToCsv,
  auditLogsToCsv,
} from './exports.service';

function sendExport(
  res: Response,
  format: 'csv' | 'json',
  filename: string,
  data: unknown,
  toCsvFn: (data: never) => string,
): void {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.status(200).send(toCsvFn(data as never));
    return;
  }

  res.status(200).json({ status: 'success', data });
}

export async function exportReservationsHandler(req: Request, res: Response): Promise<void> {
  const format = parseExportFormat(req.query as Record<string, unknown>);
  const data = await exportReservations();
  sendExport(res, format, 'reservations', data, reservationsToCsv);
}

export async function exportInvoicesHandler(req: Request, res: Response): Promise<void> {
  const format = parseExportFormat(req.query as Record<string, unknown>);
  const data = await exportInvoices(req.query as Record<string, unknown>);
  sendExport(res, format, 'invoices', data, invoicesToCsv);
}

export async function exportAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const format = parseExportFormat(req.query as Record<string, unknown>);
  const data = await exportAuditLogs(req.query as Record<string, unknown>);
  sendExport(res, format, 'audit-logs', data, auditLogsToCsv);
}
