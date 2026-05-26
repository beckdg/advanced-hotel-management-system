import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceDetails } from './InvoiceDetails';
import { renderWithProviders } from '@/test/test-utils';
import type { Invoice } from '@/types/billing';

const draftInvoice: Invoice = {
  id: 'inv-1',
  reservationId: 'res-1',
  status: 'DRAFT',
  subtotal: 400,
  taxAmount: 40,
  discountAmount: 0,
  totalAmount: 440,
  issuedAt: null,
  paidAt: null,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  items: [{
    id: 'item-1', invoiceId: 'inv-1', description: 'Room charge', quantity: 4,
    unitPrice: 100, totalPrice: 400, category: 'ROOM', createdAt: '', updatedAt: '',
  }],
  payments: [],
  reservation: {
    id: 'res-1',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-05',
    status: 'CONFIRMED',
    hotel: { id: 'h1', name: 'Grand Hotel' },
    room: { id: 'r1', roomNumber: '101', roomType: { id: 'rt1', name: 'Standard', baseRate: 100 } },
    guests: [{
      isPrimary: true,
      guest: { id: 'g1', firstName: 'John', lastName: 'Doe', email: 'j@d.com' },
    }],
  },
};

const issuedInvoice: Invoice = { ...draftInvoice, status: 'ISSUED', issuedAt: '2026-06-02T00:00:00Z' };

describe('InvoiceDetails workflow', () => {
  it('renders invoice totals and guest info', () => {
    renderWithProviders(<InvoiceDetails invoice={draftInvoice} />);
    expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getAllByText('$440.00').length).toBeGreaterThan(0);
  });

  it('shows issue button for draft invoice when canWrite', () => {
    renderWithProviders(<InvoiceDetails invoice={draftInvoice} canWrite onIssue={vi.fn()} />);
    expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
  });

  it('calls onIssue when issue clicked', async () => {
    const user = userEvent.setup();
    const onIssue = vi.fn();
    renderWithProviders(<InvoiceDetails invoice={draftInvoice} canWrite onIssue={onIssue} />);
    await user.click(screen.getByRole('button', { name: /issue invoice/i }));
    expect(onIssue).toHaveBeenCalled();
  });

  it('shows record payment for issued invoice', () => {
    renderWithProviders(
      <InvoiceDetails invoice={issuedInvoice} canWrite onRecordPayment={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
  });

  it('hides action buttons without canWrite', () => {
    renderWithProviders(<InvoiceDetails invoice={draftInvoice} />);
    expect(screen.queryByRole('button', { name: /issue invoice/i })).not.toBeInTheDocument();
  });

  it('shows balance due for partially paid invoice', () => {
    const partial: Invoice = {
      ...issuedInvoice,
      status: 'PARTIALLY_PAID',
      payments: [{
        id: 'p1', invoiceId: 'inv-1', amount: 200, method: 'CASH', status: 'COMPLETED',
        transactionReference: null, processedAt: '2026-06-03', createdAt: '', updatedAt: '',
      }],
    };
    renderWithProviders(<InvoiceDetails invoice={partial} />);
    expect(screen.getByText('$240.00')).toBeInTheDocument();
  });

  it('disables buttons when processing', () => {
    renderWithProviders(
      <InvoiceDetails invoice={draftInvoice} canWrite onIssue={vi.fn()} isProcessing />,
    );
    expect(screen.getByRole('button', { name: /issue invoice/i })).toBeDisabled();
  });
});
