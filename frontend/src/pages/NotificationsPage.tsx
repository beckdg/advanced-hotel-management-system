import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { NotificationCenter } from '@/components/NotificationCenter';
import { apiClient } from '@/services/api';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <section>
      <PageHeader
        title="Notifications"
        description="Stay up to date on hotel operations"
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-stayflow-700 disabled:opacity-50"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading notifications…</p>
        ) : (
          <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
        )}
      </div>
    </section>
  );
}
