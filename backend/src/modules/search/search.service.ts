import { prisma } from '../../config/database';
import { PermissionName } from '../rbac/rbac.constants';
import { PERMISSIONS } from '../rbac/rbac.constants';
import { SearchQuery } from './search.validators';

export interface SearchResults {
  guests: Awaited<ReturnType<typeof searchGuests>>;
  reservations: Awaited<ReturnType<typeof searchReservations>>;
  rooms: Awaited<ReturnType<typeof searchRooms>>;
  invoices: Awaited<ReturnType<typeof searchInvoices>>;
  maintenance: Awaited<ReturnType<typeof searchMaintenance>>;
}

function hasPermission(permissions: PermissionName[], permission: PermissionName): boolean {
  return permissions.includes(permission);
}

async function searchGuests(q: string, limit: number) {
  return prisma.guest.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { lastName: 'asc' },
  });
}

async function searchReservations(q: string, limit: number) {
  return prisma.reservation.findMany({
    where: {
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        {
          guests: {
            some: {
              guest: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
        { room: { roomNumber: { contains: q, mode: 'insensitive' } } },
      ],
    },
    include: {
      hotel: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
      guests: {
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

async function searchRooms(q: string, limit: number) {
  return prisma.room.findMany({
    where: {
      OR: [
        { roomNumber: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      hotel: { select: { id: true, name: true } },
      roomType: { select: { id: true, name: true } },
    },
    take: limit,
    orderBy: { roomNumber: 'asc' },
  });
}

async function searchInvoices(q: string, limit: number) {
  return prisma.invoice.findMany({
    where: {
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { reservationId: { contains: q, mode: 'insensitive' } },
      ],
    },
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
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

async function searchMaintenance(q: string, limit: number) {
  return prisma.maintenanceRequest.findMany({
    where: {
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { room: { roomNumber: { contains: q, mode: 'insensitive' } } },
      ],
    },
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          hotel: { select: { id: true, name: true } },
        },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

export async function globalSearch(
  query: SearchQuery,
  permissions: PermissionName[],
): Promise<SearchResults> {
  const { q, limit } = query;

  const [guests, reservations, rooms, invoices, maintenance] = await Promise.all([
    hasPermission(permissions, PERMISSIONS.GUESTS_READ) ? searchGuests(q, limit) : [],
    hasPermission(permissions, PERMISSIONS.RESERVATIONS_READ)
      ? searchReservations(q, limit)
      : [],
    hasPermission(permissions, PERMISSIONS.ROOMS_READ) ? searchRooms(q, limit) : [],
    hasPermission(permissions, PERMISSIONS.BILLING_READ) ? searchInvoices(q, limit) : [],
    hasPermission(permissions, PERMISSIONS.MAINTENANCE_READ)
      ? searchMaintenance(q, limit)
      : [],
  ]);

  return { guests, reservations, rooms, invoices, maintenance };
}
