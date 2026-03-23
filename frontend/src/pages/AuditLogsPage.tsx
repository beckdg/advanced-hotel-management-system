import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AuditLogTable } from '@/components/AuditLogTable';
import { apiClient } from '@/services/api';

export function AuditLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, action, startDate, endDate],
    queryFn: () =>
      apiClient.getAuditLogs({
        entityType: entityType || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const logs = data?.data ?? [];

  return (
    <section>
      <PageHeader
        title="Audit Logs"
        description="Track system activity across reservations, billing, and operations"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All entities</option>
          <option value="Reservation">Reservation</option>
          <option value="Invoice">Invoice</option>
          <option value="MaintenanceRequest">Maintenance</option>
          <option value="HousekeepingTask">Housekeeping</option>
          <option value="User">User</option>
        </select>
        <input
          type="text"
          placeholder="Action filter"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading audit logs…</p>
      ) : (
        <AuditLogTable logs={logs} />
      )}
    </section>
  );
}
