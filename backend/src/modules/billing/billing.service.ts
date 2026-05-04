import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import {
  calculateInvoiceTotals,
  calculateItemTotal,
  calculateRoomCharge,
  ROOM_CHARGE_CATEGORY,
  toDecimal,
  toNumber,
} from './billing.calculations';
import {
  CHECKOUT_BLOCKING_INVOICE_STATUSES,
  validateInvoiceTransition,
} from './billing.state';
import { PaginationParams, paginate } from '../../common/pagination';
import { notifyPaymentReceived } from '../notifications';

export const INVOICE_SORT_FIELDS = ['status', 'totalAmount', 'createdAt', 'issuedAt'] as const;
export const PAYMENT_SORT_FIELDS = ['amount', 'status', 'createdAt', 'processedAt'] as const;
import {
  CreateInvoiceInput,
  CreateInvoiceItemInput,
  InvoiceFilterQuery,
  PaymentFilterQuery,
  RecordPaymentInput,
  UpdateInvoiceInput,
} from './billing.validators';

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const invoiceInclude = {
  reservation: {
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      hotel: { select: { id: true, name: true } },
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: { select: { id: true, name: true, baseRate: true } },
        },
      },
      guests: {
        include: {
          guest: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  },
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'desc' as const } },
};

async function recalculateInvoiceTotals(
  tx: TransactionClient,
  invoiceId: string,
  taxAmount?: Prisma.Decimal | number,
  discountAmount?: Prisma.Decimal | number,
) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  const tax = taxAmount !== undefined ? taxAmount : invoice.taxAmount;
  const discount = discountAmount !== undefined ? discountAmount : invoice.discountAmount;
  const { subtotal, totalAmount } = calculateInvoiceTotals(invoice.items, tax, discount);

  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: toDecimal(subtotal),
      taxAmount: toDecimal(toNumber(tax)),
      discountAmount: toDecimal(toNumber(discount)),
      totalAmount: toDecimal(totalAmount),
    },
    include: invoiceInclude,
  });
}

async function getCompletedPaymentTotal(tx: TransactionClient, invoiceId: string): Promise<number> {
  const payments = await tx.payment.findMany({
    where: { invoiceId, status: PaymentStatus.COMPLETED },
  });
  return payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
}

