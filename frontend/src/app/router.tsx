import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/features/auth';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HotelsPage } from '@/pages/HotelsPage';
import { RoomsPage } from '@/pages/RoomsPage';
import { GuestsPage } from '@/pages/GuestsPage';
import { ReservationsPage } from '@/pages/ReservationsPage';
import { HousekeepingPage } from '@/pages/HousekeepingPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { BillingPage } from '@/pages/BillingPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { SearchPage } from '@/pages/SearchPage';
import { ExportsPage } from '@/pages/ExportsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'hotels',
            element: <HotelsPage />,
          },
          {
            path: 'rooms',
            element: <RoomsPage />,
          },
          {
            path: 'guests',
            element: <GuestsPage />,
          },
          {
            path: 'reservations',
            element: <ReservationsPage />,
          },
          {
            path: 'housekeeping',
            element: <HousekeepingPage />,
          },
          {
            path: 'maintenance',
            element: <MaintenancePage />,
          },
          {
            path: 'billing',
            element: <BillingPage />,
          },
          {
            path: 'invoices',
            element: <InvoicesPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'audit-logs',
            element: <AuditLogsPage />,
          },
          {
            path: 'search',
            element: <SearchPage />,
          },
          {
            path: 'exports',
            element: <ExportsPage />,
          },
        ],
      },
    ],
  },
]);
