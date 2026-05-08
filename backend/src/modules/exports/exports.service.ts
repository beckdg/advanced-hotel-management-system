import { prisma } from '../../config/database';
import { toCsv } from '../../common/export/csv';
import { parseAuditLogFilters } from '../audit/audit.validators';
import { parseInvoiceFilters } from '../billing/billing.validators';

const reservationInclude = {
  hotel: { select: { id: true, name: true } },
  room: { select: { id: true, roomNumber: true } },
  guests: {
    include: {
      guest: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
};

export async function exportReservations() {
  return prisma.reservation.findMany({
    include: reservationInclude,
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

export async function exportInvoices(query: Record<string, unknown>) {
  const filters = parseInvoiceFilters(query);
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.reservationId) where.reservationId = filters.reservationId;

  return prisma.invoice.findMany({
    where,
    include: {
      reservation: {
        select: {
          id: true,
          hotel: { select: { id: true, name: true } },
          guests: {
            include: {
              guest: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

export async function exportAuditLogs(query: Record<string, unknown>) {
  const filters = parseAuditLogFilters(query);
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.entityType) where.entity = filters.entityType;
  if (filters.action) where.action = filters.action;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

export function reservationsToCsv(
  reservations: Awaited<ReturnType<typeof exportReservations>>,
): string {
  const rows = reservations.map((r) => {
    const primaryGuest = r.guests.find((g) => g.isPrimary)?.guest ?? r.guests[0]?.guest;
    return {
      id: r.id,
      hotel: r.hotel.name,
      roomNumber: r.room.roomNumber,
      guestName: primaryGuest ? `${primaryGuest.firstName} ${primaryGuest.lastName}` : '',
      guestEmail: primaryGuest?.email ?? '',
      checkInDate: r.checkInDate.toISOString(),
      checkOutDate: r.checkOutDate.toISOString(),
      status: r.status,
      totalGuests: r.totalGuests,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return toCsv(rows, [
    'id',
    'hotel',
    'roomNumber',
    'guestName',
    'guestEmail',
    'checkInDate',
    'checkOutDate',
    'status',
    'totalGuests',
    'createdAt',
  ]);
}

export function invoicesToCsv(invoices: Awaited<ReturnType<typeof exportInvoices>>): string {
  const rows = invoices.map((inv) => ({
    id: inv.id,
    reservationId: inv.reservationId,
    status: inv.status,
    subtotal: inv.subtotal.toString(),
    taxAmount: inv.taxAmount.toString(),
    discountAmount: inv.discountAmount.toString(),
    totalAmount: inv.totalAmount.toString(),
    issuedAt: inv.issuedAt?.toISOString() ?? '',
    paidAt: inv.paidAt?.toISOString() ?? '',
    createdAt: inv.createdAt.toISOString(),
  }));

  return toCsv(rows, [
    'id',
    'reservationId',
    'status',
    'subtotal',
    'taxAmount',
    'discountAmount',
    'totalAmount',
    'issuedAt',
    'paidAt',
    'createdAt',
  ]);
}

export function auditLogsToCsv(logs: Awaited<ReturnType<typeof exportAuditLogs>>): string {
  const rows = logs.map((log) => ({
    id: log.id,
    userId: log.userId ?? '',
    userName: log.user?.name ?? '',
    action: log.action,
    entity: log.entity ?? '',
    entityId: log.entityId ?? '',
    ipAddress: log.ipAddress ?? '',
    createdAt: log.createdAt.toISOString(),
  }));

  return toCsv(rows, [
    'id',
    'userId',
    'userName',
    'action',
    'entity',
    'entityId',
    'ipAddress',
    'createdAt',
  ]);
}
