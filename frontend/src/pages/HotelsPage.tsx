import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Hotel } from '@/types/hotel';

export function HotelsPage() {
  const queryClient = useQueryClient();
  const canWrite = useAuthStore((s) => s.user?.permissions.includes('hotels.write'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', country: '', address: '' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => apiClient.getHotels(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createHotel(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      setShowForm(false);
      setForm({ name: '', city: '', country: '', address: '' });
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  const hotels = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Hotels"
        description="Manage hotel properties and locations"
        action={
          canWrite && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700"
            >
              {showForm ? 'Cancel' : 'Add Hotel'}
            </button>
          )
        }
      />

      {showForm && canWrite && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Hotel</h2>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Hotel name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-4 rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-stayflow-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Hotel'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading hotels...</p>
      ) : (
        <DataTable<Hotel>
          data={hotels}
          keyExtractor={(h) => h.id}
          emptyMessage="No hotels found. Create your first hotel to get started."
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'city', header: 'City', render: (h) => h.city ?? '—' },
            { key: 'country', header: 'Country', render: (h) => h.country ?? '—' },
            {
              key: 'rooms',
              header: 'Rooms',
              render: (h) => h._count?.rooms ?? 0,
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (h) => (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    h.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {h.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
