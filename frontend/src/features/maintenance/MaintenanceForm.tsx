import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { CreateMaintenanceInput, MaintenancePriority } from '@/types/operations';

interface MaintenanceFormProps {
  onSubmit: (input: CreateMaintenanceInput) => void;
  isLoading?: boolean;
  error?: string;
}

const PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function MaintenanceForm({ onSubmit, isLoading, error }: MaintenanceFormProps) {
  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.getRooms(),
  });

  const rooms = roomsData?.data ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!roomId || !title) return;
    onSubmit({ roomId, title, description: description || undefined, priority });
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.hotel.name} — Room {r.roomNumber}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief issue description"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Detailed description (optional)"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700 disabled:opacity-50"
      >
        {isLoading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}
