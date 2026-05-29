import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { renderWithProviders } from '@/test/test-utils';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/services/api', () => ({
  apiClient: { login: vi.fn() },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('renders email and password fields', () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation via required attributes', () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          id: 'u1',
          email: 'admin@stayflow.com',
          name: 'Admin',
          roleId: 'r1',
          roleName: 'SUPER_ADMIN',
          permissions: [],
        },
        accessToken: 'access',
        refreshToken: 'refresh',
      },
    });

    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'admin@stayflow.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(apiClient.login).toHaveBeenCalledWith({
        email: 'admin@stayflow.com',
        password: 'Admin123!',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on failed login', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockRejectedValue(new Error('Invalid credentials'));

    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolveLogin!: (v: unknown) => void;
    vi.mocked(apiClient.login).mockReturnValue(
      new Promise((r) => {
        resolveLogin = r;
      }) as ReturnType<typeof apiClient.login>,
    );

    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    resolveLogin({
      status: 'success',
      data: {
        user: { id: '1', email: 'a@b.com', name: 'A', roleId: 'r', roleName: 'FRONT_DESK', permissions: [] },
        accessToken: 'a',
        refreshToken: 'r',
      },
    });
  });

  it('stores auth in zustand on success', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockResolvedValue({
      status: 'success',
      data: {
        user: {
          id: 'u1',
          email: 'test@stayflow.com',
          name: 'Test',
          roleId: 'r1',
          roleName: 'FRONT_DESK',
          permissions: ['guests.read'],
        },
        accessToken: 'tok',
        refreshToken: 'ref',
      },
    });

    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'test@stayflow.com');
    await user.type(screen.getByLabelText(/password/i), 'Pass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('test@stayflow.com');
    });
  });
});
