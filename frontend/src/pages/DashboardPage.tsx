import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/PageHeader';
import { apiClient } from '@/services/api';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.name ?? user?.email ?? 'User';

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiClient.getDashboardMetrics(),
  });

  const metrics = metricsData?.data;

  return (
    <section>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={`${user?.roleName?.replace(/_/g, ' ')} · ${user?.email}`}
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Total Rooms</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {isLoading ? '—' : metrics?.totalRooms ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Active Reservations</h2>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {isLoading ? '—' : metrics?.activeReservations ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Confirmed + Checked In</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Occupied Rooms</h2>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {isLoading ? '—' : metrics?.occupiedRooms ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Your Role</h2>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {user?.roleName?.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Permissions</h2>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {user?.permissions.length ?? 0}
          </p>
        </div>
      </div>
    </section>
  );
}
