import { useState } from 'react';
import type { PaymentMethod } from '@/types/billing';

interface PaymentModalProps {
  balance: number;
  onSubmit: (data: { amount: number; method: PaymentMethod; transactionReference?: string }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export function PaymentModal({ balance, onSubmit, onClose, isSubmitting }: PaymentModalProps) {
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [reference, setReference] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(amount),
      method,
      transactionReference: reference || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
        <p className="mt-1 text-sm text-slate-500">
          Outstanding balance: ${balance.toFixed(2)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Transaction Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
