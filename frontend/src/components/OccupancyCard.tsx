import type { OccupancyReport } from '@/types/notifications';

interface OccupancyCardProps {
  report: OccupancyReport;
  isLoading?: boolean;
}

export function OccupancyCard({ report, isLoading }: OccupancyCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="mt-4 h-10 w-20 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-slate-500">Occupancy Rate</h3>
      <p className="mt-2 text-4xl font-bold text-blue-600">{report.occupancyRate}%</p>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${Math.min(report.occupancyRate, 100)}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="font-semibold text-slate-900">{report.occupiedRooms}</p>
          <p className="text-xs text-slate-500">Occupied</p>
        </div>
        <div>
          <p className="font-semibold text-green-600">{report.availableRooms}</p>
          <p className="text-xs text-slate-500">Available</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{report.totalRooms}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>
    </div>
  );
}
