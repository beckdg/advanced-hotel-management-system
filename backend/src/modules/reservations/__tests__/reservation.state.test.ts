import { ReservationStatus } from '@prisma/client';
import { validateStatusTransition } from '../reservation.state';
import { AppError } from '../../../common/errors';

describe('Reservation status transitions', () => {
  const allowed: [ReservationStatus, ReservationStatus][] = [
    [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
    [ReservationStatus.PENDING, ReservationStatus.CANCELLED],
    [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
    [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
    [ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW],
    [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT],
  ];

  it.each(allowed)('should allow %s -> %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).not.toThrow();
  });

  const denied: [ReservationStatus, ReservationStatus][] = [
    [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN],
    [ReservationStatus.PENDING, ReservationStatus.CHECKED_OUT],
    [ReservationStatus.CHECKED_OUT, ReservationStatus.CONFIRMED],
    [ReservationStatus.CANCELLED, ReservationStatus.CONFIRMED],
    [ReservationStatus.NO_SHOW, ReservationStatus.CHECKED_IN],
    [ReservationStatus.CHECKED_IN, ReservationStatus.CANCELLED],
  ];

  it.each(denied)('should reject %s -> %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).toThrow(AppError);
  });
});
