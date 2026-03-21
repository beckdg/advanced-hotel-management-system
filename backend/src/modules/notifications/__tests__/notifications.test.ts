import request from 'supertest';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
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

const mockNotificationId = 'notification-test-id';

describe('Notifications API', () => {
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

  it('should list user notifications', async () => {
    (mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        id: mockNotificationId,
        userId: mockAdminUser.id,
        type: NotificationType.RESERVATION_CREATED,
        channel: NotificationChannel.IN_APP,
        title: 'Reservation Created',
        message: 'Test message',
        readAt: null,
        createdAt: new Date(),
      },
    ]);

    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Reservation Created');
  });

  it('should mark notification as read', async () => {
    (mockPrisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: mockNotificationId,
      userId: mockAdminUser.id,
      readAt: null,
    });
    (mockPrisma.notification.update as jest.Mock).mockResolvedValue({
      id: mockNotificationId,
      readAt: new Date(),
    });

    const response = await request(app)
      .post(`/api/notifications/${mockNotificationId}/read`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.readAt).toBeTruthy();
  });

  it('should mark all notifications as read', async () => {
    (mockPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    (mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', authHeader())
      .expect(200);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalled();
  });
});
