import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import type { Invoice } from '@/types/billing';

function formatAmount(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `$${num.toFixed(2)}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

interface InvoiceDetailsProps {
  invoice: Invoice;
  canWrite?: boolean;
  onIssue?: () => void;
  onVoid?: () => void;
  onAddCharge?: () => void;
  onRecordPayment?: () => void;
  isProcessing?: boolean;
}

export function InvoiceDetails({
  invoice,
  canWrite,
  onIssue,
  onVoid,
  onAddCharge,
  onRecordPayment,
  isProcessing,
}: InvoiceDetailsProps) {
  const paidTotal = invoice.payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.totalAmount) - paidTotal;

  const primaryGuest = invoice.reservation.guests.find((g) => g.isPrimary)?.guest
    ?? invoice.reservation.guests[0]?.guest;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Invoice Details</h3>
          <p className="mt-1 text-sm text-slate-500">
            Room {invoice.reservation.room.roomNumber} · {invoice.reservation.hotel.name}
          </p>
          {primaryGuest && (
            <p className="text-sm text-slate-600">
              {primaryGuest.firstName} {primaryGuest.lastName}
            </p>
          )}
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Subtotal</p>
          <p className="text-lg font-semibold">{formatAmount(invoice.subtotal)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Tax</p>
          <p className="text-lg font-semibold">{formatAmount(invoice.taxAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Discount</p>
          <p className="text-lg font-semibold">{formatAmount(invoice.discountAmount)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(invoice.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatAmount(paidTotal)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Balance</p>
          <p className="text-2xl font-bold text-orange-600">{formatAmount(Math.max(balance, 0))}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        <span>Issued: {formatDate(invoice.issuedAt)}</span>
        <span className="mx-2">·</span>
        <span>Paid: {formatDate(invoice.paidAt)}</span>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700">Line Items</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {invoice.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.description}
                <span className="ml-2 text-slate-400">({item.category})</span>
              </span>
              <span className="font-medium">{formatAmount(item.totalPrice)}</span>
            </li>
          ))}
        </ul>
      </div>

      {invoice.payments.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700">Payments</h4>
          <ul className="mt-2 divide-y divide-slate-100">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between py-2 text-sm">
                <span>
                  {payment.method}
                  {payment.transactionReference && (
                    <span className="ml-2 text-slate-400">#{payment.transactionReference}</span>
                  )}
                </span>
                <span className="font-medium">{formatAmount(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="mt-6 flex flex-wrap gap-2">
          {invoice.status === 'DRAFT' && (
            <>
              <button
                type="button"
                onClick={onAddCharge}
                disabled={isProcessing}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Add Charge
              </button>
              <button
                type="button"
                onClick={onIssue}
                disabled={isProcessing}
                className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-stayflow-700 disabled:opacity-50"
              >
                Issue Invoice
              </button>
            </>
          )}
          {invoice.status === 'ISSUED' && (
            <>
              <button
                type="button"
                onClick={onRecordPayment}
                disabled={isProcessing}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={onVoid}
                disabled={isProcessing}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Void
              </button>
            </>
          )}
          {invoice.status === 'PARTIALLY_PAID' && (
            <button
              type="button"
              onClick={onRecordPayment}
              disabled={isProcessing}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Record Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
