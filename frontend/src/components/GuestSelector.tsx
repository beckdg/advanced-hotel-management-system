import type { Guest } from '@/types/reservation';

interface GuestSelectorProps {
  guests: Guest[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function GuestSelector({ guests, selectedIds, onChange, disabled }: GuestSelectorProps) {
  function toggleGuest(guestId: string) {
    if (selectedIds.includes(guestId)) {
      onChange(selectedIds.filter((id) => id !== guestId));
    } else {
      onChange([...selectedIds, guestId]);
    }
  }

  if (guests.length === 0) {
    return <p className="text-sm text-slate-500">No guests available. Create guests first.</p>;
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
      {guests.map((guest) => (
        <label
          key={guest.id}
          className={`flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-50 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(guest.id)}
            onChange={() => toggleGuest(guest.id)}
            disabled={disabled}
            className="rounded border-slate-300 text-stayflow-600 focus:ring-stayflow-500"
          />
          <span className="text-sm text-slate-700">
            {guest.firstName} {guest.lastName}
            {guest.email && (
              <span className="text-slate-400 ml-1">({guest.email})</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
