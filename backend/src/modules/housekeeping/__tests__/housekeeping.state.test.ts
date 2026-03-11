import { HousekeepingStatus } from '@prisma/client';
import { validateHousekeepingTransition } from '../housekeeping.state';
import { AppError } from '../../../common/errors';

describe('Housekeeping state machine', () => {
  it.each([
    [HousekeepingStatus.DIRTY, HousekeepingStatus.CLEANING],
    [HousekeepingStatus.CLEANING, HousekeepingStatus.INSPECTING],
    [HousekeepingStatus.INSPECTING, HousekeepingStatus.READY],
  ])('allows %s -> %s', (from, to) => {
    expect(() => validateHousekeepingTransition(from, to)).not.toThrow();
  });

  it.each([
    [HousekeepingStatus.DIRTY, HousekeepingStatus.READY],
    [HousekeepingStatus.CLEANING, HousekeepingStatus.READY],
    [HousekeepingStatus.READY, HousekeepingStatus.DIRTY],
    [HousekeepingStatus.INSPECTING, HousekeepingStatus.CLEANING],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => validateHousekeepingTransition(from, to)).toThrow(AppError);
  });
});
