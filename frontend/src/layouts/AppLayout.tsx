import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-stayflow-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <span className="text-lg font-semibold text-slate-900">StayFlow</span>
            </Link>
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-medium text-stayflow-600 hover:text-stayflow-700"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} StayFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
