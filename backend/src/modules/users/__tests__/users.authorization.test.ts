import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import {
  createMockUserRecord,
  mockAuthUser,
  mockAdminUser,
  mockUserId,
} from '../../../test/helpers';
import { PERMISSIONS, ROLES } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
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

describe('Users API Authorization', () => {
  const app = createApp();
  const mockUser = createMockUserRecord();

  function authHeader(user: typeof mockAuthUser) {
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

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAuthUser);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', authHeader(mockAuthUser))
        .expect(200);

      expect(response.body.data.email).toBe('test@stayflow.com');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/users/me').expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/users', () => {
    it('should allow users with users.read permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAuthUser);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader(mockAuthUser))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should deny users without users.read permission', async () => {
      const noPermUser = {
        ...mockAuthUser,
        permissions: [PERMISSIONS.RESERVATIONS_READ],
      };
      mockGetAuthUserById.mockResolvedValue(noPermUser);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader(noPermUser))
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id for authorized users', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
        role: { name: ROLES.HOTEL_MANAGER, permissions: [] },
      });

      const response = await request(app)
        .get('/api/users/other-user-id')
        .set('Authorization', authHeader(mockAdminUser))
        .expect(200);

      expect(response.body.data.id).toBe('other-user-id');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should allow admin to update any user', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAdminUser);
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: mockUserId })
        .mockResolvedValueOnce(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });

      const response = await request(app)
        .patch(`/api/users/${mockUserId}`)
        .set('Authorization', authHeader(mockAdminUser))
        .send({ name: 'Updated Name', isActive: false })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should allow users to update their own name only', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAuthUser);
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: mockUserId })
        .mockResolvedValueOnce({ ...mockUser, name: 'New Name' });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      });

      const response = await request(app)
        .patch(`/api/users/${mockUserId}`)
        .set('Authorization', authHeader(mockAuthUser))
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.data.name).toBe('New Name');
    });

    it('should deny self-update of restricted fields without permission', async () => {
      mockGetAuthUserById.mockResolvedValue(mockAuthUser);

      const response = await request(app)
        .patch(`/api/users/${mockUserId}`)
        .set('Authorization', authHeader(mockAuthUser))
        .send({ isActive: false })
        .expect(403);

      expect(response.body.message).toBe('You can only update your own name');
    });
  });
});
