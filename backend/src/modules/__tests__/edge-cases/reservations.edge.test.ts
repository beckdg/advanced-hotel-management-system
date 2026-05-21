import request from 'supertest';
import { ReservationStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockHotelId, mockRoomId, mockReservationId } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: { findUnique: jest.fn() },
    room: { findUnique: jest.fn(), update: jest.fn() },
    guest: { findMany: jest.fn() },
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    reservationGuest: { deleteMany: jest.fn(), createMany: jest.fn() },
    maintenanceRequest: { findFirst: jest.fn() },
    invoice: { findUnique: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../notifications', () => ({
  ...jest.requireActual('../../notifications'),
  notifyReservationCreated: jest.fn(),
  notifyReservationConfirmed: jest.fn(),
  notifyCheckIn: jest.fn(),
  notifyCheckOut: jest.fn(),
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
const app = createApp();
const mockGuestId = 'guest-1';

function auth() {
  return `Bearer ${signAccessToken({
    sub: mockAdminUser.id,
    email: mockAdminUser.email,
    roleId: mockAdminUser.roleId,
    roleName: mockAdminUser.roleName,
  })}`;
}

const mockReservation = {
  id: mockReservationId,
  hotelId: mockHotelId,
  roomId: mockRoomId,
  checkInDate: new Date('2026-08-01'),
  checkOutDate: new Date('2026-08-05'),
  status: ReservationStatus.PENDING,
  totalGuests: 1,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  hotel: { id: mockHotelId, name: 'Test' },
  room: { id: mockRoomId, roomNumber: '101', status: 'AVAILABLE', roomType: { id: 'rt', name: 'Std', maxOccupancy: 2 } },
  guests: [{ guest: { id: mockGuestId, firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: null } }],
};

describe('Reservation edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([{ id: mockGuestId }]);
    (mockPrisma.hotel.findUnique as jest.Mock).mockResolvedValue({ id: mockHotelId });
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: mockHotelId,
      status: 'AVAILABLE',
    });
    (mockPrisma.maintenanceRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('rejects create with check-out before check-in', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', auth())
      .send({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        checkInDate: '2026-08-10',
        checkOutDate: '2026-08-05',
        guestIds: [mockGuestId],
      });
    expect(res.status).toBe(400);
  });

  it('rejects create with empty guestIds', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', auth())
      .send({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-05',
        guestIds: [],
      });
    expect(res.status).toBe(400);
  });

  it('rejects create when room belongs to different hotel', async () => {
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: 'other-hotel',
    });

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', auth())
      .send({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-05',
        guestIds: [mockGuestId],
      });
    expect(res.status).toBe(400);
  });

  it('rejects bulk cancel with empty reservationIds', async () => {
    const res = await request(app)
      .post('/api/reservations/bulk-cancel')
      .set('Authorization', auth())
      .send({ reservationIds: [] });
    expect(res.status).toBe(400);
  });

  it('rejects check-in from CANCELLED status', async () => {
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
      ...mockReservation,
      status: ReservationStatus.CANCELLED,
    });

    const res = await request(app)
      .post(`/api/reservations/${mockReservationId}/check-in`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('rejects check-out from PENDING status', async () => {
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);

    const res = await request(app)
      .post(`/api/reservations/${mockReservationId}/check-out`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown reservation', async () => {
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/reservations/unknown-id`)
      .set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  it('rejects NO_SHOW transition from CHECKED_IN', async () => {
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
      ...mockReservation,
      status: ReservationStatus.CHECKED_IN,
    });

    const res = await request(app)
      .patch(`/api/reservations/${mockReservationId}`)
      .set('Authorization', auth())
      .send({ status: 'NO_SHOW' });
    expect(res.status).toBe(400);
  });

  it('paginates with custom limit', async () => {
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([mockReservation]);
    (mockPrisma.reservation.count as jest.Mock).mockResolvedValue(50);

    const res = await request(app)
      .get('/api/reservations?page=2&limit=5')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.totalPages).toBe(10);
  });

  it('filters reservations by guestId', async () => {
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.reservation.count as jest.Mock).mockResolvedValue(0);

    await request(app)
      .get(`/api/reservations?guestId=${mockGuestId}`)
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          guests: expect.objectContaining({ some: { guestId: mockGuestId } }),
        }),
      }),
    );
  });
});
