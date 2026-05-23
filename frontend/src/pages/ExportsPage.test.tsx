import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportsPage } from './ExportsPage';
import { renderWithProviders } from '@/test/test-utils';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/services/api', () => ({
  apiClient: { downloadExport: vi.fn().mockResolvedValue(undefined) },
}));

import { apiClient } from '@/services/api';

describe('ExportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'admin@stayflow.com',
        name: 'Admin',
        roleId: 'r1',
        roleName: 'SUPER_ADMIN',
        permissions: ['reservations.read', 'billing.read', 'audit.read'],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );
  });

  it('renders export cards for permitted resources', () => {
    renderWithProviders(<ExportsPage />);
    expect(screen.getByText('Reservations')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('allows format selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportsPage />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'json');
    expect(select).toHaveValue('json');
  });

  it('triggers download on button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportsPage />);
    const buttons = screen.getAllByRole('button', { name: /download csv/i });
    await user.click(buttons[0]);
    expect(apiClient.downloadExport).toHaveBeenCalledWith('reservations', 'csv');
  });

  it('shows message when user has no export permissions', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'limited@test.com',
        name: 'Limited',
        roleId: 'r1',
        roleName: 'GUEST',
        permissions: [],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );
    renderWithProviders(<ExportsPage />);
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
