import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    room: { count: jest.fn() },
    reservation: { count: jest.fn(), findMany: jest.fn() },
    invoice: { aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    payment: { aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    housekeepingTask: { count: jest.fn() },
    maintenanceRequest: { count: jest.fn() },
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

describe('Reports edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.room.count as jest.Mock).mockResolvedValue(20);
    (mockPrisma.reservation.count as jest.Mock).mockResolvedValue(5);
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: 1000 },
      _avg: { totalAmount: 500 },
      _count: 2,
    });
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 800 } });
    (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.payment.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.housekeepingTask.count as jest.Mock).mockResolvedValue(3);
    (mockPrisma.maintenanceRequest.count as jest.Mock).mockResolvedValue(2);
  });

  it('denies reports without reports.read', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .get('/api/reports/occupancy')
      .set('Authorization', auth());
    expect(res.status).toBe(403);
  });

  it('returns occupancy report', async () => {
    const res = await request(app)
      .get('/api/reports/occupancy')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('occupancyRate');
  });

  it('filters occupancy by hotelId', async () => {
    await request(app)
      .get('/api/reports/occupancy?hotelId=hotel-1')
      .set('Authorization', auth())
      .expect(200);
    expect(mockPrisma.room.count).toHaveBeenCalled();
  });

  it('returns revenue report with date range', async () => {
    const res = await request(app)
      .get('/api/reports/revenue?startDate=2026-01-01&endDate=2026-12-31')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalRevenue');
  });

  it('returns operations report', async () => {
    const res = await request(app)
      .get('/api/reports/operations')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('openMaintenance');
  });

  it('rejects invalid date format in revenue report', async () => {
    const res = await request(app)
      .get('/api/reports/revenue?startDate=not-a-date')
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('handles zero rooms for occupancy rate', async () => {
    (mockPrisma.room.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.reservation.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/reports/occupancy')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.occupancyRate).toBe(0);
  });
});
