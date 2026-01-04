import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/features/auth';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HotelsPage } from '@/pages/HotelsPage';
import { RoomsPage } from '@/pages/RoomsPage';

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
        ],
      },
    ],
  },
]);
