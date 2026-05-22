import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReservationForm } from './ReservationForm';
import { renderWithProviders } from '@/test/test-utils';
import { apiClient } from '@/services/api';

vi.mock('@/services/api', () => ({
  apiClient: {
    getHotels: vi.fn(),
    getRooms: vi.fn(),
    getGuests: vi.fn(),
  },
}));

const mockHotels = {
  status: 'success' as const,
  data: [{ id: 'h1', name: 'Grand Hotel', address: '', city: '', country: '', timezone: 'UTC', isActive: true, floors: [], roomTypes: [], createdAt: '', updatedAt: '' }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const mockRooms = {
  status: 'success' as const,
  data: [{
    id: 'r1', hotelId: 'h1', roomNumber: '101', floorId: 'f1', roomTypeId: 'rt1',
    status: 'AVAILABLE' as const, hotel: { id: 'h1', name: 'Grand' },
    floor: { id: 'f1', name: 'First', floorNumber: 1 },
    roomType: { id: 'rt1', name: 'Standard', baseRate: 100, maxOccupancy: 2 },
    amenities: [], createdAt: '', updatedAt: '',
  }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const mockGuests = {
  status: 'success' as const,
  data: [{ id: 'g1', firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: null, createdAt: '', updatedAt: '' }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('ReservationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getHotels).mockResolvedValue(mockHotels);
    vi.mocked(apiClient.getRooms).mockResolvedValue(mockRooms);
    vi.mocked(apiClient.getGuests).mockResolvedValue(mockGuests);
  });

  it('renders form fields after data loads', async () => {
    renderWithProviders(<ReservationForm onSubmit={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Grand Hotel')).toBeInTheDocument());
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create reservation/i })).toBeInTheDocument();
  });

  it('disables submit when no guests selected', async () => {
    renderWithProviders(<ReservationForm onSubmit={vi.fn()} />);
    await waitFor(() => expect(apiClient.getGuests).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /create reservation/i })).toBeDisabled();
  });

  it('displays external error message', () => {
    renderWithProviders(<ReservationForm onSubmit={vi.fn()} error="Room unavailable" />);
    expect(screen.getByText('Room unavailable')).toBeInTheDocument();
  });

  it('loads rooms when hotel is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReservationForm onSubmit={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Grand Hotel')).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'h1');

    await waitFor(() => {
      expect(apiClient.getRooms).toHaveBeenCalledWith({ hotelId: 'h1', status: 'AVAILABLE' });
    });
  });

  it('calls onSubmit when guest selected and form filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ReservationForm onSubmit={onSubmit} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'h1');
    await waitFor(() => expect(selects[1]).not.toBeDisabled());
    await user.selectOptions(selects[1], 'r1');

    const dateFields = document.querySelectorAll('input[type="date"]');
    await user.type(dateFields[0], '2026-09-01');
    await user.type(dateFields[1], '2026-09-05');
    await user.click(screen.getByText('John Doe'));
    await user.click(screen.getByRole('button', { name: /create reservation/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows loading label on submit button', () => {
    renderWithProviders(<ReservationForm onSubmit={vi.fn()} isLoading />);
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });
});
