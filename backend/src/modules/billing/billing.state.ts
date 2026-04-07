import { InvoiceStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED],
  [InvoiceStatus.ISSUED]: [
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.VOID,
  ],
  [InvoiceStatus.PARTIALLY_PAID]: [InvoiceStatus.PAID],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.VOID]: [],
};

export const CHECKOUT_BLOCKING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
];

export function validateInvoiceTransition(
  current: InvoiceStatus,
  next: InvoiceStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Invalid invoice transition from ${current} to ${next}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}
