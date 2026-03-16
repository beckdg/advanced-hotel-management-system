import request from 'supertest';
import { RoomStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockHotelId, mockRoomId } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    room: { findUnique: jest.fn() },
    guest: { findMany: jest.fn() },
    maintenanceRequest: { findFirst: jest.fn() },
    reservation: { create: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
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

describe('Reservation blocking', () => {
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
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([{ id: mockGuestId }]);
  });

  it('should reject reservation when room is OUT_OF_SERVICE', async () => {
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: mockHotelId,
      status: RoomStatus.OUT_OF_SERVICE,
    });

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', authHeader())
      .send({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-05',
        guestIds: [mockGuestId],
      })
      .expect(400);

    expect(response.body.message).toContain('out of service');
  });

  it('should reject reservation when room has active maintenance', async () => {
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: mockHotelId,
      status: RoomStatus.AVAILABLE,
    });
    (mockPrisma.maintenanceRequest.findFirst as jest.Mock).mockResolvedValue({
      id: 'maint-1',
      status: 'OPEN',
    });

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', authHeader())
      .send({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-05',
        guestIds: [mockGuestId],
      })
      .expect(400);

    expect(response.body.message).toContain('active maintenance');
  });
});
