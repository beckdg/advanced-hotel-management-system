import { Request, Response } from 'express';
import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  const notifications = await listUserNotifications(req.user!.id);
  res.status(200).json({ status: 'success', data: notifications });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const notification = await markNotificationRead(req.params.id, req.user!.id);
  res.status(200).json({ status: 'success', data: notification });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const notifications = await markAllNotificationsRead(req.user!.id);
  res.status(200).json({ status: 'success', data: notifications });
}
