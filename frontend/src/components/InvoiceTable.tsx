import { DataTable } from '@/components/DataTable';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import type { Invoice } from '@/types/billing';

function formatAmount(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `$${num.toFixed(2)}`;
}

function guestName(invoice: Invoice): string {
  const primary = invoice.reservation.guests.find((g) => g.isPrimary)?.guest
    ?? invoice.reservation.guests[0]?.guest;
  return primary ? `${primary.firstName} ${primary.lastName}` : '—';
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onSelect?: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, onSelect }: InvoiceTableProps) {
  const columns = [
    {
      key: 'guest',
      header: 'Guest',
      render: (inv: Invoice) => guestName(inv),
    },
    {
      key: 'room',
      header: 'Room',
      render: (inv: Invoice) => inv.reservation.room.roomNumber,
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: Invoice) => <InvoiceStatusBadge status={inv.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      render: (inv: Invoice) => formatAmount(inv.totalAmount),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (inv: Invoice) => {
        const paid = inv.payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = Number(inv.totalAmount) - paid;
        return balance > 0 ? formatAmount(balance) : '$0.00';
      },
    },
    ...(onSelect
      ? [
          {
            key: 'actions',
            header: '',
            render: (inv: Invoice) => (
              <button
                type="button"
                onClick={() => onSelect(inv)}
                className="text-xs font-medium text-stayflow-600 hover:text-stayflow-800"
              >
                View
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={invoices}
      keyExtractor={(inv) => inv.id}
      emptyMessage="No invoices found"
    />
  );
}
