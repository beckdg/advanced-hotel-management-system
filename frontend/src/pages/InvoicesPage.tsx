import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { InvoiceTable } from '@/components/InvoiceTable';
import { InvoiceDetails } from '@/components/InvoiceDetails';
import { PaymentModal } from '@/components/PaymentModal';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Invoice, InvoiceStatus } from '@/types/billing';

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('billing.write'));
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    description: '',
    quantity: '1',
    unitPrice: '',
    category: 'MISC',
  });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () =>
      apiClient.getInvoices(statusFilter ? { status: statusFilter } : undefined),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const issueMutation = useMutation({
    mutationFn: (id: string) => apiClient.issueInvoice(id),
    onSuccess: (res) => {
      setSelected(res.data);
      invalidate();
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => apiClient.voidInvoice(id),
    onSuccess: (res) => {
      setSelected(res.data);
      invalidate();
    },
  });

  const payMutation = useMutation({
    mutationFn: ({
      id,
      amount,
      method,
      transactionReference,
    }: {
      id: string;
      amount: number;
      method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
      transactionReference?: string;
    }) => apiClient.recordPayment(id, { amount, method, transactionReference }),
    onSuccess: (res) => {
      setSelected(res.data);
      setShowPayment(false);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const addChargeMutation = useMutation({
    mutationFn: ({
      id,
      description,
      quantity,
      unitPrice,
      category,
    }: {
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      category: string;
    }) => apiClient.addInvoiceItem(id, { description, quantity, unitPrice, category }),
    onSuccess: (res) => {
      setSelected(res.data);
      setShowAddCharge(false);
      setChargeForm({ description: '', quantity: '1', unitPrice: '', category: 'MISC' });
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const invoices = data?.data ?? [];

  const paidTotal = selected
    ? selected.payments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + Number(p.amount), 0)
    : 0;
  const balance = selected ? Number(selected.totalAmount) - paidTotal : 0;

  return (
    <section>
      <PageHeader
        title="Invoices"
        description="Manage guest invoices, charges, and payments"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading invoices…</p>
          ) : (
            <InvoiceTable invoices={invoices} onSelect={setSelected} />
          )}
        </div>

        {selected && (
          <InvoiceDetails
            invoice={selected}
            canWrite={canWrite}
            isProcessing={
              issueMutation.isPending ||
              voidMutation.isPending ||
              payMutation.isPending ||
              addChargeMutation.isPending
            }
            onIssue={() => issueMutation.mutate(selected.id)}
            onVoid={() => voidMutation.mutate(selected.id)}
            onAddCharge={() => setShowAddCharge(true)}
            onRecordPayment={() => setShowPayment(true)}
          />
        )}
      </div>

      {showPayment && selected && (
        <PaymentModal
          balance={balance}
          isSubmitting={payMutation.isPending}
          onClose={() => setShowPayment(false)}
          onSubmit={(data) => payMutation.mutate({ id: selected.id, ...data })}
        />
      )}

      {showAddCharge && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add Charge</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addChargeMutation.mutate({
                  id: selected.id,
                  description: chargeForm.description,
                  quantity: parseInt(chargeForm.quantity, 10),
                  unitPrice: parseFloat(chargeForm.unitPrice),
                  category: chargeForm.category,
                });
              }}
            >
              <input
                placeholder="Description"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Quantity"
                  value={chargeForm.quantity}
                  onChange={(e) => setChargeForm({ ...chargeForm, quantity: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  min="1"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit price"
                  value={chargeForm.unitPrice}
                  onChange={(e) => setChargeForm({ ...chargeForm, unitPrice: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <input
                placeholder="Category"
                value={chargeForm.category}
                onChange={(e) => setChargeForm({ ...chargeForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCharge(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addChargeMutation.isPending}
                  className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
