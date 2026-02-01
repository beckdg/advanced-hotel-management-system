import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { ReservationStatusBadge } from '@/components/ReservationStatusBadge';
import { ReservationForm } from '@/features/reservations/ReservationForm';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Reservation, ReservationFilters, ReservationStatus } from '@/types/reservation';

const STATUS_OPTIONS: { value: ReservationStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'CHECKED_OUT', label: 'Checked Out' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('reservations.write'));
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<ReservationFilters>({});
  const [error, setError] = useState('');

  const { data: hotelsData } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => apiClient.getHotels(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', filters],
    queryFn: () => apiClient.getReservations(filters),
  });

  const createMutation = useMutation({
    mutationFn: apiClient.createReservation.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setShowForm(false);
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => apiClient.checkInReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => apiClient.checkOutReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiClient.updateReservation(id, { status: 'CONFIRMED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  });

  const hotels = hotelsData?.data ?? [];
  const reservations = data?.data ?? [];

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  function guestNames(r: Reservation) {
    return r.guests.map((g) => `${g.guest.firstName} ${g.guest.lastName}`).join(', ');
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Manage bookings, check-in, and check-out"
        action={
          canWrite && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700"
            >
              {showForm ? 'Cancel' : 'New Reservation'}
            </button>
          )
        }
      />

      {showForm && canWrite && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Reservation</h2>
          <ReservationForm
            onSubmit={(input) => createMutation.mutate(input)}
            isLoading={createMutation.isPending}
            error={error}
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filters.hotelId ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, hotelId: e.target.value || undefined })
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
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: (e.target.value as ReservationStatus) || undefined,
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

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading reservations...</p>
      ) : (
        <DataTable<Reservation>
          data={reservations}
          keyExtractor={(r) => r.id}
          emptyMessage="No reservations found."
          columns={[
            {
              key: 'guests',
              header: 'Guests',
              render: (r) => guestNames(r),
            },
            { key: 'hotel', header: 'Hotel', render: (r) => r.hotel.name },
            { key: 'room', header: 'Room', render: (r) => r.room.roomNumber },
            {
              key: 'dates',
              header: 'Dates',
              render: (r) => `${formatDate(r.checkInDate)} – ${formatDate(r.checkOutDate)}`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <ReservationStatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) =>
                canWrite ? (
                  <div className="flex gap-2">
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => confirmMutation.mutate(r.id)}
                        disabled={confirmMutation.isPending}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Confirm
                      </button>
                    )}
                    {r.status === 'CONFIRMED' && (
                      <button
                        onClick={() => checkInMutation.mutate(r.id)}
                        disabled={checkInMutation.isPending}
                        className="text-xs font-medium text-green-600 hover:text-green-800"
                      >
                        Check In
                      </button>
                    )}
                    {r.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => checkOutMutation.mutate(r.id)}
                        disabled={checkOutMutation.isPending}
                        className="text-xs font-medium text-orange-600 hover:text-orange-800"
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
