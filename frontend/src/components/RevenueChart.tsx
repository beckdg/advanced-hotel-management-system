import type { RevenueReport } from '@/types/notifications';

interface RevenueChartProps {
  report: RevenueReport;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function RevenueChart({ report, isLoading }: RevenueChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="mt-6 h-40 bg-slate-100 rounded" />
      </div>
    );
  }

  const maxValue = Math.max(report.totalRevenue, report.outstandingRevenue, 1);

  const bars = [
    { label: 'Total Revenue', value: report.totalRevenue, color: 'bg-green-500' },
    { label: 'Outstanding', value: report.outstandingRevenue, color: 'bg-orange-500' },
    { label: 'Avg Invoice', value: report.averageInvoiceValue, color: 'bg-blue-500' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-slate-500">Revenue Overview</h3>

      <div className="mt-6 flex items-end gap-6 h-40">
        {bars.map((bar) => (
          <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-slate-700">
              {formatCurrency(bar.value)}
            </span>
            <div
              className={`w-full rounded-t-lg ${bar.color} transition-all`}
              style={{ height: `${(bar.value / maxValue) * 100}%`, minHeight: bar.value > 0 ? '8px' : '2px' }}
            />
            <span className="text-xs text-slate-500 text-center">{bar.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm">
        <span>
          <span className="font-semibold text-green-600">{report.paidInvoices}</span>
          <span className="text-slate-500"> paid</span>
        </span>
        <span>
          <span className="font-semibold text-orange-600">{report.unpaidInvoices}</span>
          <span className="text-slate-500"> unpaid</span>
        </span>
      </div>
    </div>
  );
}
