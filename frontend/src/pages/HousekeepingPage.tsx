import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { HousekeepingTask } from '@/types/operations';

const BOARD_COLUMNS = ['DIRTY', 'CLEANING', 'INSPECTING', 'READY'] as const;

export function HousekeepingPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('housekeeping.write'));

  const { data, isLoading } = useQuery({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => apiClient.getHousekeepingTasks(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const startMutation = useMutation({
    mutationFn: (id: string) => apiClient.startHousekeepingTask(id),
    onSuccess: invalidate,
  });

  const inspectMutation = useMutation({
    mutationFn: (id: string) => apiClient.inspectHousekeepingTask(id),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiClient.completeHousekeepingTask(id),
    onSuccess: invalidate,
  });

  const tasks = data?.data ?? [];

  function renderActions(task: HousekeepingTask) {
    if (!canWrite) return null;

    switch (task.status) {
      case 'DIRTY':
        return (
          <button
            onClick={() => startMutation.mutate(task.id)}
            className="text-xs font-medium text-yellow-700 hover:text-yellow-900"
          >
            Start Cleaning
          </button>
        );
      case 'CLEANING':
        return (
          <button
            onClick={() => inspectMutation.mutate(task.id)}
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Mark Inspecting
          </button>
        );
      case 'INSPECTING':
        return (
          <button
            onClick={() => completeMutation.mutate(task.id)}
            className="text-xs font-medium text-green-700 hover:text-green-900"
          >
            Mark Ready
          </button>
        );
      default:
        return null;
    }
  }

  function TaskCard({ task }: { task: HousekeepingTask }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900">Room {task.room.roomNumber}</span>
          <TaskStatusBadge status={task.status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">{task.room.hotel.name}</p>
        {task.notes && <p className="mt-2 text-sm text-slate-600">{task.notes}</p>}
        {task.assignedTo && (
          <p className="mt-1 text-xs text-slate-400">
            Assigned: {task.assignedTo.name ?? task.assignedTo.email}
          </p>
        )}
        <div className="mt-3">{renderActions(task)}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        description="Track room cleaning workflow from dirty to ready"
      />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading tasks...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {BOARD_COLUMNS.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <TaskStatusBadge status={status} />
                  <span className="text-xs font-medium text-slate-500">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No tasks</p>
                  ) : (
                    columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
