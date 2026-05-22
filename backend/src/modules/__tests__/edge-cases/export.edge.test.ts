import request from 'supertest';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockAuthUser } from '../../../test/helpers';
import { PERMISSIONS } from '../../rbac';
import { parseExportFormat } from '../../exports/exports.validators';
import { reservationsToCsv, auditLogsToCsv } from '../../exports/exports.service';

jest.mock('../../../config/database', () => ({
  prisma: {
    reservation: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
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

describe('Export edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('defaults export format to json', () => {
    expect(parseExportFormat({})).toBe('json');
  });

  it('exports audit logs as csv', async () => {
    const res = await request(app)
      .get('/api/exports/audit-logs?format=csv')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('denies audit export without audit.read', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.RESERVATIONS_READ],
    });
    const res = await request(app)
      .get('/api/exports/audit-logs?format=json')
      .set('Authorization', auth());
    expect(res.status).toBe(403);
  });

  it('denies reservation export without reservations.read', async () => {
    mockGetAuthUserById.mockResolvedValue({
      ...mockAuthUser,
      permissions: [PERMISSIONS.GUESTS_READ],
    });
    const res = await request(app)
      .get('/api/exports/reservations?format=json')
      .set('Authorization', auth());
    expect(res.status).toBe(403);
  });

  it('reservationsToCsv handles empty list', () => {
    const csv = reservationsToCsv([]);
    expect(csv).toContain('id,hotel,roomNumber');
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('auditLogsToCsv escapes commas in values', () => {
    const csv = auditLogsToCsv([
      {
        id: 'log-1',
        userId: 'u1',
        action: 'test',
        entity: 'Guest',
        entityId: 'g1',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2026-01-01'),
        user: { id: 'u1', name: 'Admin, Jr', email: 'a@b.com' },
      },
    ] as never);
    expect(csv).toContain('"Admin, Jr"');
  });

  it('filters invoices on export', async () => {
    await request(app)
      .get('/api/exports/invoices?format=json&status=PAID')
      .set('Authorization', auth())
      .expect(200);
    expect(mockPrisma.invoice.findMany).toHaveBeenCalled();
  });

  it('requires authentication for exports', async () => {
    const res = await request(app).get('/api/exports/reservations?format=json');
    expect(res.status).toBe(401);
  });
});
