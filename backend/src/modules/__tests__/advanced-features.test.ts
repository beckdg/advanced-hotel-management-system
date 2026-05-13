import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../common/utils/jwt';
import {
  mockAdminUser,
  mockHotel,
  mockRoom,
  mockRoomId,
  mockReservationId,
} from '../../test/helpers';
import { parsePaginationQuery } from '../../common/pagination';
import { AppError } from '../../common/errors';
import { rateLimiter, resetRateLimiterStore } from '../../common/middleware/rateLimiter';
import { Request, Response } from 'express';

jest.mock('../../config/database', () => ({
  prisma: {
    hotel: { findMany: jest.fn(), count: jest.fn() },
    guest: { findMany: jest.fn() },
    reservation: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    room: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    invoice: { findMany: jest.fn() },
    maintenanceRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { findMany: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../rbac/rbac.service', () => ({
  getAuthUserById: jest.fn(),
  mapUserToAuthUser: jest.requireActual('../rbac/rbac.service').mapUserToAuthUser,
  userHasPermission: jest.requireActual('../rbac/rbac.service').userHasPermission,
}));

jest.mock('../rooms/rooms.service', () => ({
  ...jest.requireActual('../rooms/rooms.service'),
  bulkUpdateRoomStatus: jest.fn(),
}));

jest.mock('../reservations/reservations.service', () => ({
  ...jest.requireActual('../reservations/reservations.service'),
  bulkCancelReservations: jest.fn(),
}));

jest.mock('../maintenance/maintenance.service', () => ({
  ...jest.requireActual('../maintenance/maintenance.service'),
  bulkAssignMaintenanceRequests: jest.fn(),
}));

import { prisma } from '../../config/database';
import { getAuthUserById } from '../rbac/rbac.service';
import { bulkUpdateRoomStatus } from '../rooms/rooms.service';
import { bulkCancelReservations } from '../reservations/reservations.service';
import { bulkAssignMaintenanceRequests } from '../maintenance/maintenance.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUserById = getAuthUserById as jest.MockedFunction<typeof getAuthUserById>;
const mockBulkUpdateRoomStatus = bulkUpdateRoomStatus as jest.MockedFunction<
  typeof bulkUpdateRoomStatus
>;
const mockBulkCancelReservations = bulkCancelReservations as jest.MockedFunction<
  typeof bulkCancelReservations
>;
const mockBulkAssignMaintenanceRequests = bulkAssignMaintenanceRequests as jest.MockedFunction<
  typeof bulkAssignMaintenanceRequests
>;

describe('Advanced API Features', () => {
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
    resetRateLimiterStore();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  describe('Pagination', () => {
    it('should return paginated hotel list', async () => {
      (mockPrisma.hotel.findMany as jest.Mock).mockResolvedValue([mockHotel]);
      (mockPrisma.hotel.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/hotels?page=1&limit=10')
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should reject invalid sortBy field', async () => {
      const response = await request(app)
        .get('/api/hotels?sortBy=invalidField')
        .set('Authorization', authHeader())
        .expect(400);

      expect(response.body.code).toBe('INVALID_SORT_FIELD');
    });
  });

  describe('Sorting', () => {
    it('should pass sort order to prisma for rooms', async () => {
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([mockRoom]);
      (mockPrisma.room.count as jest.Mock).mockResolvedValue(1);

      await request(app)
        .get('/api/rooms?sortBy=roomNumber&sortOrder=desc')
        .set('Authorization', authHeader())
        .expect(200);

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { roomNumber: 'desc' },
        }),
      );
    });
  });

  describe('Global Search', () => {
    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', authHeader())
        .expect(400);

      expect(response.body.code).toBe('SEARCH_QUERY_REQUIRED');
    });

    it('should search across entities', async () => {
      (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([mockRoom]);
      (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.maintenanceRequest.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/search?q=101')
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.data.rooms).toHaveLength(1);
      expect(response.body.data.guests).toEqual([]);
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update room status', async () => {
      mockBulkUpdateRoomStatus.mockResolvedValue([mockRoom] as never);

      const response = await request(app)
        .post('/api/rooms/bulk-status')
        .set('Authorization', authHeader())
        .send({ roomIds: [mockRoomId], status: 'AVAILABLE' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockBulkUpdateRoomStatus).toHaveBeenCalled();
    });

    it('should bulk cancel reservations', async () => {
      mockBulkCancelReservations.mockResolvedValue([
        { id: mockReservationId, status: 'CANCELLED' },
      ] as never);

      const response = await request(app)
        .post('/api/reservations/bulk-cancel')
        .set('Authorization', authHeader())
        .send({ reservationIds: [mockReservationId] })
        .expect(200);

      expect(response.body.data[0].status).toBe('CANCELLED');
    });

    it('should bulk assign maintenance requests', async () => {
      mockBulkAssignMaintenanceRequests.mockResolvedValue([
        { id: 'maint-1', assignedToUserId: mockAdminUser.id },
      ] as never);

      const response = await request(app)
        .post('/api/maintenance/bulk-assign')
        .set('Authorization', authHeader())
        .send({ requestIds: ['maint-1'], assignedToUserId: mockAdminUser.id })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Exports', () => {
    it('should export reservations as json', async () => {
      (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/exports/reservations?format=json')
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual([]);
    });

    it('should export reservations as csv', async () => {
      (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/exports/reservations?format=csv')
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.text).toContain('id,hotel,roomNumber');
    });

    it('should reject invalid export format', async () => {
      const response = await request(app)
        .get('/api/exports/invoices?format=xml')
        .set('Authorization', authHeader())
        .expect(400);

      expect(response.body.code).toBe('INVALID_EXPORT_FORMAT');
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests after limit exceeded', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as Request;
      const res = {} as Response;
      const next = jest.fn();

      for (let i = 0; i < 100; i++) {
        rateLimiter(req, res, next);
      }
      expect(next).toHaveBeenCalledTimes(100);

      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(101);
      const error = next.mock.calls[100][0] as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Validation', () => {
    it('parsePaginationQuery should validate sort fields', () => {
      expect(() =>
        parsePaginationQuery({ sortBy: 'bad' }, ['createdAt'], 'createdAt'),
      ).toThrow(AppError);
    });

    it('parsePaginationQuery should apply defaults', () => {
      const result = parsePaginationQuery({}, ['createdAt'], 'createdAt');
      expect(result).toEqual({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
    });
  });
});
