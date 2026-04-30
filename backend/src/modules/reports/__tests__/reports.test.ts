import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockHotelId } from '../../../test/helpers';
import { getOccupancyReport, getRevenueReport, getOperationsReport } from '../reports.service';

jest.mock('../../../config/database', () => ({
  prisma: {
    room: { count: jest.fn() },
    invoice: { count: jest.fn(), aggregate: jest.fn() },
    maintenanceRequest: { count: jest.fn() },
    housekeepingTask: { count: jest.fn() },
    reservation: { count: jest.fn() },
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

describe('Reports', () => {
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

  describe('Report calculations', () => {
    it('should calculate occupancy rate', async () => {
      (mockPrisma.room.count as jest.Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(3);

      const report = await getOccupancyReport({ hotelId: mockHotelId });

      expect(report.totalRooms).toBe(10);
      expect(report.occupiedRooms).toBe(6);
      expect(report.availableRooms).toBe(3);
      expect(report.occupancyRate).toBe(60);
    });

    it('should calculate revenue metrics', async () => {
      (mockPrisma.invoice.count as jest.Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      (mockPrisma.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { totalAmount: 2500 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 400 } })
        .mockResolvedValueOnce({ _avg: { totalAmount: 500 }, _count: 7 });

      const report = await getRevenueReport({});

      expect(report.totalRevenue).toBe(2500);
      expect(report.outstandingRevenue).toBe(400);
      expect(report.paidInvoices).toBe(5);
      expect(report.unpaidInvoices).toBe(2);
      expect(report.averageInvoiceValue).toBe(500);
    });

    it('should calculate operations metrics', async () => {
      (mockPrisma.maintenanceRequest.count as jest.Mock).mockResolvedValue(3);
      (mockPrisma.housekeepingTask.count as jest.Mock).mockResolvedValue(4);
      (mockPrisma.reservation.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const report = await getOperationsReport({});

      expect(report.openMaintenance).toBe(3);
      expect(report.activeHousekeeping).toBe(4);
      expect(report.reservationsToday).toBe(2);
      expect(report.checkoutsToday).toBe(1);
    });
  });

  describe('Reports API', () => {
    it('should return occupancy report', async () => {
      (mockPrisma.room.count as jest.Mock)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);

      const response = await request(app)
        .get(`/api/reports/occupancy?hotelId=${mockHotelId}`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data.occupancyRate).toBe(50);
    });

    it('should return revenue report with date filters', async () => {
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 0 },
        _avg: { totalAmount: 0 },
        _count: 0,
      });

      const response = await request(app)
        .get('/api/reports/revenue?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data).toHaveProperty('totalRevenue');
    });
  });
});
