import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser, mockHotel, mockHotelId } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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

describe('Hotels API', () => {
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
  });

  describe('POST /api/hotels', () => {
    it('should create a hotel with hotels.write permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.hotel.create as jest.Mock).mockResolvedValue(mockHotel);

      const response = await request(app)
        .post('/api/hotels')
        .set('Authorization', authHeader(mockAdminUser))
        .send({ name: 'Test Hotel', city: 'Test City' })
        .expect(201);

      expect(response.body.data.name).toBe('Test Hotel');
    });

    it('should deny creation without hotels.write permission', async () => {
      const readOnlyUser = { ...mockAuthUser, permissions: [PERMISSIONS.HOTELS_READ] };
      mockGetAuthUserById.mockResolvedValue(readOnlyUser);

      const response = await request(app)
        .post('/api/hotels')
        .set('Authorization', authHeader(readOnlyUser))
        .send({ name: 'Test Hotel' })
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/hotels', () => {
    it('should list hotels with hotels.read permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.hotel.findMany as jest.Mock).mockResolvedValue([mockHotel]);

      const response = await request(app)
        .get('/api/hotels')
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should return hotel by id', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.hotel.findUnique as jest.Mock).mockResolvedValue(mockHotel);

      const response = await request(app)
        .get(`/api/hotels/${mockHotelId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(response.body.data.id).toBe(mockHotelId);
    });

    it('should return 404 for missing hotel', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.hotel.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/hotels/nonexistent')
        .set('Authorization', authHeader(mockAdminUser))
        .expect(404);

      expect(response.body.message).toBe('Hotel not found');
    });
  });

  describe('PATCH /api/hotels/:id', () => {
    it('should update hotel with hotels.write permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.hotel.findUnique as jest.Mock).mockResolvedValue(mockHotel);
      (mockPrisma.hotel.update as jest.Mock).mockResolvedValue({
        ...mockHotel,
        name: 'Updated Hotel',
      });

      const response = await request(app)
        .patch(`/api/hotels/${mockHotelId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .send({ name: 'Updated Hotel' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Hotel');
    });
  });
});
