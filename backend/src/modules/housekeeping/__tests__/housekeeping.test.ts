import request from 'supertest';
import { HousekeepingStatus, RoomStatus } from '@prisma/client';
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

const mockTaskId = 'task-test-id';

const mockTask = {
  id: mockTaskId,
  roomId: mockRoomId,
  assignedToUserId: null,
  status: HousekeepingStatus.DIRTY,
  notes: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  room: {
    id: mockRoomId,
    roomNumber: '101',
    status: RoomStatus.DIRTY,
    hotel: { id: 'hotel-1', name: 'Test Hotel' },
  },
  assignedTo: null,
};

describe('Housekeeping API', () => {
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
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue({ id: mockRoomId });
  });

  it('should create a housekeeping task', async () => {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: jest.fn() },
        housekeepingTask: { create: jest.fn().mockResolvedValue(mockTask) },
      }),
    );

    const response = await request(app)
      .post('/api/housekeeping/tasks')
      .set('Authorization', authHeader())
      .send({ roomId: mockRoomId, notes: 'Deep clean needed' })
      .expect(201);

    expect(response.body.data.status).toBe('DIRTY');
  });

  it('should start cleaning (DIRTY -> CLEANING) and sync room', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue(mockTask);

    const roomUpdate = jest.fn();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: roomUpdate },
        housekeepingTask: {
          update: jest.fn().mockResolvedValue({
            ...mockTask,
            status: HousekeepingStatus.CLEANING,
            room: { ...mockTask.room, status: RoomStatus.CLEANING },
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/start`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('CLEANING');
    expect(roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.CLEANING } }),
    );
  });

  it('should complete task (INSPECTING -> READY) and set room AVAILABLE', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue({
      ...mockTask,
      status: HousekeepingStatus.INSPECTING,
    });

    const roomUpdate = jest.fn();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: roomUpdate },
        housekeepingTask: {
          update: jest.fn().mockResolvedValue({
            ...mockTask,
            status: HousekeepingStatus.READY,
            completedAt: new Date(),
            room: { ...mockTask.room, status: RoomStatus.AVAILABLE },
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/complete`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('READY');
    expect(roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.AVAILABLE } }),
    );
  });

  it('should reject invalid transition on start from CLEANING', async () => {
    (mockPrisma.housekeepingTask.findUnique as jest.Mock).mockResolvedValue({
      ...mockTask,
      status: HousekeepingStatus.CLEANING,
    });

    const response = await request(app)
      .post(`/api/housekeeping/tasks/${mockTaskId}/start`)
      .set('Authorization', authHeader())
      .expect(400);

    expect(response.body.message).toContain('Invalid housekeeping transition');
  });
});
