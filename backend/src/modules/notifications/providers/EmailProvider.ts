import { NotificationChannel } from '@prisma/client';
import { NotificationPayload, NotificationProvider } from './NotificationProvider';

export class EmailProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  async send(payload: NotificationPayload): Promise<void> {
    // Mock email provider — logs delivery for development/testing
    console.info(
      `[EmailProvider] Sent to user ${payload.userId}: ${payload.title} — ${payload.message}`,
    );
  }
}
