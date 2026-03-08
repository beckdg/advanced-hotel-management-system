import { HousekeepingStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';

const ALLOWED_TRANSITIONS: Record<HousekeepingStatus, HousekeepingStatus[]> = {
  [HousekeepingStatus.DIRTY]: [HousekeepingStatus.CLEANING],
  [HousekeepingStatus.CLEANING]: [HousekeepingStatus.INSPECTING],
  [HousekeepingStatus.INSPECTING]: [HousekeepingStatus.READY],
  [HousekeepingStatus.READY]: [],
};

export function validateHousekeepingTransition(
  current: HousekeepingStatus,
  next: HousekeepingStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Invalid housekeeping transition from ${current} to ${next}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
}
