import { NotificationChannel } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { PaginationParams, paginate } from '../../common/pagination';
import {
  EmailProvider,
  InAppProvider,
  NotificationPayload,
  NotificationProvider,
  SmsProvider,
} from './providers';

export const NOTIFICATION_SORT_FIELDS = ['createdAt', 'readAt', 'type'] as const;

const providers: NotificationProvider[] = [
  new InAppProvider(),
  new EmailProvider(),
  new SmsProvider(),
];

async function getOrCreatePreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.notificationPreference.create({
    data: { userId },
  });
}

function isChannelEnabled(
  channel: NotificationChannel,
  prefs: { emailEnabled: boolean; smsEnabled: boolean; inAppEnabled: boolean },
): boolean {
  switch (channel) {
    case NotificationChannel.IN_APP:
      return prefs.inAppEnabled;
    case NotificationChannel.EMAIL:
      return prefs.emailEnabled;
    case NotificationChannel.SMS:
      return prefs.smsEnabled;
    default:
      return false;
  }
}

export async function emitNotification(payload: NotificationPayload): Promise<void> {
  const prefs = await getOrCreatePreferences(payload.userId);

  await Promise.all(
    providers.map(async (provider) => {
      if (isChannelEnabled(provider.channel, prefs)) {
        await provider.send(payload);
      }
    }),
  );
}

export async function listUserNotifications(userId: string, pagination: PaginationParams) {
  const where = { userId, channel: NotificationChannel.IN_APP };
  return paginate({
    pagination,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
    findMany: ({ skip, take, orderBy }) =>
      prisma.notification.findMany({ where, orderBy, skip, take }),
    count: () => prisma.notification.count({ where }),
  });
}

export async function getRecentNotifications(userId: string, limit = 5) {
  return prisma.notification.findMany({
    where: { userId, channel: NotificationChannel.IN_APP },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification || notification.userId !== userId) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  if (notification.readAt) {
    return notification;
  }

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, channel: NotificationChannel.IN_APP },
    data: { readAt: new Date() },
  });

  return prisma.notification.findMany({
    where: { userId, channel: NotificationChannel.IN_APP },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function bulkMarkNotificationsRead(userId: string, notificationIds: string[]) {
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds }, userId },
  });

  if (notifications.length !== notificationIds.length) {
    throw new AppError('One or more notifications not found', HTTP_STATUS.NOT_FOUND, {
      code: 'NOTIFICATIONS_NOT_FOUND',
    });
  }

  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId, readAt: null },
    data: { readAt: new Date() },
  });

  return prisma.notification.findMany({ where: { id: { in: notificationIds } } });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null, channel: NotificationChannel.IN_APP },
  });
}

