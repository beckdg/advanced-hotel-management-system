import type { ReservationStatus } from '@/types/reservation';

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
