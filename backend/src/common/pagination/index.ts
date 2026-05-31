import { AppError } from '../errors';
import { HTTP_STATUS } from '../constants';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  allowedSortFields: string[],
  defaultSortBy = 'createdAt',
): PaginationParams {
  const pageRaw = Number(query.page ?? 1);
  const limitRaw = Number(query.limit ?? 20);

  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), 100) : 20;

  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  const sortBy =
    typeof query.sortBy === 'string' && query.sortBy.trim().length > 0
      ? query.sortBy.trim()
      : defaultSortBy;

  if (!allowedSortFields.includes(sortBy)) {
    throw new AppError(
      `Invalid sortBy field. Allowed: ${allowedSortFields.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      { code: 'INVALID_SORT_FIELD' },
    );
  }

  return { page, limit, sortBy, sortOrder };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function paginate<T, O = Record<string, 'asc' | 'desc'>>(options: {
  findMany: (args: { skip: number; take: number; orderBy: O }) => Promise<T[]>;
  count: () => Promise<number>;
  pagination: PaginationParams;
  orderBy: O;
}): Promise<PaginatedResult<T>> {
  const { page, limit } = options.pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    options.findMany({ skip, take: limit, orderBy: options.orderBy }),
    options.count(),
  ]);

  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}
