import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import {
  MaintenanceStatusBadge,
  MaintenancePriorityBadge,
} from '@/components/MaintenanceStatusBadge';
import { MaintenanceForm } from '@/features/maintenance/MaintenanceForm';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { MaintenanceRequest } from '@/types/operations';

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('maintenance.write'));
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignUserId, setBulkAssignUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => apiClient.getMaintenanceRequests(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const createMutation = useMutation({
    mutationFn: apiClient.createMaintenanceRequest.bind(apiClient),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiClient.assignMaintenanceRequest(id, userId),
    onSuccess: () => {
      invalidate();
      setAssigningId(null);
      setAssignUserId('');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => apiClient.startMaintenanceRequest(id),
    onSuccess: invalidate,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => apiClient.resolveMaintenanceRequest(id),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => apiClient.closeMaintenanceRequest(id),
    onSuccess: invalidate,
  });

  const bulkAssignMutation = useMutation({
    mutationFn: () => apiClient.bulkAssignMaintenance(selectedIds, bulkAssignUserId),
    onSuccess: () => {
      invalidate();
      setSelectedIds([]);
      setBulkAssignUserId('');
    },
  });

  const requests = data?.data ?? [];

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function renderActions(req: MaintenanceRequest) {
    if (!canWrite) return '—';

    if (assigningId === req.id) {
      return (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="User ID"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-xs w-28"
          />
          <button
            onClick={() => assignMutation.mutate({ id: req.id, userId: assignUserId })}
            className="text-xs font-medium text-blue-600"
          >
            Save
          </button>
          <button onClick={() => setAssigningId(null)} className="text-xs text-slate-400">
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {req.status === 'OPEN' && (
          <button
            onClick={() => setAssigningId(req.id)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Assign
          </button>
        )}
        {req.status === 'ASSIGNED' && (
          <button
            onClick={() => startMutation.mutate(req.id)}
            className="text-xs font-medium text-yellow-600 hover:text-yellow-800"
          >
            Start
          </button>
        )}
        {req.status === 'IN_PROGRESS' && (
          <button
            onClick={() => resolveMutation.mutate(req.id)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Resolve
          </button>
        )}
        {req.status === 'RESOLVED' && (
          <button
            onClick={() => closeMutation.mutate(req.id)}
            className="text-xs font-medium text-green-600 hover:text-green-800"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Track and resolve room maintenance requests"
        action={
          canWrite && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700"
            >
              {showForm ? 'Cancel' : 'New Request'}
            </button>
          )
        }
      />

      {showForm && canWrite && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Maintenance Request</h2>
          <MaintenanceForm
            onSubmit={(input) => createMutation.mutate(input)}
            isLoading={createMutation.isPending}
            error={error}
          />
        </div>
      )}

      {canWrite && selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} selected
          </span>
          <input
            type="text"
            placeholder="Assign to User ID"
            value={bulkAssignUserId}
            onChange={(e) => setBulkAssignUserId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => bulkAssignMutation.mutate()}
            disabled={bulkAssignMutation.isPending || !bulkAssignUserId}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Bulk Assign
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading requests...</p>
      ) : (
        <DataTable<MaintenanceRequest>
          data={requests}
          keyExtractor={(r) => r.id}
          emptyMessage="No maintenance requests."
          columns={[
            ...(canWrite
              ? [
                  {
                    key: 'select',
                    header: '',
                    render: (r: MaintenanceRequest) => (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelection(r.id)}
                        disabled={r.status !== 'OPEN'}
                      />
                    ),
                  },
                ]
              : []),
            { key: 'title', header: 'Title' },
            { key: 'room', header: 'Room', render: (r) => r.room.roomNumber },
            { key: 'hotel', header: 'Hotel', render: (r) => r.room.hotel.name },
            {
              key: 'priority',
              header: 'Priority',
              render: (r) => <MaintenancePriorityBadge priority={r.priority} />,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <MaintenanceStatusBadge status={r.status} />,
            },
            {
              key: 'assigned',
              header: 'Assigned To',
              render: (r) => r.assignedTo?.name ?? r.assignedTo?.email ?? '—',
            },
            { key: 'actions', header: 'Actions', render: renderActions },
          ]}
        />
      )}
    </div>
  );
}
