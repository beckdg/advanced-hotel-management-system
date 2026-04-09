import request from 'supertest';
import { InvoiceStatus, ReservationStatus, RoomStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import {
  mockAdminUser,
  mockHotelId,
  mockRoomId,
} from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: { findUnique: jest.fn() },
    room: { findUnique: jest.fn(), update: jest.fn() },
    guest: { findMany: jest.fn() },
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    reservationGuest: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    maintenanceRequest: { findFirst: jest.fn() },
    invoice: { findUnique: jest.fn(), create: jest.fn() },
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

const mockGuestId = 'guest-test-id';
const mockReservationId = 'reservation-test-id';

const mockReservation = {
  id: mockReservationId,
  hotelId: mockHotelId,
  roomId: mockRoomId,
  checkInDate: new Date('2026-07-01'),
  checkOutDate: new Date('2026-07-05'),
  status: ReservationStatus.PENDING,
  totalGuests: 1,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  hotel: { id: mockHotelId, name: 'Test Hotel' },
  room: {
    id: mockRoomId,
    roomNumber: '101',
    status: RoomStatus.AVAILABLE,
    roomType: { id: 'rt-1', name: 'Standard', maxOccupancy: 2 },
  },
  guests: [
    {
      guest: {
        id: mockGuestId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: null,
      },
    },
  ],
};

describe('Reservations API', () => {
  const app = createApp();

  function authHeader() {
    const token = signAccessToken({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      roleId: mockAdminUser.roleId,
      roleName: mockAdminUser.roleName,
    });
    return `Bearer ${token}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: mockHotelId,
      status: RoomStatus.AVAILABLE,
    });
    (mockPrisma.maintenanceRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([{ id: mockGuestId }]);
    (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
  });

  describe('POST /api/reservations', () => {
    it('should create a reservation', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          reservation: {
            create: jest.fn().mockResolvedValue(mockReservation),
          },
        }),
      );

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', authHeader())
        .send({
          hotelId: mockHotelId,
          roomId: mockRoomId,
          checkInDate: '2026-07-01',
          checkOutDate: '2026-07-05',
          totalGuests: 1,
          guestIds: [mockGuestId],
        })
        .expect(201);

      expect(response.body.data.status).toBe('PENDING');
    });

    it('should reject overlapping reservations', async () => {
      (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-res',
        status: ReservationStatus.CONFIRMED,
      });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', authHeader())
        .send({
          hotelId: mockHotelId,
          roomId: mockRoomId,
          checkInDate: '2026-07-01',
          checkOutDate: '2026-07-05',
          totalGuests: 1,
          guestIds: [mockGuestId],
          status: 'CONFIRMED',
        })
        .expect(400);

      expect(response.body.message).toContain('overlapping');
    });

    it('should deny without reservations.write permission', async () => {
      const readOnly = {
        ...mockAdminUser,
        permissions: [PERMISSIONS.RESERVATIONS_READ],
      };
      mockGetAuthUserById.mockResolvedValue(readOnly);

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', authHeader())
        .send({
          hotelId: mockHotelId,
          roomId: mockRoomId,
          checkInDate: '2026-07-01',
          checkOutDate: '2026-07-05',
          guestIds: [mockGuestId],
        })
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/reservations', () => {
    it('should filter by hotelId and status', async () => {
      (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([mockReservation]);

      await request(app)
        .get(`/api/reservations?hotelId=${mockHotelId}&status=CONFIRMED`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hotelId: mockHotelId,
            status: ReservationStatus.CONFIRMED,
          }),
        }),
      );
    });
  });

  describe('PATCH /api/reservations/:id - status transitions', () => {
    it('should allow PENDING -> CONFIRMED', async () => {
      (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          reservationGuest: { deleteMany: jest.fn(), createMany: jest.fn() },
          reservation: {
            update: jest.fn().mockResolvedValue({
              ...mockReservation,
              status: ReservationStatus.CONFIRMED,
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: mockReservationId,
              checkInDate: new Date('2026-07-01'),
              checkOutDate: new Date('2026-07-05'),
              room: { roomType: { name: 'Standard', baseRate: 100 } },
            }),
          },
          invoice: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce(null)
              .mockResolvedValueOnce({
                id: 'invoice-1',
                taxAmount: 0,
                discountAmount: 0,
                items: [{ totalPrice: 400 }],
              }),
            create: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
            update: jest.fn().mockResolvedValue({
              id: 'invoice-1',
              subtotal: 400,
              totalAmount: 400,
            }),
          },
        }),
      );

      const response = await request(app)
        .patch(`/api/reservations/${mockReservationId}`)
        .set('Authorization', authHeader())
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should reject invalid status transition CHECKED_OUT -> CONFIRMED', async () => {
      (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CHECKED_OUT,
      });

      const response = await request(app)
        .patch(`/api/reservations/${mockReservationId}`)
        .set('Authorization', authHeader())
        .send({ status: 'CONFIRMED' })
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });
  });

  describe('POST /api/reservations/:id/check-in', () => {
    it('should check in and set room to OCCUPIED', async () => {
      (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      });

      const roomUpdate = jest.fn();
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          room: { update: roomUpdate },
          reservation: {
            update: jest.fn().mockResolvedValue({
              ...mockReservation,
              status: ReservationStatus.CHECKED_IN,
              room: { ...mockReservation.room, status: RoomStatus.OCCUPIED },
            }),
          },
        }),
      );

      const response = await request(app)
        .post(`/api/reservations/${mockReservationId}/check-in`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data.status).toBe('CHECKED_IN');
      expect(roomUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: RoomStatus.OCCUPIED },
        }),
      );
    });

    it('should reject check-in from PENDING status', async () => {
      (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);

      const response = await request(app)
        .post(`/api/reservations/${mockReservationId}/check-in`)
        .set('Authorization', authHeader())
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });
  });

  describe('POST /api/reservations/:id/check-out', () => {
    it('should check out and set room to DIRTY', async () => {
      (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CHECKED_IN,
      });
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      const roomUpdate = jest.fn();
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          room: { update: roomUpdate },
          reservation: {
            update: jest.fn().mockResolvedValue({
              ...mockReservation,
              status: ReservationStatus.CHECKED_OUT,
              room: { ...mockReservation.room, status: RoomStatus.DIRTY },
            }),
          },
        }),
      );

      const response = await request(app)
        .post(`/api/reservations/${mockReservationId}/check-out`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data.status).toBe('CHECKED_OUT');
      expect(roomUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: RoomStatus.DIRTY },
        }),
      );
    });
  });
});
