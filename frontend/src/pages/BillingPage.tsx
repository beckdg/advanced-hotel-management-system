import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { InvoiceTable } from '@/components/InvoiceTable';
import { apiClient } from '@/services/api';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function BillingPage() {
  const navigate = useNavigate();

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiClient.getDashboardMetrics(),
  });

  const { data: outstandingData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', 'outstanding'],
    queryFn: () =>
      apiClient.getInvoices({ status: 'ISSUED' }).then(async (issued) => {
        const partial = await apiClient.getInvoices({ status: 'PARTIALLY_PAID' });
        return { data: [...issued.data, ...partial.data] };
      }),
  });

  const metrics = metricsData?.data;
  const outstanding = outstandingData?.data ?? [];

  const cards = [
    {
      label: 'Total Revenue',
      value: metricsLoading ? '—' : formatCurrency(metrics?.totalRevenue ?? 0),
      color: 'text-green-600',
    },
    {
      label: 'Outstanding Invoices',
      value: metricsLoading ? '—' : (metrics?.outstandingInvoices ?? 0),
      color: 'text-orange-600',
    },
    {
      label: 'Paid Invoices',
      value: metricsLoading ? '—' : (metrics?.paidInvoices ?? 0),
      color: 'text-blue-600',
    },
  ];

  return (
    <section>
      <PageHeader
        title="Billing"
        description="Revenue overview and outstanding balances"
        action={
          <Link
            to="/invoices"
            className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-stayflow-700"
          >
            Manage Invoices
          </Link>
        }
      />

      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-medium text-slate-500">{card.label}</h2>
            <p className={`mt-2 text-3xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Outstanding Invoices</h2>
        {invoicesLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <InvoiceTable invoices={outstanding} onSelect={() => navigate('/invoices')} />
        )}
      </div>
    </section>
  );
}
