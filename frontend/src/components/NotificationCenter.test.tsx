import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from './NotificationCenter';
import { renderWithProviders } from '@/test/test-utils';
import { apiClient } from '@/services/api';

vi.mock('@/services/api', () => ({
  apiClient: {
    markNotificationRead: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    markAllNotificationsRead: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  },
}));

const notifications = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'RESERVATION_CREATED' as const,
    channel: 'IN_APP' as const,
    title: 'New Reservation',
    message: 'Reservation #123 created',
    readAt: null,
    createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'PAYMENT_RECEIVED' as const,
    channel: 'IN_APP' as const,
    title: 'Payment Received',
    message: 'Payment of $200 received',
    readAt: '2026-06-01T11:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
  },
];

describe('NotificationCenter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows empty state when no notifications', () => {
    renderWithProviders(<NotificationCenter notifications={[]} />);
    expect(screen.getByText(/no recent notifications/i)).toBeInTheDocument();
  });

  it('renders notification titles and messages', () => {
    renderWithProviders(<NotificationCenter notifications={notifications} unreadCount={1} />);
    expect(screen.getByText('New Reservation')).toBeInTheDocument();
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
  });

  it('shows unread count', () => {
    renderWithProviders(<NotificationCenter notifications={notifications} unreadCount={1} />);
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });

  it('shows all caught up when no unread', () => {
    renderWithProviders(<NotificationCenter notifications={notifications} unreadCount={0} />);
    expect(screen.getByText('All caught up')).toBeInTheDocument();
  });

  it('marks single notification as read', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter notifications={notifications} unreadCount={1} />);
    const readButtons = screen.getAllByRole('button').filter((b) => b.textContent === 'Read');
    await user.click(readButtons[0]);
    expect(apiClient.markNotificationRead).toHaveBeenCalledWith('n1');
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter notifications={notifications} unreadCount={2} />);
    await user.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(apiClient.markAllNotificationsRead).toHaveBeenCalled();
  });
});
