import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { apiClient } from '@/services/api';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => apiClient.globalSearch(submitted),
    enabled: submitted.length > 0,
  });

  const results = data?.data;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <div>
      <PageHeader
        title="Global Search"
        description="Search guests, reservations, rooms, invoices, and maintenance requests"
      />

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Guest name, email, room number, reservation or invoice ID..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-stayflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-stayflow-700"
        >
          Search
        </button>
      </form>

      {(isLoading || isFetching) && submitted && (
        <p className="text-sm text-slate-500">Searching...</p>
      )}

      {results && (
        <div className="space-y-8">
          <SearchSection title="Guests" count={results.guests.length}>
            {results.guests.map((g) => (
              <SearchResultItem
                key={g.id}
                title={`${g.firstName} ${g.lastName}`}
                subtitle={g.email ?? g.phone ?? g.id}
                to="/guests"
              />
            ))}
          </SearchSection>

          <SearchSection title="Reservations" count={results.reservations.length}>
            {results.reservations.map((r) => (
              <SearchResultItem
                key={r.id}
                title={`${r.hotel.name} · Room ${r.room.roomNumber}`}
                subtitle={`${r.id} · ${r.status}`}
                to="/reservations"
              />
            ))}
          </SearchSection>

          <SearchSection title="Rooms" count={results.rooms.length}>
            {results.rooms.map((r) => (
              <SearchResultItem
                key={r.id}
                title={`Room ${r.roomNumber}`}
                subtitle={`${r.hotel.name} · ${r.roomType.name} · ${r.status}`}
                to="/rooms"
              />
            ))}
          </SearchSection>

          <SearchSection title="Invoices" count={results.invoices.length}>
            {results.invoices.map((inv) => (
              <SearchResultItem
                key={inv.id}
                title={`Invoice ${inv.id.slice(0, 8)}...`}
                subtitle={`${inv.status} · Reservation ${inv.reservationId.slice(0, 8)}...`}
                to="/invoices"
              />
            ))}
          </SearchSection>

          <SearchSection title="Maintenance" count={results.maintenance.length}>
            {results.maintenance.map((m) => (
              <SearchResultItem
                key={m.id}
                title={m.title}
                subtitle={`Room ${m.room.roomNumber} · ${m.status} · ${m.priority}`}
                to="/maintenance"
              />
            ))}
          </SearchSection>
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {title} <span className="text-sm font-normal text-slate-500">({count})</span>
      </h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {children}
      </ul>
    </section>
  );
}

function SearchResultItem({
  title,
  subtitle,
  to,
}: {
  title: string;
  subtitle: string;
  to: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="block px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </Link>
    </li>
  );
}
