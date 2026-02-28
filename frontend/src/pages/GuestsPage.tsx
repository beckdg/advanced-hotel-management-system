import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Guest } from '@/types/reservation';

export function GuestsPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('guests.write'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: () => apiClient.getGuests(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createGuest(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  const guests = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Manage guest profiles and contact information"
        action={
          canWrite && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700"
            >
              {showForm ? 'Cancel' : 'Add Guest'}
            </button>
          )
        }
      />

      {showForm && canWrite && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Guest</h2>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-4 rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Guest'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading guests...</p>
      ) : (
        <DataTable<Guest>
          data={guests}
          keyExtractor={(g) => g.id}
          emptyMessage="No guests found."
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (g) => `${g.firstName} ${g.lastName}`,
            },
            { key: 'email', header: 'Email', render: (g) => g.email ?? '—' },
            { key: 'phone', header: 'Phone', render: (g) => g.phone ?? '—' },
            {
              key: 'reservations',
              header: 'Reservations',
              render: (g) => g._count?.reservations ?? 0,
            },
          ]}
        />
      )}
    </div>
  );
}
