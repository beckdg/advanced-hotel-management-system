import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser } from '../../../test/helpers';
import { PERMISSIONS, ROLES } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    hotel: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    guest: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    room: { findMany: jest.fn(), count: jest.fn() },
    reservation: { findMany: jest.fn(), count: jest.fn() },
    invoice: { findMany: jest.fn(), count: jest.fn() },
    auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
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

function tokenFor(user: typeof mockAuthUser) {
  return `Bearer ${signAccessToken({
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
  })}`;
}

describe('Permission edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.hotel.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.hotel.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.guest.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.guest.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.room.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.room.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.reservation.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);
  });

  it('denies hotels.read without permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.GUESTS_READ],
    });
    const res = await request(app)
      .get('/api/hotels')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });

  it('denies guests.write without permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.GUESTS_READ],
    });
    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', tokenFor(mockAuthUser))
      .send({ firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(403);
  });

  it('denies reservations.write without permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .post('/api/reservations/bulk-cancel')
      .set('Authorization', tokenFor(mockAuthUser))
      .send({ reservationIds: ['id-1'] });
    expect(res.status).toBe(403);
  });

  it('denies billing.read without permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });

  it('denies audit.read without permission', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });

  it('denies exports without billing.read', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .get('/api/exports/invoices?format=json')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });

  it('allows admin all read endpoints', async () => {
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);

    const endpoints = ['/api/hotels', '/api/guests', '/api/rooms', '/api/reservations'];
    for (const path of endpoints) {
      const res = await request(app)
        .get(path)
        .set('Authorization', tokenFor(mockAdminUser));
      expect(res.status).toBe(200);
    }
  });

  it('denies unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/guests');
    expect(res.status).toBe(401);
  });

  it('housekeeping role cannot access billing', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      roleName: ROLES.HOUSEKEEPING,
      permissions: [PERMISSIONS.HOUSEKEEPING_READ, PERMISSIONS.ROOMS_READ],
    });
    const res = await request(app)
      .get('/api/payments')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });

  it('finance role cannot write reservations', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      roleName: ROLES.FINANCE,
      permissions: [PERMISSIONS.BILLING_READ, PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', tokenFor(mockAuthUser))
      .send({});
    expect(res.status).toBe(403);
  });

  it('maintenance role cannot access audit logs', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      roleName: ROLES.MAINTENANCE,
      permissions: [PERMISSIONS.MAINTENANCE_READ, PERMISSIONS.MAINTENANCE_WRITE],
    });
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', tokenFor(mockAuthUser));
    expect(res.status).toBe(403);
  });
});
