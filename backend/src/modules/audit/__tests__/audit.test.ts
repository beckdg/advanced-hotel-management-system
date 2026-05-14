import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
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

describe('Audit Logs API', () => {
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
  });

  it('should list audit logs with filters', async () => {
    (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(1);
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'log-1',
        userId: mockAdminUser.id,
        action: 'reservations.create',
        entity: 'Reservation',
        entityId: 'res-1',
        createdAt: new Date(),
        user: { id: mockAdminUser.id, name: 'Admin', email: mockAdminUser.email },
      },
    ]);

    const response = await request(app)
      .get('/api/audit-logs?entityType=Reservation&action=reservations.create')
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entity: 'Reservation',
          action: 'reservations.create',
        }),
      }),
    );
  });

  it('should deny without audit.read permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAdminUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });

    await request(app)
      .get('/api/audit-logs')
      .set('Authorization', authHeader())
      .expect(403);
  });
});
