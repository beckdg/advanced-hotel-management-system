import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import type { Notification } from '@/types/notifications';

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount?: number;
  compact?: boolean;
}

export function NotificationCenter({
  notifications,
  unreadCount = 0,
  compact = false,
}: NotificationCenterProps) {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-slate-500">No recent notifications.</p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            className="text-xs font-medium text-stayflow-600 hover:text-stayflow-800"
          >
            Mark all read
          </button>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`py-3 ${!n.readAt ? 'bg-stayflow-50/50 -mx-2 px-2 rounded-lg' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className={`text-sm text-slate-600 ${compact ? 'line-clamp-1' : ''}`}>
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.readAt && (
                <button
                  type="button"
                  onClick={() => markReadMutation.mutate(n.id)}
                  className="shrink-0 text-xs text-stayflow-600 hover:underline"
                >
                  Read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Link
        to="/notifications"
        className="mt-3 inline-block text-sm font-medium text-stayflow-600 hover:text-stayflow-800"
      >
        View all notifications
      </Link>
    </div>
  );
}
