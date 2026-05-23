import request from 'supertest';
import { HousekeepingStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser, mockRoomId } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    room: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    housekeepingTask: {
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
const mockTaskId = 'hk-edge-1';

function auth() {
  return `Bearer ${signAccessToken({
    sub: mockAdminUser.id,
    email: mockAdminUser.email,
    roleId: mockAdminUser.roleId,
    roleName: mockAdminUser.roleName,
  })}`;
}

const baseTask = {
  id: mockTaskId,
  roomId: mockRoomId,
  assignedToUserId: null,
  status: HousekeepingStatus.DIRTY,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  room: {
    id: mockRoomId,
    roomNumber: '101',
    status: 'DIRTY',
    hotel: { id: 'h1', name: 'Hotel' },
  },
  assignedTo: null,
};

describe('Housekeeping edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: mockRoomId,
      hotelId: 'h1',
      status: 'DIRTY',
    });
  });

  it('rejects create without roomId', async () => {
    const res = await request(app)
      .post('/api/housekeeping/tasks')
      .set('Authorization', auth())
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects create for unknown room', async () => {
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/housekeeping/tasks')
      .set('Authorization', auth())
      .send({ roomId: mockRoomId });
    expect(res.status).toBe(404);
  });

  it('rejects inspect from DIRTY status', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue(baseTask);

    const res = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/inspect`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('rejects complete from DIRTY status', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue(baseTask);

    const res = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/complete`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown task', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/housekeeping/tasks/unknown`)
      .set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  it('paginates housekeeping tasks', async () => {
    (mockPrisma.housekeepingTask.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.housekeepingTask.count as jest.Mock).mockResolvedValue(15);

    const res = await request(app)
      .get('/api/housekeeping/tasks?page=2&limit=5')
      .set('Authorization', auth());
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('rejects invalid sort field for housekeeping', async () => {
    const res = await request(app)
      .get('/api/housekeeping/tasks?sortBy=invalid')
      .set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SORT_FIELD');
  });

  it('rejects start from READY status', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue({
      ...baseTask,
      status: HousekeepingStatus.READY,
    });

    const res = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/start`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});
