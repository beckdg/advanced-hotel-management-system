import { InvoiceStatus } from '@prisma/client';
import { AppError } from '../../../common/errors';
import { validateInvoiceTransition } from '../billing.state';

describe('Invoice state machine', () => {
  it.each([
    [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED],
    [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
    [InvoiceStatus.ISSUED, InvoiceStatus.PAID],
    [InvoiceStatus.ISSUED, InvoiceStatus.VOID],
    [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID],
  ])('allows %s -> %s', (from, to) => {
    expect(() => validateInvoiceTransition(from, to)).not.toThrow();
  });

  it.each([
    [InvoiceStatus.DRAFT, InvoiceStatus.PAID],
    [InvoiceStatus.DRAFT, InvoiceStatus.VOID],
    [InvoiceStatus.ISSUED, InvoiceStatus.DRAFT],
    [InvoiceStatus.PAID, InvoiceStatus.VOID],
    [InvoiceStatus.VOID, InvoiceStatus.ISSUED],
    [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.VOID],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => validateInvoiceTransition(from, to)).toThrow(AppError);
    expect(() => validateInvoiceTransition(from, to)).toThrow(/Invalid invoice transition/);
  });
});
