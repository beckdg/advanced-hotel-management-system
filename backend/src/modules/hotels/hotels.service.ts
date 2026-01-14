import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { CreateHotelInput, UpdateHotelInput } from './hotels.validators';

const hotelInclude = {
  floors: { orderBy: { floorNumber: 'asc' as const } },
  roomTypes: true,
  _count: { select: { rooms: true } },
};

export async function createHotel(input: CreateHotelInput, actorId: string, ipAddress?: string) {
  const hotel = await prisma.hotel.create({
    data: input,
    include: hotelInclude,
  });

  await createAuditLog({
    userId: actorId,
    action: 'hotels.create',
    entity: 'Hotel',
    entityId: hotel.id,
    ipAddress,
  });

  return hotel;
}

export async function listHotels() {
  return prisma.hotel.findMany({
    include: hotelInclude,
    orderBy: { name: 'asc' },
  });
}

export async function getHotelById(id: string) {
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: hotelInclude,
  });

  if (!hotel) {
    throw new AppError('Hotel not found', HTTP_STATUS.NOT_FOUND);
  }

  return hotel;
}

export async function updateHotel(
  id: string,
  input: UpdateHotelInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.hotel.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Hotel not found', HTTP_STATUS.NOT_FOUND);
  }

  const hotel = await prisma.hotel.update({
    where: { id },
    data: input,
    include: hotelInclude,
  });

  await createAuditLog({
    userId: actorId,
    action: 'hotels.update',
    entity: 'Hotel',
    entityId: id,
    ipAddress,
  });

  return hotel;
}
