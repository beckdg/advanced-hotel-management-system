import request from 'supertest';
import { MaintenanceStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockRoomId } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    room: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    maintenanceRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
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
const mockMaintId = 'maint-edge-1';

function auth() {
  return `Bearer ${signAccessToken({
    sub: mockAdminUser.id,
    email: mockAdminUser.email,
    roleId: mockAdminUser.roleId,
    roleName: mockAdminUser.roleName,
  })}`;
}

const baseRequest = {
  id: mockMaintId,
  roomId: mockRoomId,
  reportedByUserId: mockAdminUser.id,
  assignedToUserId: null,
  title: 'Broken AC',
  description: 'Not cooling',
  priority: 'HIGH',
  status: MaintenanceStatus.OPEN,
  createdAt: new Date(),
  updatedAt: new Date(),
  room: {
    id: mockRoomId,
    roomNumber: '101',
    status: 'OUT_OF_SERVICE',
    hotel: { id: 'h1', name: 'Hotel' },
  },
  reportedBy: { id: mockAdminUser.id, name: 'Admin', email: mockAdminUser.email },
  assignedTo: null,
};

describe('Maintenance edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: 'h1',
      status: 'AVAILABLE',
    });
  });

  it('rejects create without title', async () => {
    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', auth())
      .send({ roomId: mockRoomId });
    expect(res.status).toBe(400);
  });

  it('rejects create for unknown room', async () => {
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', auth())
      .send({ roomId: mockRoomId, title: 'Leak' });
    expect(res.status).toBe(404);
  });

  it('rejects bulk assign with empty requestIds', async () => {
    const res = await request(app)
      .post('/api/maintenance/bulk-assign')
      .set('Authorization', auth())
      .send({ requestIds: [], assignedToUserId: mockAdminUser.id });
    expect(res.status).toBe(400);
  });

  it('rejects start from OPEN without assign', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(baseRequest);

    const res = await request(app)
      .post(`/api/maintenance/${mockMaintId}/start`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('rejects close from OPEN status', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(baseRequest);

    const res = await request(app)
      .post(`/api/maintenance/${mockMaintId}/close`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown maintenance request', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/maintenance/unknown`)
      .set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  it('sorts maintenance by priority desc', async () => {
    (mockPrisma.maintenanceRequest.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.maintenanceRequest.count as jest.Mock).mockResolvedValue(0);

    await request(app)
      .get('/api/maintenance?sortBy=priority&sortOrder=desc')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { priority: 'desc' } }),
    );
  });

  it('rejects assign to unknown user', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(baseRequest);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/maintenance/${mockMaintId}/assign`)
      .set('Authorization', auth())
      .send({ assignedToUserId: 'unknown-user' });
    expect(res.status).toBe(400);
  });
});
