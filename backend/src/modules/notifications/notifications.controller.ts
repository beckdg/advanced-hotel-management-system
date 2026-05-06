import { Request, Response } from 'express';
import { parsePaginationQuery } from '../../common/pagination';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';
import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  bulkMarkNotificationsRead,
  NOTIFICATION_SORT_FIELDS,
} from './notifications.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    [...NOTIFICATION_SORT_FIELDS],
    'createdAt',
  );
  const result = await listUserNotifications(req.user!.id, pagination);
  res.status(200).json({ status: 'success', ...result });
}

export async function bulkRead(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  if (!Array.isArray(body.notificationIds) || body.notificationIds.length === 0) {
    throw new AppError('notificationIds must be a non-empty array', HTTP_STATUS.BAD_REQUEST);
  }
  const notificationIds = body.notificationIds.filter((id) => isNonEmptyString(id)) as string[];
  const notifications = await bulkMarkNotificationsRead(req.user!.id, notificationIds);
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
