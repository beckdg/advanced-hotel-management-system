import { MaintenanceStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';

const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.OPEN]: [MaintenanceStatus.ASSIGNED],
  [MaintenanceStatus.ASSIGNED]: [MaintenanceStatus.IN_PROGRESS],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.RESOLVED],
  [MaintenanceStatus.RESOLVED]: [MaintenanceStatus.CLOSED],
  [MaintenanceStatus.CLOSED]: [],
};

export function validateMaintenanceTransition(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Invalid maintenance transition from ${current} to ${next}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}

export const MAINTENANCE_OUT_OF_SERVICE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.OPEN,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
];
