import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';
import { parseSearchQuery as parseGlobalSearch } from '../../search/search.validators';

jest.mock('../../../config/database', () => ({
  prisma: {
    guest: { findMany: jest.fn() },
    reservation: { findMany: jest.fn() },
    room: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    maintenanceRequest: { findMany: jest.fn() },
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

describe('Search edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.maintenanceRequest.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('rejects empty search query', async () => {
    const res = await request(app)
      .get('/api/search?q=')
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('respects custom limit parameter', async () => {
    await request(app)
      .get('/api/search?q=john&limit=5')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it('caps search limit at 25', () => {
    const result = parseGlobalSearch({ q: 'test', limit: '100' });
    expect(result.limit).toBe(25);
  });

  it('omits guests when user lacks guests.read', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.ROOMS_READ],
    });

    const res = await request(app)
      .get('/api/search?q=101')
      .set('Authorization', auth());
    expect(res.body.data.guests).toEqual([]);
    expect(mockPrisma.guest.findMany).not.toHaveBeenCalled();
  });

  it('searches invoices when user has billing.read', async () => {
    const res = await request(app)
      .get('/api/search?q=inv-123')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(mockPrisma.invoice.findMany).toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/search?q=test');
    expect(res.status).toBe(401);
  });

  it('searches maintenance by title', async () => {
    await request(app)
      .get('/api/search?q=leak')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });

  it('parseSearchQuery trims whitespace', () => {
    const result = parseGlobalSearch({ q: '  john  ' });
    expect(result.q).toBe('john');
  });
});
