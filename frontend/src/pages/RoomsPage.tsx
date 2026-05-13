import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { PaginationControls } from '@/components/PaginationControls';
import { RoomStatusBadge } from '@/components/RoomStatusBadge';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Room, RoomFilters, RoomStatus } from '@/types/hotel';

const STATUS_OPTIONS: { value: RoomStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'DIRTY', label: 'Dirty' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

export function RoomsPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('rooms.write'));
  const [filters, setFilters] = useState<RoomFilters>({});
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<RoomStatus>('AVAILABLE');

  const { data: hotelsData } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => apiClient.getHotels(),
  });

  const { data: roomTypesData } = useQuery({
    queryKey: ['room-types', filters.hotelId],
    queryFn: () => apiClient.getRoomTypes(filters.hotelId),
  });

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms', filters, page],
    queryFn: () => apiClient.getRooms(filters, { page, limit: 20 }),
  });

  const bulkMutation = useMutation({
    mutationFn: () => apiClient.bulkUpdateRoomStatus(selectedIds, bulkStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSelectedIds([]);
    },
  });

  const hotels = hotelsData?.data ?? [];
  const roomTypes = roomTypesData?.data ?? [];
  const rooms = roomsData?.data ?? [];
  const pagination = roomsData?.pagination;

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedHotel = hotels.find((h) => h.id === filters.hotelId);
  const floors = selectedHotel?.floors ?? [];

  return (
    <div>
      <PageHeader
        title="Rooms"
        description="View and filter room inventory across properties"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filters.hotelId ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, hotelId: e.target.value || undefined, floorId: undefined })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        <select
          value={filters.roomTypeId ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, roomTypeId: e.target.value || undefined })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Room Types</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.name}
            </option>
          ))}
        </select>

        <select
          value={filters.floorId ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, floorId: e.target.value || undefined })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          disabled={!filters.hotelId}
        >
          <option value="">All Floors</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: (e.target.value as RoomStatus) || undefined,
            })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {canWrite && selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-stayflow-200 bg-stayflow-50 px-4 py-3">
          <span className="text-sm font-medium text-stayflow-800">
            {selectedIds.length} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as RoomStatus)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending}
            className="rounded-lg bg-stayflow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-stayflow-700 disabled:opacity-50"
          >
            Apply Status
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading rooms...</p>
      ) : (
        <DataTable<Room>
          data={rooms}
          keyExtractor={(r) => r.id}
          emptyMessage="No rooms match the selected filters."
          columns={[
            ...(canWrite
              ? [
                  {
                    key: 'select',
                    header: '',
                    render: (r: Room) => (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelection(r.id)}
                      />
                    ),
                  },
                ]
              : []),
            { key: 'roomNumber', header: 'Room #' },
            { key: 'hotel', header: 'Hotel', render: (r) => r.hotel.name },
            { key: 'floor', header: 'Floor', render: (r) => r.floor.name },
            { key: 'roomType', header: 'Type', render: (r) => r.roomType.name },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <RoomStatusBadge status={r.status} />,
            },
            {
              key: 'rate',
              header: 'Base Rate',
              render: (r) => `$${Number(r.roomType.baseRate).toFixed(2)}`,
            },
          ]}
        />
      )}

      {pagination && (
        <PaginationControls pagination={pagination} onPageChange={setPage} />
      )}
    </div>
  );
}
