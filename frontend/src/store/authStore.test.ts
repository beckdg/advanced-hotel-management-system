import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setAuth stores user and tokens', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'test@stayflow.com',
        name: 'Test',
        roleId: 'r1',
        roleName: 'FRONT_DESK',
        permissions: ['guests.read'],
      },
      { accessToken: 'access', refreshToken: 'refresh' },
    );

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access');
    expect(state.refreshToken).toBe('refresh');
    expect(state.user?.permissions).toContain('guests.read');
  });

  it('logout clears all auth state', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u1',
        email: 'a@b.com',
        name: 'A',
        roleId: 'r1',
        roleName: 'ADMIN',
        permissions: [],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
