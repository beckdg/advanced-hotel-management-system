import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import {
  mockAdminUser,
  mockAuthUser,
  mockHotelId,
  mockFloorId,
  mockRoomTypeId,
  mockRoomId,
  mockRoom,
} from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: { findUnique: jest.fn() },
    floor: { findUnique: jest.fn() },
    roomType: { findUnique: jest.fn() },
    amenity: { findMany: jest.fn() },
    room: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roomAmenity: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
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

describe('Rooms API', () => {
  const app = createApp();

  function authHeader(user: typeof mockAdminUser) {
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
    });
    return `Bearer ${token}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.hotel.findUnique as jest.Mock).mockResolvedValue({ id: mockHotelId });
    (mockPrisma.floor.findUnique as jest.Mock).mockResolvedValue({
      id: mockFloorId,
      hotelId: mockHotelId,
    });
    (mockPrisma.roomType.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomTypeId,
      hotelId: mockHotelId,
    });
    (mockPrisma.amenity.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('POST /api/rooms', () => {
    it('should create a room with rooms.write permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.room.create as jest.Mock).mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', authHeader(mockAdminUser))
        .send({
          hotelId: mockHotelId,
          roomNumber: '101',
          floorId: mockFloorId,
          roomTypeId: mockRoomTypeId,
          status: 'AVAILABLE',
        })
        .expect(201);

      expect(response.body.data.roomNumber).toBe('101');
    });

    it('should deny creation without rooms.write permission', async () => {
      const readOnlyUser = { ...mockAuthUser, permissions: [PERMISSIONS.ROOMS_READ] };
      mockGetAuthUserById.mockResolvedValue(readOnlyUser);

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', authHeader(readOnlyUser))
        .send({
          hotelId: mockHotelId,
          roomNumber: '101',
          floorId: mockFloorId,
          roomTypeId: mockRoomTypeId,
        })
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/rooms', () => {
    it('should list all rooms', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([mockRoom]);
      (mockPrisma.room.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should filter rooms by hotelId', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([mockRoom]);
      (mockPrisma.room.count as jest.Mock).mockResolvedValue(1);

      await request(app)
        .get(`/api/rooms?hotelId=${mockHotelId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hotelId: mockHotelId }),
        }),
      );
    });

    it('should filter rooms by status', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([mockRoom]);
      (mockPrisma.room.count as jest.Mock).mockResolvedValue(1);

      await request(app)
        .get('/api/rooms?status=AVAILABLE')
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'AVAILABLE' }),
        }),
      );
    });

    it('should filter rooms by roomTypeId and floorId', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.room.count as jest.Mock).mockResolvedValue(0);

      await request(app)
        .get(`/api/rooms?roomTypeId=${mockRoomTypeId}&floorId=${mockFloorId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roomTypeId: mockRoomTypeId,
            floorId: mockFloorId,
          }),
        }),
      );
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('should return room by id', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);

      const response = await request(app)
        .get(`/api/rooms/${mockRoomId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(response.body.data.id).toBe(mockRoomId);
    });
  });

  describe('PATCH /api/rooms/:id', () => {
    it('should update room status', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
        id: mockRoomId,
        hotelId: mockHotelId,
        floorId: mockFloorId,
        roomTypeId: mockRoomTypeId,
        roomNumber: '101',
      });
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          roomAmenity: { deleteMany: jest.fn(), createMany: jest.fn() },
          room: {
            update: jest.fn().mockResolvedValue({ ...mockRoom, status: 'DIRTY' }),
          },
        }),
      );

      const response = await request(app)
        .patch(`/api/rooms/${mockRoomId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .send({ status: 'DIRTY' })
        .expect(200);

      expect(response.body.data.status).toBe('DIRTY');
    });
  });
});
