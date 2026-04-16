import { MaintenanceStatus, Prisma, ReservationStatus, RoomStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { assertRoomAvailableForReservation } from '../../common/utils/roomAvailability';
import {
  assertReservationInvoicePaid,
  generateDraftInvoiceForReservation,
  getBillingMetrics,
} from '../billing';
import { OVERLAP_BLOCKING_STATUSES, validateStatusTransition } from './reservation.state';
import {
  CreateReservationInput,
  UpdateReservationInput,
  ReservationFilterQuery,
} from './reservations.validators';

const reservationInclude = {
  hotel: { select: { id: true, name: true } },
  room: {
    select: {
      id: true,
      roomNumber: true,
      status: true,
      roomType: { select: { id: true, name: true, maxOccupancy: true } },
    },
  },
  guests: {
    include: {
      guest: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  },
};

async function validateRoomBelongsToHotel(hotelId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hotelId !== hotelId) {
    throw new AppError('Room not found or does not belong to hotel', HTTP_STATUS.BAD_REQUEST);
  }
  return room;
}

async function validateGuestsExist(guestIds: string[]) {
  const guests = await prisma.guest.findMany({ where: { id: { in: guestIds } } });
  if (guests.length !== guestIds.length) {
    throw new AppError('One or more guests not found', HTTP_STATUS.BAD_REQUEST);
  }
}

export async function checkOverlappingReservations(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeReservationId?: string,
): Promise<void> {
  const overlapping = await prisma.reservation.findFirst({
    where: {
      roomId,
      status: { in: OVERLAP_BLOCKING_STATUSES },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
    },
  });

  if (overlapping) {
    throw new AppError(
      'Room has an overlapping reservation for the selected dates',
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}

async function syncRoomOnCheckIn(roomId: string) {
  await prisma.room.update({
    where: { id: roomId },
    data: { status: RoomStatus.OCCUPIED },
  });
}

async function syncRoomOnCheckOut(roomId: string) {
  await prisma.room.update({
    where: { id: roomId },
    data: { status: RoomStatus.DIRTY },
  });
}

function buildGuestAssociations(guestIds: string[]) {
  return guestIds.map((guestId, index) => ({
    guestId,
    isPrimary: index === 0,
  }));
}

export async function createReservation(
  input: CreateReservationInput,
  actorId: string,
  ipAddress?: string,
) {
  await validateRoomBelongsToHotel(input.hotelId, input.roomId);
  await validateGuestsExist(input.guestIds);
  await assertRoomAvailableForReservation(input.roomId);

  const status = input.status ?? ReservationStatus.PENDING;

  if (OVERLAP_BLOCKING_STATUSES.includes(status)) {
    await checkOverlappingReservations(input.roomId, input.checkInDate, input.checkOutDate);
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const created = await tx.reservation.create({
      data: {
        hotelId: input.hotelId,
        roomId: input.roomId,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        status,
        totalGuests: input.totalGuests,
        notes: input.notes,
        guests: { create: buildGuestAssociations(input.guestIds) },
      },
      include: reservationInclude,
    });

    if (status === ReservationStatus.CONFIRMED) {
      await generateDraftInvoiceForReservation(created.id, tx);
    }

    return created;
  });

  await createAuditLog({
    userId: actorId,
    action: 'reservations.create',
    entity: 'Reservation',
    entityId: reservation.id,
    ipAddress,
  });

  return reservation;
}

export async function listReservations(filters: ReservationFilterQuery) {
  const where: Prisma.ReservationWhereInput = {};

  if (filters.hotelId) where.hotelId = filters.hotelId;
  if (filters.roomId) where.roomId = filters.roomId;
  if (filters.status) where.status = filters.status;
  if (filters.guestId) {
    where.guests = { some: { guestId: filters.guestId } };
  }

  return prisma.reservation.findMany({
    where,
    include: reservationInclude,
    orderBy: { checkInDate: 'desc' },
  });
}

export async function getReservationById(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  });

  if (!reservation) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  return reservation;
}

