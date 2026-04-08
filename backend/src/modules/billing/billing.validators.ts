import { PaymentMethod } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

function parsePositiveNumber(value: unknown, field: string, allowZero = false): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num) || (allowZero ? num < 0 : num <= 0)) {
    throw new AppError(
      `${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return num;
}

export interface CreateInvoiceInput {
  reservationId: string;
  taxAmount?: number;
  discountAmount?: number;
}

export interface UpdateInvoiceInput {
  taxAmount?: number;
  discountAmount?: number;
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
}

export interface InvoiceFilterQuery {
  status?: string;
  reservationId?: string;
  guestId?: string;
}

export interface PaymentFilterQuery {
  status?: string;
  reservationId?: string;
  guestId?: string;
}

export function validateCreateInvoiceInput(body: unknown): CreateInvoiceInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.reservationId)) {
    throw new AppError('reservationId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const input: CreateInvoiceInput = { reservationId: data.reservationId.trim() };

  if (data.taxAmount !== undefined) {
    input.taxAmount = parsePositiveNumber(data.taxAmount, 'taxAmount', true);
  }

  if (data.discountAmount !== undefined) {
    input.discountAmount = parsePositiveNumber(data.discountAmount, 'discountAmount', true);
  }

  return input;
}

export function validateUpdateInvoiceInput(body: unknown): UpdateInvoiceInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const input: UpdateInvoiceInput = {};

  if (data.taxAmount !== undefined) {
    input.taxAmount = parsePositiveNumber(data.taxAmount, 'taxAmount', true);
  }

  if (data.discountAmount !== undefined) {
    input.discountAmount = parsePositiveNumber(data.discountAmount, 'discountAmount', true);
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}

export function validateCreateInvoiceItemInput(body: unknown): CreateInvoiceItemInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.description)) {
    throw new AppError('description is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (!isNonEmptyString(data.category)) {
    throw new AppError('category is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    description: data.description.trim(),
    quantity: parsePositiveNumber(data.quantity ?? 1, 'quantity'),
    unitPrice: parsePositiveNumber(data.unitPrice, 'unitPrice'),
    category: data.category.trim(),
  };
}

export function validateRecordPaymentInput(body: unknown): RecordPaymentInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;
  const validMethods = Object.values(PaymentMethod);

  if (!isNonEmptyString(data.method) || !validMethods.includes(data.method as PaymentMethod)) {
    throw new AppError('Invalid payment method', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    amount: parsePositiveNumber(data.amount, 'amount'),
    method: data.method as PaymentMethod,
    transactionReference: isNonEmptyString(data.transactionReference)
      ? data.transactionReference.trim()
      : undefined,
  };
}

export function parseInvoiceFilters(query: Record<string, unknown>): InvoiceFilterQuery {
  const filters: InvoiceFilterQuery = {};

  if (isNonEmptyString(query.status)) filters.status = query.status.trim();
  if (isNonEmptyString(query.reservationId)) filters.reservationId = query.reservationId.trim();
  if (isNonEmptyString(query.guestId)) filters.guestId = query.guestId.trim();

  return filters;
}

export function parsePaymentFilters(query: Record<string, unknown>): PaymentFilterQuery {
  const filters: PaymentFilterQuery = {};

  if (isNonEmptyString(query.status)) filters.status = query.status.trim();
  if (isNonEmptyString(query.reservationId)) filters.reservationId = query.reservationId.trim();
  if (isNonEmptyString(query.guestId)) filters.guestId = query.guestId.trim();

  return filters;
}
