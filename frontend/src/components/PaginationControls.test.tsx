import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginationControls } from './PaginationControls';
import { renderWithProviders } from '@/test/test-utils';

describe('PaginationControls', () => {
  it('renders nothing for single page', () => {
    const { container } = renderWithProviders(
      <PaginationControls
        pagination={{ page: 1, limit: 20, total: 5, totalPages: 1 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows page info', () => {
    renderWithProviders(
      <PaginationControls
        pagination={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/25 total/i)).toBeInTheDocument();
  });

  it('disables previous on first page', () => {
    renderWithProviders(
      <PaginationControls
        pagination={{ page: 1, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables next on last page', () => {
    renderWithProviders(
      <PaginationControls
        pagination={{ page: 3, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange when next clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithProviders(
      <PaginationControls
        pagination={{ page: 1, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when previous clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithProviders(
      <PaginationControls
        pagination={{ page: 2, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