export async function updateReservation(
  id: string,
  input: UpdateReservationInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  const roomId = input.roomId ?? existing.roomId;
  const checkInDate = input.checkInDate ?? existing.checkInDate;
  const checkOutDate = input.checkOutDate ?? existing.checkOutDate;

  if (checkOutDate <= checkInDate) {
    throw new AppError('checkOutDate must be after checkInDate', HTTP_STATUS.BAD_REQUEST);
  }

  if (input.roomId) {
    await validateRoomBelongsToHotel(existing.hotelId, input.roomId);
    await assertRoomAvailableForReservation(input.roomId);
  } else if (input.checkInDate || input.checkOutDate || input.status) {
    await assertRoomAvailableForReservation(roomId);
  }

  if (input.status) {
    validateStatusTransition(existing.status, input.status);
  }

  const effectiveStatus = input.status ?? existing.status;
  if (
    OVERLAP_BLOCKING_STATUSES.includes(effectiveStatus) &&
    (input.roomId || input.checkInDate || input.checkOutDate || input.status)
  ) {
    await checkOverlappingReservations(roomId, checkInDate, checkOutDate, id);
  }

  if (input.guestIds) {
    await validateGuestsExist(input.guestIds);
  }

  const { guestIds, status, ...updateData } = input;

  const reservation = await prisma.$transaction(async (tx) => {
    if (guestIds) {
      await tx.reservationGuest.deleteMany({ where: { reservationId: id } });
      await tx.reservationGuest.createMany({
        data: buildGuestAssociations(guestIds).map((g) => ({
          reservationId: id,
          ...g,
        })),
      });
    }

    const updated = await tx.reservation.update({
      where: { id },
      data: { ...updateData, ...(status ? { status } : {}) },
      include: reservationInclude,
    });

    if (
      status === ReservationStatus.CONFIRMED &&
      existing.status !== ReservationStatus.CONFIRMED
    ) {
      await generateDraftInvoiceForReservation(id, tx);
    }

    return updated;
  });

  await createAuditLog({
    userId: actorId,
    action: 'reservations.update',
    entity: 'Reservation',
    entityId: id,
    ipAddress,
  });

  return reservation;
}

export async function checkInReservation(id: string, actorId: string, ipAddress?: string) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  validateStatusTransition(existing.status, ReservationStatus.CHECKED_IN);

  const reservation = await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: existing.roomId },
      data: { status: RoomStatus.OCCUPIED },
    });

    return tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CHECKED_IN },
      include: reservationInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'reservations.check_in',
    entity: 'Reservation',
    entityId: id,
    ipAddress,
  });

  return reservation;
}

export async function checkOutReservation(id: string, actorId: string, ipAddress?: string) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Reservation not found', HTTP_STATUS.NOT_FOUND);
  }

  validateStatusTransition(existing.status, ReservationStatus.CHECKED_OUT);
  await assertReservationInvoicePaid(id);

  const reservation = await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: existing.roomId },
      data: { status: RoomStatus.DIRTY },
    });

    return tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CHECKED_OUT },
      include: reservationInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'reservations.check_out',
    entity: 'Reservation',
    entityId: id,
    ipAddress,
  });

  return reservation;
}

export async function getDashboardMetrics() {
  const [
    totalRooms,
    activeReservations,
    occupiedRooms,
    dirtyRooms,
    activeMaintenanceRequests,
    availableRooms,
    billingMetrics,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.reservation.count({
      where: {
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
      },
    }),
    prisma.room.count({ where: { status: RoomStatus.OCCUPIED } }),
    prisma.room.count({ where: { status: RoomStatus.DIRTY } }),
    prisma.maintenanceRequest.count({
      where: {
        status: {
          in: [
            MaintenanceStatus.OPEN,
            MaintenanceStatus.ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
          ],
        },
      },
    }),
    prisma.room.count({ where: { status: RoomStatus.AVAILABLE } }),
    getBillingMetrics(),
  ]);

  return {
    totalRooms,
    activeReservations,
    occupiedRooms,
    dirtyRooms,
    activeMaintenanceRequests,
    availableRooms,
    totalRevenue: billingMetrics.totalRevenue,
    outstandingInvoices: billingMetrics.outstandingInvoices,
    paidInvoices: billingMetrics.paidInvoices,
  };
}
