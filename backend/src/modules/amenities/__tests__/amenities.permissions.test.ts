import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    amenity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

describe('Amenities API Permissions', () => {
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

  it('should allow listing amenities with amenities.read', async () => {
    const user = { ...mockAuthUser, permissions: [PERMISSIONS.AMENITIES_READ] };
    mockGetAuthUserById.mockResolvedValue(user);
    (mockPrisma.amenity.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/amenities')
      .set('Authorization', authHeader(user))
      .expect(200);
  });

  it('should deny listing amenities without amenities.read', async () => {
    const user = { ...mockAuthUser, permissions: [PERMISSIONS.USERS_READ] };
    mockGetAuthUserById.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/amenities')
      .set('Authorization', authHeader(user))
      .expect(403);

    expect(response.body.message).toBe('Insufficient permissions');
  });

  it('should allow creating amenities with amenities.write', async () => {
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.amenity.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.amenity.create as jest.Mock).mockResolvedValue({
      id: 'amenity-1',
      name: 'Pool Access',
      description: 'Access to rooftop pool',
    });

    await request(app)
      .post('/api/amenities')
      .set('Authorization', authHeader(mockAdminUser))
      .send({ name: 'Pool Access', description: 'Access to rooftop pool' })
      .expect(201);
  });

  it('should deny creating amenities without amenities.write', async () => {
    const user = { ...mockAuthUser, permissions: [PERMISSIONS.AMENITIES_READ] };
    mockGetAuthUserById.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/amenities')
      .set('Authorization', authHeader(user))
      .send({ name: 'Pool Access' })
      .expect(403);

    expect(response.body.message).toBe('Insufficient permissions');
  });
});
