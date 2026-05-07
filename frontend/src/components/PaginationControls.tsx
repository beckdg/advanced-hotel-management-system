import type { PaginationMeta } from '@/types/api';

interface PaginationControlsProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
