import { MaintenanceStatus } from '@prisma/client';
import { validateMaintenanceTransition } from '../maintenance.state';
import { AppError } from '../../../common/errors';

describe('Maintenance state machine', () => {
  it.each([
    [MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED],
    [MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS],
    [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.RESOLVED],
    [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED],
  ])('allows %s -> %s', (from, to) => {
    expect(() => validateMaintenanceTransition(from, to)).not.toThrow();
  });

  it.each([
    [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS],
    [MaintenanceStatus.OPEN, MaintenanceStatus.CLOSED],
    [MaintenanceStatus.CLOSED, MaintenanceStatus.OPEN],
    [MaintenanceStatus.RESOLVED, MaintenanceStatus.IN_PROGRESS],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => validateMaintenanceTransition(from, to)).toThrow(AppError);
  });
});
