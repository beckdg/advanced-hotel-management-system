import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { renderWithProviders } from '@/test/test-utils';
import { useAuthStore } from '@/store/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('redirects unauthenticated users to login', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/dashboard'] },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'a@b.com',
        name: 'User',
        roleId: 'r1',
        roleName: 'FRONT_DESK',
        permissions: [],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/dashboard'] },
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('does not show login when user is authenticated', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'a@b.com',
        name: 'User',
        roleId: 'r1',
        roleName: 'FRONT_DESK',
        permissions: ['guests.read'],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Area</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Area')).toBeInTheDocument();
  });
});
