import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GuestSelector } from '@/components/GuestSelector';
import { apiClient } from '@/services/api';
import type { CreateReservationInput } from '@/types/reservation';

interface ReservationFormProps {
  onSubmit: (input: CreateReservationInput) => void;
  isLoading?: boolean;
  error?: string;
}

export function ReservationForm({ onSubmit, isLoading, error }: ReservationFormProps) {
  const [hotelId, setHotelId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [totalGuests, setTotalGuests] = useState(1);
  const [notes, setNotes] = useState('');
  const [guestIds, setGuestIds] = useState<string[]>([]);

  const { data: hotelsData } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => apiClient.getHotels(),
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', hotelId],
    queryFn: () => apiClient.getRooms({ hotelId, status: 'AVAILABLE' }),
    enabled: !!hotelId,
  });

  const { data: guestsData } = useQuery({
    queryKey: ['guests'],
    queryFn: () => apiClient.getGuests(),
  });

  const hotels = hotelsData?.data ?? [];
  const rooms = roomsData?.data ?? [];
  const guests = guestsData?.data ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hotelId || !roomId || guestIds.length === 0) return;

    onSubmit({
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      totalGuests,
      notes: notes || undefined,
      guestIds,
    });
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-stayflow-500 focus:outline-none focus:ring-1 focus:ring-stayflow-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hotel</label>
          <select
            required
            value={hotelId}
            onChange={(e) => {
              setHotelId(e.target.value);
              setRoomId('');
            }}
            className={inputClass}
          >
            <option value="">Select hotel</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={!hotelId}
            className={inputClass}
          >
            <option value="">Select room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber} — {r.roomType.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check-in</label>
          <input
            type="date"
            required
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check-out</label>
          <input
            type="date"
            required
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Total Guests</label>
          <input
            type="number"
            min={1}
            required
            value={totalGuests}
            onChange={(e) => setTotalGuests(parseInt(e.target.value, 10))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Guests</label>
        <GuestSelector guests={guests} selectedIds={guestIds} onChange={setGuestIds} />
      </div>

      <button
        type="submit"
        disabled={isLoading || guestIds.length === 0}
        className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700 disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Reservation'}
      </button>
    </form>
  );
}
