import type { HousekeepingStatus } from '@/types/operations';

const STATUS_STYLES: Record<HousekeepingStatus, string> = {
  DIRTY: 'bg-orange-100 text-orange-800',
  CLEANING: 'bg-yellow-100 text-yellow-800',
  INSPECTING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<HousekeepingStatus, string> = {
  DIRTY: 'Dirty',
  CLEANING: 'Cleaning',
  INSPECTING: 'Inspecting',
  READY: 'Ready',
};

interface TaskStatusBadgeProps {
  status: HousekeepingStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
