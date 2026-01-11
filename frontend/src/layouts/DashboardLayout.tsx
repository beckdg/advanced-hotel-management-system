import { Link, Outlet } from 'react-router-dom';
import { ProtectedNavigation } from '@/components/ProtectedNavigation';
import { LogoutButton } from '@/features/auth';
import { useAuthStore } from '@/store/authStore';

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-sm font-medium text-slate-900">{user?.name ?? user?.email}</p>
          <p className="text-xs text-slate-500">{user?.roleName?.replace(/_/g, ' ')}</p>
        </div>
        <ProtectedNavigation />
        <div className="border-t border-slate-200 p-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="text-sm font-semibold text-slate-900">
              StayFlow
            </Link>
            <LogoutButton />
          </div>
          <div className="mt-2">
            <ProtectedNavigation variant="horizontal" />
          </div>
        </div>

        <div className="flex-1 bg-slate-50 p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
