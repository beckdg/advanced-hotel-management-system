import request from 'supertest';
import { InvoiceStatus, ReservationStatus, RoomStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockReservationId, mockRoomId } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    reservation: { findUnique: jest.fn(), update: jest.fn() },
    room: { update: jest.fn() },
    invoice: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../rbac/rbac.service', () => ({
  getAuthUserById: jest.fn(),
  mapUserToAuthUser: jest.requireActual('../../rbac/rbac.service').mapUserToAuthUser,
  userHasPermission: jest.requireActual('../../rbac/rbac.service').userHasPermission,
}));

import { prisma } from '../../../config/database';
import { getAuthUserById } from '../../rbac/rbac.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUserById = getAuthUserById as jest.MockedFunction<typeof getAuthUserById>;

const mockReservation = {
  id: mockReservationId,
  roomId: mockRoomId,
  status: ReservationStatus.CHECKED_IN,
};

describe('Checkout billing restrictions', () => {
  const app = createApp();

  function authHeader() {
    return `Bearer ${signAccessToken({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      roleId: mockAdminUser.roleId,
      roleName: mockAdminUser.roleName,
    })}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);
  });

  it.each([
    InvoiceStatus.DRAFT,
    InvoiceStatus.ISSUED,
    InvoiceStatus.PARTIALLY_PAID,
  ])('should reject checkout when invoice status is %s', async (invoiceStatus) => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      id: 'invoice-1',
      status: invoiceStatus,
    });

    const response = await request(app)
      .post(`/api/reservations/${mockReservationId}/check-out`)
      .set('Authorization', authHeader())
      .expect(400);

    expect(response.body.message).toContain('invoice status');
  });

  it('should reject checkout when no invoice exists', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/reservations/${mockReservationId}/check-out`)
      .set('Authorization', authHeader())
      .expect(400);

    expect(response.body.message).toContain('paid invoice');
  });

  it('should allow checkout when invoice is PAID', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      id: 'invoice-1',
      status: InvoiceStatus.PAID,
    });

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: jest.fn() },
        reservation: {
          update: jest.fn().mockResolvedValue({
            ...mockReservation,
            status: ReservationStatus.CHECKED_OUT,
            room: { id: mockRoomId, roomNumber: '101', status: RoomStatus.DIRTY },
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/reservations/${mockReservationId}/check-out`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('CHECKED_OUT');
  });
});