export async function generateDraftInvoiceForReservation(
  reservationId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? prisma;

  const existing = await client.invoice.findUnique({ where: { reservationId } });
  if (existing) {
    return existing;
  }

  const reservation = await client.reservation.findUnique({
    where: { id: reservationId },
    include: {
      room: { include: { roomType: true } },
    },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  const { nights, unitPrice, totalPrice } = calculateRoomCharge(
    reservation.checkInDate,
    reservation.checkOutDate,
    reservation.room.roomType.baseRate,
  );

  const roomTypeName = reservation.room.roomType.name;

  const invoice = await client.invoice.create({
    data: {
      reservationId,
      status: InvoiceStatus.DRAFT,
      items: {
        create: {
          description: `Room charge - ${roomTypeName} (${nights} night${nights > 1 ? 's' : ''})`,
          quantity: nights,
          unitPrice: toDecimal(unitPrice),
          totalPrice: toDecimal(totalPrice),
          category: ROOM_CHARGE_CATEGORY,
        },
      },
    },
    include: { items: true },
  });

  return recalculateInvoiceTotals(client, invoice.id);
}

export async function assertReservationInvoicePaid(reservationId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { reservationId } });

  if (!invoice) {
    throw new AppError(
      'Reservation cannot be checked out without a paid invoice',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (invoice.status !== InvoiceStatus.PAID) {
    throw new AppError(
      `Reservation cannot be checked out while invoice status is ${invoice.status}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}

export async function createInvoice(
  input: CreateInvoiceInput,
  actorId: string,
  ipAddress?: string,
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  const existing = await prisma.invoice.findUnique({
    where: { reservationId: input.reservationId },
  });

  if (existing) {
    throw new AppError('Invoice already exists for this reservation', HTTP_STATUS.BAD_REQUEST);
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        reservationId: input.reservationId,
        status: InvoiceStatus.DRAFT,
        taxAmount: toDecimal(input.taxAmount ?? 0),
        discountAmount: toDecimal(input.discountAmount ?? 0),
      },
    });

    return recalculateInvoiceTotals(tx, created.id);
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice.create',
    entity: 'Invoice',
    entityId: invoice.id,
    ipAddress,
  });

  return invoice;
}

function buildInvoiceWhere(filters: InvoiceFilterQuery): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};

  if (filters.status) {
    where.status = filters.status as InvoiceStatus;
  }

  if (filters.reservationId) {
    where.reservationId = filters.reservationId;
  }

  if (filters.guestId) {
    where.reservation = {
      guests: { some: { guestId: filters.guestId } },
    };
  }

  return where;
}

export async function listInvoices(filters: InvoiceFilterQuery, pagination: PaginationParams) {
  const where = buildInvoiceWhere(filters);
  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.invoice.findMany({ where, include: invoiceInclude, orderBy, skip, take }),
    count: () => prisma.invoice.count({ where }),
  });
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });

  if (!invoice) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  return invoice;
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.invoice.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  if (existing.status !== InvoiceStatus.DRAFT) {
    throw new AppError('Only draft invoices can be updated', HTTP_STATUS.BAD_REQUEST);
  }

  const invoice = await prisma.$transaction(async (tx) =>
    recalculateInvoiceTotals(
      tx,
      id,
      input.taxAmount !== undefined ? toDecimal(input.taxAmount) : undefined,
      input.discountAmount !== undefined ? toDecimal(input.discountAmount) : undefined,
    ),
  );

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice.update',
    entity: 'Invoice',
    entityId: id,
    ipAddress,
  });

  return invoice;
}

export async function issueInvoice(id: string, actorId: string, ipAddress?: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  validateInvoiceTransition(existing.status, InvoiceStatus.ISSUED);

  if (existing.items.length === 0) {
    throw new AppError('Cannot issue an invoice without items', HTTP_STATUS.BAD_REQUEST);
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date(),
    },
    include: invoiceInclude,
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice.issue',
    entity: 'Invoice',
    entityId: id,
    ipAddress,
  });

  return invoice;
}

export async function voidInvoice(id: string, actorId: string, ipAddress?: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  validateInvoiceTransition(existing.status, InvoiceStatus.VOID);

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.VOID },
    include: invoiceInclude,
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice.void',
    entity: 'Invoice',
    entityId: id,
    ipAddress,
  });

  return invoice;
}

export async function recordPayment(
  invoiceId: string,
  input: RecordPaymentInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!existing) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  if (
    existing.status !== InvoiceStatus.ISSUED &&
    existing.status !== InvoiceStatus.PARTIALLY_PAID
  ) {
    throw new AppError(
      'Payments can only be recorded on issued or partially paid invoices',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const currentPaid = await getCompletedPaymentTotal(prisma, invoiceId);
  const totalAmount = toNumber(existing.totalAmount);

  if (currentPaid + input.amount > totalAmount) {
    throw new AppError('Payment amount exceeds outstanding balance', HTTP_STATUS.BAD_REQUEST);
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: toDecimal(input.amount),
        method: input.method,
        status: PaymentStatus.COMPLETED,
        transactionReference: input.transactionReference,
        processedAt: new Date(),
      },
    });

    const paidTotal = await getCompletedPaymentTotal(tx, invoiceId);
    const nextStatus =
      paidTotal >= totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    validateInvoiceTransition(existing.status, nextStatus);

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: nextStatus,
        paidAt: nextStatus === InvoiceStatus.PAID ? new Date() : null,
      },
      include: invoiceInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice.pay',
    entity: 'Invoice',
    entityId: invoiceId,
    ipAddress,
  });

  await notifyPaymentReceived(actorId, invoiceId, input.amount);

  return invoice;
}

export async function addInvoiceItem(
  invoiceId: string,
  input: CreateInvoiceItemInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!existing) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  if (existing.status !== InvoiceStatus.DRAFT) {
    throw new AppError('Items can only be added to draft invoices', HTTP_STATUS.BAD_REQUEST);
  }

  const totalPrice = calculateItemTotal(input.quantity, input.unitPrice);

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.create({
      data: {
        invoiceId,
        description: input.description,
        quantity: input.quantity,
        unitPrice: toDecimal(input.unitPrice),
        totalPrice: toDecimal(totalPrice),
        category: input.category,
      },
    });

    return recalculateInvoiceTotals(tx, invoiceId);
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice_item.create',
    entity: 'InvoiceItem',
    entityId: invoiceId,
    ipAddress,
  });

  return invoice;
}

export async function deleteInvoiceItem(
  itemId: string,
  actorId: string,
  ipAddress?: string,
) {
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    include: { invoice: true },
  });

  if (!item) {
    throw new AppError('Invoice item not found', HTTP_STATUS.NOT_FOUND);
  }

  if (item.invoice.status !== InvoiceStatus.DRAFT) {
    throw new AppError('Items can only be removed from draft invoices', HTTP_STATUS.BAD_REQUEST);
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.delete({ where: { id: itemId } });
    return recalculateInvoiceTotals(tx, item.invoiceId);
  });

  await createAuditLog({
    userId: actorId,
    action: 'billing.invoice_item.delete',
    entity: 'InvoiceItem',
    entityId: itemId,
    ipAddress,
  });

  return invoice;
}

function buildPaymentWhere(filters: PaymentFilterQuery): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};

  if (filters.status) {
    where.status = filters.status as PaymentStatus;
  }

  if (filters.reservationId || filters.guestId) {
    where.invoice = {
      reservation: {
        ...(filters.reservationId ? { id: filters.reservationId } : {}),
        ...(filters.guestId
          ? { guests: { some: { guestId: filters.guestId } } }
          : {}),
      },
    };
  }

  return where;
}

export async function listPayments(filters: PaymentFilterQuery, pagination: PaginationParams) {
  const where = buildPaymentWhere(filters);
  const paymentInclude = {
    invoice: {
      select: {
        id: true,
        status: true,
        totalAmount: true,
        reservation: {
          select: {
            id: true,
            hotel: { select: { id: true, name: true } },
            guests: {
              include: {
                guest: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    },
  };

  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.payment.findMany({ where, include: paymentInclude, orderBy, skip, take }),
    count: () => prisma.payment.count({ where }),
  });
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: {
        include: invoiceInclude,
      },
    },
  });

  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  return payment;
}

export async function getBillingMetrics() {
  const [paidInvoices, outstandingInvoices, revenueAggregate] = await Promise.all([
    prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
    prisma.invoice.count({
      where: {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      },
    }),
    prisma.invoice.aggregate({
      where: { status: InvoiceStatus.PAID },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalRevenue: toNumber(revenueAggregate._sum.totalAmount ?? 0),
    outstandingInvoices,
    paidInvoices,
  };
}

export { CHECKOUT_BLOCKING_INVOICE_STATUSES };
