import { Request, Response } from 'express';
import {
  validateCreateInvoiceInput,
  validateUpdateInvoiceInput,
  validateCreateInvoiceItemInput,
  validateRecordPaymentInput,
  parseInvoiceFilters,
  parsePaymentFilters,
} from './billing.validators';
import {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  voidInvoice,
  recordPayment,
  addInvoiceItem,
  deleteInvoiceItem,
  listPayments,
  getPaymentById,
} from './billing.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = validateCreateInvoiceInput(req.body);
  const invoice = await createInvoice(input, req.user!.id, getIpAddress(req));
  res.status(201).json({ status: 'success', data: invoice });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const filters = parseInvoiceFilters(req.query as Record<string, unknown>);
  const invoices = await listInvoices(filters);
  res.status(200).json({ status: 'success', data: invoices });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const invoice = await getInvoiceById(req.params.id);
  res.status(200).json({ status: 'success', data: invoice });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateInvoiceInput(req.body);
  const invoice = await updateInvoice(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function issue(req: Request, res: Response): Promise<void> {
  const invoice = await issueInvoice(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function pay(req: Request, res: Response): Promise<void> {
  const input = validateRecordPaymentInput(req.body);
  const invoice = await recordPayment(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function voidInvoiceHandler(req: Request, res: Response): Promise<void> {
  const invoice = await voidInvoice(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const input = validateCreateInvoiceItemInput(req.body);
  const invoice = await addInvoiceItem(req.params.id, input, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const invoice = await deleteInvoiceItem(req.params.id, req.user!.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: invoice });
}

export async function getAllPayments(req: Request, res: Response): Promise<void> {
  const filters = parsePaymentFilters(req.query as Record<string, unknown>);
  const payments = await listPayments(filters);
  res.status(200).json({ status: 'success', data: payments });
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  const payment = await getPaymentById(req.params.id);
  res.status(200).json({ status: 'success', data: payment });
}
