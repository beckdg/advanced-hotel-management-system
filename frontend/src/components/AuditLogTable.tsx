import { DataTable } from '@/components/DataTable';
import type { AuditLog } from '@/types/notifications';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const columns = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log: AuditLog) => new Date(log.createdAt).toLocaleString(),
    },
    {
      key: 'user',
      header: 'User',
      render: (log: AuditLog) => log.user?.name ?? log.user?.email ?? 'System',
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{log.action}</code>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (log: AuditLog) => (
        <span>
          {log.entity ?? '—'}
          {log.entityId && (
            <span className="ml-1 text-slate-400 text-xs">({log.entityId.slice(0, 8)}…)</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      keyExtractor={(log) => log.id}
      emptyMessage="No audit logs found"
    />
  );
}
