import { LogoutButton } from '@/features/auth';
import { useAuthStore } from '@/store/authStore';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.name ?? user?.email ?? 'User';

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 text-slate-600">
            {user?.roleName?.replace(/_/g, ' ')} &middot; {user?.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
