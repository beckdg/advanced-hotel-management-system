import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { PaginationParams, paginate } from '../../common/pagination';
import { CreateRoomInput, UpdateRoomInput, RoomFilterQuery } from './rooms.validators';

export const ROOM_SORT_FIELDS = ['roomNumber', 'status', 'createdAt'] as const;

const roomInclude = {
  hotel: { select: { id: true, name: true } },
  floor: { select: { id: true, name: true, floorNumber: true } },
  roomType: { select: { id: true, name: true, baseRate: true, maxOccupancy: true } },
  amenities: {
    include: { amenity: { select: { id: true, name: true, description: true } } },
  },
};

async function validateRoomRelations(
  hotelId: string,
  floorId: string,
  roomTypeId: string,
  amenityIds?: string[],
) {
  const [hotel, floor, roomType] = await Promise.all([
    prisma.hotel.findUnique({ where: { id: hotelId } }),
    prisma.floor.findUnique({ where: { id: floorId } }),
    prisma.roomType.findUnique({ where: { id: roomTypeId } }),
  ]);

  if (!hotel) throw new AppError('Hotel not found', HTTP_STATUS.NOT_FOUND);
  if (!floor || floor.hotelId !== hotelId) {
    throw new AppError('Floor not found or does not belong to hotel', HTTP_STATUS.BAD_REQUEST);
  }
  if (!roomType || roomType.hotelId !== hotelId) {
    throw new AppError('Room type not found or does not belong to hotel', HTTP_STATUS.BAD_REQUEST);
  }

  if (amenityIds?.length) {
    const amenities = await prisma.amenity.findMany({
      where: { id: { in: amenityIds } },
    });
    if (amenities.length !== amenityIds.length) {
      throw new AppError('One or more amenities not found', HTTP_STATUS.BAD_REQUEST);
    }
  }
}

export async function createRoom(input: CreateRoomInput, actorId: string, ipAddress?: string) {
  await validateRoomRelations(input.hotelId, input.floorId, input.roomTypeId, input.amenityIds);

  const existing = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: input.hotelId, roomNumber: input.roomNumber } },
  });
  if (existing) {
    throw new AppError('Room number already exists in this hotel', HTTP_STATUS.BAD_REQUEST);
  }

  const room = await prisma.room.create({
    data: {
      hotelId: input.hotelId,
      roomNumber: input.roomNumber,
      floorId: input.floorId,
      roomTypeId: input.roomTypeId,
      status: input.status,
      amenities: input.amenityIds?.length
        ? { create: input.amenityIds.map((amenityId) => ({ amenityId })) }
        : undefined,
    },
    include: roomInclude,
  });

  await createAuditLog({
    userId: actorId,
    action: 'rooms.create',
    entity: 'Room',
    entityId: room.id,
    ipAddress,
  });

  return room;
}

function buildRoomWhere(filters: RoomFilterQuery): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = {};
  if (filters.hotelId) where.hotelId = filters.hotelId;
  if (filters.roomTypeId) where.roomTypeId = filters.roomTypeId;
  if (filters.floorId) where.floorId = filters.floorId;
  if (filters.status) where.status = filters.status;
  return where;
}

export async function listRooms(filters: RoomFilterQuery, pagination: PaginationParams) {
  const where = buildRoomWhere(filters);
  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.room.findMany({ where, include: roomInclude, orderBy, skip, take }),
    count: () => prisma.room.count({ where }),
  });
}

export async function bulkUpdateRoomStatus(
  roomIds: string[],
  status: CreateRoomInput['status'],
  actorId: string,
  ipAddress?: string,
) {
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });
  if (rooms.length !== roomIds.length) {
    throw new AppError('One or more rooms not found', HTTP_STATUS.BAD_REQUEST, {
      code: 'ROOMS_NOT_FOUND',
    });
  }

  await prisma.room.updateMany({ where: { id: { in: roomIds } }, data: { status } });

  await Promise.all(
    roomIds.map((roomId) =>
      createAuditLog({
        userId: actorId,
        action: 'rooms.bulk_status',
        entity: 'Room',
        entityId: roomId,
        metadata: { status },
        ipAddress,
      }),
    ),
  );

  return prisma.room.findMany({ where: { id: { in: roomIds } }, include: roomInclude });
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: roomInclude,
  });

  if (!room) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  return room;
}

export async function updateRoom(
  id: string,
  input: UpdateRoomInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  const hotelId = existing.hotelId;
  const floorId = input.floorId ?? existing.floorId;
  const roomTypeId = input.roomTypeId ?? existing.roomTypeId;

  if (input.floorId || input.roomTypeId || input.amenityIds) {
    await validateRoomRelations(hotelId, floorId, roomTypeId, input.amenityIds);
  }

  if (input.roomNumber && input.roomNumber !== existing.roomNumber) {
    const duplicate = await prisma.room.findUnique({
      where: { hotelId_roomNumber: { hotelId, roomNumber: input.roomNumber } },
    });
    if (duplicate) {
      throw new AppError('Room number already exists in this hotel', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const { amenityIds, ...updateData } = input;

  const room = await prisma.$transaction(async (tx) => {
    if (amenityIds !== undefined) {
      await tx.roomAmenity.deleteMany({ where: { roomId: id } });
      if (amenityIds.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ roomId: id, amenityId })),
        });
      }
    }

    return tx.room.update({
      where: { id },
      data: updateData,
      include: roomInclude,
    });
  });

  await createAuditLog({
    userId: actorId,
    action: 'rooms.update',
    entity: 'Room',
    entityId: id,
    ipAddress,
  });

  return room;
}
