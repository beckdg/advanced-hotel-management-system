import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { ExportFormat } from '@/types/api';

type ExportType = 'reservations' | 'invoices' | 'audit-logs';

const EXPORT_OPTIONS: { type: ExportType; label: string; permission: string }[] = [
  { type: 'reservations', label: 'Reservations', permission: 'reservations.read' },
  { type: 'invoices', label: 'Invoices', permission: 'billing.read' },
  { type: 'audit-logs', label: 'Audit Logs', permission: 'audit.read' },
];

export function ExportsPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [loading, setLoading] = useState<ExportType | null>(null);
  const [error, setError] = useState('');

  const availableExports = EXPORT_OPTIONS.filter((opt) =>
    permissions.includes(opt.permission),
  );

  async function handleExport(type: ExportType) {
    setLoading(type);
    setError('');
    try {
      await apiClient.downloadExport(type, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Exports"
        description="Download reservations, invoices, and audit logs as CSV or JSON"
      />

      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableExports.map((opt) => (
          <div
            key={opt.type}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{opt.label}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Export all {opt.label.toLowerCase()} records
            </p>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleExport(opt.type)}
              className="mt-4 rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-stayflow-700 disabled:opacity-50"
            >
              {loading === opt.type ? 'Exporting...' : `Download ${format.toUpperCase()}`}
            </button>
          </div>
        ))}
      </div>

      {availableExports.length === 0 && (
        <p className="text-sm text-slate-500">You do not have permission to export any data.</p>
      )}
    </div>
  );
}
