import { NotificationChannel } from '@prisma/client';
import { NotificationPayload, NotificationProvider } from './NotificationProvider';

export class SmsProvider implements NotificationProvider {
  readonly channel = NotificationChannel.SMS;

  async send(payload: NotificationPayload): Promise<void> {
    // Mock SMS provider — logs delivery for development/testing
    console.info(
      `[SmsProvider] Sent to user ${payload.userId}: ${payload.title} — ${payload.message}`,
    );
  }
}
