import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface SearchQuery {
  q: string;
  limit: number;
}

export function parseSearchQuery(query: Record<string, unknown>): SearchQuery {
  if (!isNonEmptyString(query.q)) {
    throw new AppError('Search query parameter "q" is required', HTTP_STATUS.BAD_REQUEST, {
      code: 'SEARCH_QUERY_REQUIRED',
    });
  }

  const limitRaw = Number(query.limit ?? 10);
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), 25) : 10;

  return { q: query.q.trim(), limit };
}
