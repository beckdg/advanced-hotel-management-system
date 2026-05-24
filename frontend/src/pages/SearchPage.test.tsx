import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPage } from './SearchPage';
import { renderWithProviders } from '@/test/test-utils';
import { apiClient } from '@/services/api';

vi.mock('@/services/api', () => ({
  apiClient: { globalSearch: vi.fn() },
}));

const emptyResults = {
  status: 'success' as const,
  data: { guests: [], reservations: [], rooms: [], invoices: [], maintenance: [] },
};

const roomResults = {
  status: 'success' as const,
  data: {
    guests: [],
    reservations: [],
    rooms: [{
      id: 'r1', roomNumber: '101', status: 'AVAILABLE',
      hotel: { id: 'h1', name: 'Grand Hotel' },
      roomType: { id: 'rt1', name: 'Standard' },
    }],
    invoices: [],
    maintenance: [],
  },
};

describe('SearchPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders search input and button', () => {
    renderWithProviders(<SearchPage />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('does not search until form is submitted', () => {
    renderWithProviders(<SearchPage />);
    expect(apiClient.globalSearch).not.toHaveBeenCalled();
  });

  it('calls globalSearch on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.globalSearch).mockResolvedValue(emptyResults);

    renderWithProviders(<SearchPage />);
    await user.type(screen.getByRole('searchbox'), 'john');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(apiClient.globalSearch).toHaveBeenCalledWith('john');
    });
  });

  it('displays room search results', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.globalSearch).mockResolvedValue(roomResults);

    renderWithProviders(<SearchPage />);
    await user.type(screen.getByRole('searchbox'), '101');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText(/room 101/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rooms/i })).toBeInTheDocument();
  });

  it('hides empty result sections', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.globalSearch).mockResolvedValue(emptyResults);

    renderWithProviders(<SearchPage />);
    await user.type(screen.getByRole('searchbox'), 'xyz');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(apiClient.globalSearch).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /^guests$/i })).not.toBeInTheDocument();
  });
});
