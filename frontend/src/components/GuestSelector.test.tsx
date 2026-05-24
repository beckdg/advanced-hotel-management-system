import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuestSelector } from './GuestSelector';
import { renderWithProviders } from '@/test/test-utils';

const guests = [
  { id: 'g1', firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: null, createdAt: '', updatedAt: '' },
  { id: 'g2', firstName: 'Jane', lastName: 'Smith', email: 'j@s.com', phone: null, createdAt: '', updatedAt: '' },
];

describe('GuestSelector', () => {
  it('shows empty message when no guests', () => {
    renderWithProviders(<GuestSelector guests={[]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/no guests available/i)).toBeInTheDocument();
  });

  it('renders guest names', () => {
    renderWithProviders(<GuestSelector guests={guests} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls onChange when guest toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<GuestSelector guests={guests} selectedIds={[]} onChange={onChange} />);
    await user.click(screen.getByText('John Doe'));
    expect(onChange).toHaveBeenCalledWith(['g1']);
  });

  it('unchecks selected guest', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<GuestSelector guests={guests} selectedIds={['g1']} onChange={onChange} />);
    await user.click(screen.getByText('John Doe'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
