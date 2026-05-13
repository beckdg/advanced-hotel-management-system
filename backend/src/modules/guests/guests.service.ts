import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { PaginationParams, paginate } from '../../common/pagination';
import { CreateGuestInput, UpdateGuestInput } from './guests.validators';

export const GUEST_SORT_FIELDS = ['firstName', 'lastName', 'email', 'createdAt'] as const;

export async function createGuest(input: CreateGuestInput, actorId: string, ipAddress?: string) {
  const guest = await prisma.guest.create({ data: input });

  await createAuditLog({
    userId: actorId,
    action: 'guests.create',
    entity: 'Guest',
    entityId: guest.id,
    ipAddress,
  });

  return guest;
}

export async function listGuests(pagination: PaginationParams) {
  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.guest.findMany({
        include: { _count: { select: { reservations: true } } },
        orderBy,
        skip,
        take,
      }),
    count: () => prisma.guest.count(),
  });
}

export async function getGuestById(id: string) {
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      _count: { select: { reservations: true } },
      reservations: {
        include: {
          reservation: {
            select: {
              id: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
              hotel: { select: { name: true } },
            },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!guest) {
    throw new AppError('Guest not found', HTTP_STATUS.NOT_FOUND);
  }

  return guest;
}

export async function updateGuest(
  id: string,
  input: UpdateGuestInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Guest not found', HTTP_STATUS.NOT_FOUND);
  }

  const guest = await prisma.guest.update({ where: { id }, data: input });

  await createAuditLog({
    userId: actorId,
    action: 'guests.update',
    entity: 'Guest',
    entityId: id,
    ipAddress,
  });

  return guest;
}
