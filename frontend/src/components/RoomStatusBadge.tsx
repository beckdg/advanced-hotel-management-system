import type { RoomStatus } from '@/types/hotel';

const STATUS_STYLES: Record<RoomStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  OCCUPIED: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-purple-100 text-purple-800',
  DIRTY: 'bg-orange-100 text-orange-800',
  CLEANING: 'bg-yellow-100 text-yellow-800',
  OUT_OF_SERVICE: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  DIRTY: 'Dirty',
  CLEANING: 'Cleaning',
  OUT_OF_SERVICE: 'Out of Service',
};

interface RoomStatusBadgeProps {
  status: RoomStatus;
}

export function RoomStatusBadge({ status }: RoomStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
