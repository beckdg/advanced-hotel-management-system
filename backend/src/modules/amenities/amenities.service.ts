import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { createAuditLog } from '../../common/utils';
import { CreateAmenityInput } from './amenities.validators';

export async function createAmenity(
  input: CreateAmenityInput,
  actorId: string,
  ipAddress?: string,
) {
  const existing = await prisma.amenity.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new AppError('Amenity already exists', HTTP_STATUS.BAD_REQUEST);
  }

  const amenity = await prisma.amenity.create({ data: input });

  await createAuditLog({
    userId: actorId,
    action: 'amenities.create',
    entity: 'Amenity',
    entityId: amenity.id,
    ipAddress,
  });

  return amenity;
}

export async function listAmenities() {
  return prisma.amenity.findMany({
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getAmenityById(id: string) {
  const amenity = await prisma.amenity.findUnique({
    where: { id },
    include: { _count: { select: { rooms: true } } },
  });

  if (!amenity) {
    throw new AppError('Amenity not found', HTTP_STATUS.NOT_FOUND);
  }

  return amenity;
}
