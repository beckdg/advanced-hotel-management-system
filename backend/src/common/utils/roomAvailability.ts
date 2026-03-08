import { MaintenanceStatus, RoomStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../errors';
import { HTTP_STATUS } from '../constants';

export const ACTIVE_MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.OPEN,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
];

export async function assertRoomAvailableForReservation(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  if (room.status === RoomStatus.OUT_OF_SERVICE) {
    throw new AppError('Room is out of service and cannot be reserved', HTTP_STATUS.BAD_REQUEST);
  }

  const activeMaintenance = await prisma.maintenanceRequest.findFirst({
    where: {
      roomId,
      status: { in: ACTIVE_MAINTENANCE_STATUSES },
    },
  });

  if (activeMaintenance) {
    throw new AppError(
      'Room has an active maintenance request and cannot be reserved',
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}
