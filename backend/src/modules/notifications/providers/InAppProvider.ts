import { NotificationChannel } from '@prisma/client';
import { prisma } from '../../../config/database';
import { NotificationPayload, NotificationProvider } from './NotificationProvider';

export class InAppProvider implements NotificationProvider {
  readonly channel = NotificationChannel.IN_APP;

  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        channel: NotificationChannel.IN_APP,
        title: payload.title,
        message: payload.message,
      },
    });
  }
}
