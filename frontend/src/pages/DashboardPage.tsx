import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/PageHeader';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.name ?? user?.email ?? 'User';

  return (
    <section>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={`${user?.roleName?.replace(/_/g, ' ')} · ${user?.email}`}
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Role</h2>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {user?.roleName?.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Permissions</h2>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {user?.permissions.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Status</h2>
          <p className="mt-2 text-2xl font-semibold text-green-600">Active</p>
        </div>
      </div>
    </section>
  );
}
