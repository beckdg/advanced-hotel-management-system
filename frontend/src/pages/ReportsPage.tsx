import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { OccupancyCard } from '@/components/OccupancyCard';
import { RevenueChart } from '@/components/RevenueChart';
import { apiClient } from '@/services/api';

export function ReportsPage() {
  const [hotelId, setHotelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = {
    hotelId: hotelId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ['reports-occupancy', filters],
    queryFn: () => apiClient.getOccupancyReport(filters),
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports-revenue', filters],
    queryFn: () => apiClient.getRevenueReport(filters),
  });

  const { data: operationsData, isLoading: operationsLoading } = useQuery({
    queryKey: ['reports-operations', filters],
    queryFn: () => apiClient.getOperationsReport(filters),
  });

  const operations = operationsData?.data;

  return (
    <section>
      <PageHeader
        title="Reports"
        description="Occupancy, revenue, and operational insights"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Hotel ID (optional)"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OccupancyCard
          report={occupancyData?.data ?? { occupancyRate: 0, occupiedRooms: 0, availableRooms: 0, totalRooms: 0 }}
          isLoading={occupancyLoading}
        />
        <RevenueChart
          report={revenueData?.data ?? { totalRevenue: 0, outstandingRevenue: 0, averageInvoiceValue: 0, paidInvoices: 0, unpaidInvoices: 0 }}
          isLoading={revenueLoading}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-slate-500">Operations Today</h3>
        {operationsLoading ? (
          <p className="mt-2 text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-red-600">{operations?.openMaintenance ?? 0}</p>
              <p className="text-xs text-slate-500">Open Maintenance</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{operations?.activeHousekeeping ?? 0}</p>
              <p className="text-xs text-slate-500">Active Housekeeping</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{operations?.reservationsToday ?? 0}</p>
              <p className="text-xs text-slate-500">Check-ins Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{operations?.checkoutsToday ?? 0}</p>
              <p className="text-xs text-slate-500">Check-outs Today</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
