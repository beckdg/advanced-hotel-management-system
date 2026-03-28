import { NotificationChannel, NotificationType } from '@prisma/client';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<void>;
}
