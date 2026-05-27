import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser } from '../../../test/helpers';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../../../common/pagination';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: { findMany: jest.fn(), count: jest.fn() },
    guest: { findMany: jest.fn(), count: jest.fn() },
    notification: { findMany: jest.fn(), count: jest.fn() },
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
const app = createApp();

function auth() {
  return `Bearer ${signAccessToken({
    sub: mockAdminUser.id,
    email: mockAdminUser.email,
    roleId: mockAdminUser.roleId,
    roleName: mockAdminUser.roleName,
  })}`;
}

describe('Pagination edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.hotel.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.hotel.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.guest.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.notification.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);
  });

  it('defaults page to 1 when invalid', () => {
    const result = parsePaginationQuery({ page: '-1' }, ['createdAt'], 'createdAt');
    expect(result.page).toBe(1);
  });

  it('caps limit at 100', () => {
    const result = parsePaginationQuery({ limit: '500' }, ['createdAt'], 'createdAt');
    expect(result.limit).toBe(100);
  });

  it('defaults limit to 20', () => {
    const result = parsePaginationQuery({}, ['createdAt'], 'createdAt');
    expect(result.limit).toBe(20);
  });

  it('defaults sortOrder to asc', () => {
    const result = parsePaginationQuery({}, ['createdAt'], 'createdAt');
    expect(result.sortOrder).toBe('asc');
  });

  it('buildPaginationMeta returns 0 totalPages for empty', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('calculates skip correctly for page 3', async () => {
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.guest.count as jest.Mock).mockResolvedValue(100);

    await request(app)
      .get('/api/guests?page=3&limit=10')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('rejects invalid guest sort field', async () => {
    const res = await request(app)
      .get('/api/guests?sortBy=password')
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('sorts notifications by readAt', async () => {
    await request(app)
      .get('/api/notifications?sortBy=readAt&sortOrder=desc')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { readAt: 'desc' } }),
    );
  });

  it('sorts audit logs by action', async () => {
    await request(app)
      .get('/api/audit-logs?sortBy=action&sortOrder=asc')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { action: 'asc' } }),
    );
  });

  it('returns last page with partial results', async () => {
    (mockPrisma.hotel.findMany as jest.Mock).mockResolvedValue([{ id: '1' }]);
    (mockPrisma.hotel.count as jest.Mock).mockResolvedValue(21);

    const res = await request(app)
      .get('/api/hotels?page=3&limit=10')
      .set('Authorization', auth());
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.data).toHaveLength(1);
  });
});
