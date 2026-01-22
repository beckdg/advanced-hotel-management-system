import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { CreateRoomTypeInput } from './room-types.validators';

export async function createRoomType(
  input: CreateRoomTypeInput,
  actorId: string,
  ipAddress?: string,
) {
  const hotel = await prisma.hotel.findUnique({ where: { id: input.hotelId } });
  if (!hotel) {
    throw new AppError('Hotel not found', HTTP_STATUS.NOT_FOUND);
  }

  const roomType = await prisma.roomType.create({
    data: {
      hotelId: input.hotelId,
      name: input.name,
      description: input.description,
      maxOccupancy: input.maxOccupancy,
      baseRate: input.baseRate,
    },
    include: { hotel: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    userId: actorId,
    action: 'room_types.create',
    entity: 'RoomType',
    entityId: roomType.id,
    ipAddress,
  });

  return roomType;
}

export async function listRoomTypes(hotelId?: string) {
  return prisma.roomType.findMany({
    where: hotelId ? { hotelId } : undefined,
    include: { hotel: { select: { id: true, name: true } }, _count: { select: { rooms: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getRoomTypeById(id: string) {
  const roomType = await prisma.roomType.findUnique({
    where: { id },
    include: {
      hotel: { select: { id: true, name: true } },
      _count: { select: { rooms: true } },
    },
  });

  if (!roomType) {
    throw new AppError('Room type not found', HTTP_STATUS.NOT_FOUND);
  }

  return roomType;
}
