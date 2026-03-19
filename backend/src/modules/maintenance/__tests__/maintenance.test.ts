import request from 'supertest';
import { MaintenanceStatus, RoomStatus } from '@prisma/client';
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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../notifications', () => ({
  ...jest.requireActual('../../notifications'),
  notifyMaintenanceAssigned: jest.fn(),
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

const mockRequestId = 'maint-test-id';

const mockRequest = {
  id: mockRequestId,
  roomId: mockRoomId,
  reportedByUserId: mockAdminUser.id,
  assignedToUserId: null,
  title: 'Broken AC',
  description: 'AC not cooling',
  priority: 'HIGH',
  status: MaintenanceStatus.OPEN,
  createdAt: new Date(),
  updatedAt: new Date(),
  room: {
    id: mockRoomId,
    roomNumber: '101',
    status: RoomStatus.OUT_OF_SERVICE,
    hotel: { id: 'hotel-1', name: 'Test Hotel' },
  },
  reportedBy: { id: mockAdminUser.id, name: 'Admin', email: mockAdminUser.email },
  assignedTo: null,
};

describe('Maintenance API', () => {
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
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2', isActive: true });
    (mockPrisma.maintenanceRequest.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('should create maintenance request and set room OUT_OF_SERVICE', async () => {
    const roomUpdate = jest.fn();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: roomUpdate },
        maintenanceRequest: { create: jest.fn().mockResolvedValue(mockRequest) },
      }),
    );

    const response = await request(app)
      .post('/api/maintenance')
      .set('Authorization', authHeader())
      .send({ roomId: mockRoomId, title: 'Broken AC', priority: 'HIGH' })
      .expect(201);

    expect(response.body.data.status).toBe('OPEN');
    expect(roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.OUT_OF_SERVICE } }),
    );
  });

  it('should assign request (OPEN -> ASSIGNED)', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(mockRequest);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        room: { update: jest.fn() },
        maintenanceRequest: {
          update: jest.fn().mockResolvedValue({
            ...mockRequest,
            status: MaintenanceStatus.ASSIGNED,
            assignedToUserId: 'user-2',
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/maintenance/${mockRequestId}/assign`)
      .set('Authorization', authHeader())
      .send({ assignedToUserId: 'user-2' })
      .expect(200);

    expect(response.body.data.status).toBe('ASSIGNED');
  });

  it('should close request and set room AVAILABLE', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue({
      ...mockRequest,
      status: MaintenanceStatus.RESOLVED,
    });

    const roomUpdate = jest.fn();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            ...mockRequest,
            status: MaintenanceStatus.CLOSED,
            room: { ...mockRequest.room, status: RoomStatus.AVAILABLE },
          }),
        },
        room: { update: roomUpdate },
      }),
    );

    const response = await request(app)
      .post(`/api/maintenance/${mockRequestId}/close`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('CLOSED');
    expect(roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.AVAILABLE } }),
    );
  });

  it('should reject invalid transition OPEN -> IN_PROGRESS', async () => {
    (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(mockRequest);

    const response = await request(app)
      .post(`/api/maintenance/${mockRequestId}/start`)
      .set('Authorization', authHeader())
      .expect(400);

    expect(response.body.message).toContain('Invalid maintenance transition');
  });
});
