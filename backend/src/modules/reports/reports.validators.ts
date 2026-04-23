import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface ReportFilterQuery {
  hotelId?: string;
  startDate?: Date;
  endDate?: Date;
}

function parseDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!isNonEmptyString(value)) {
    throw new AppError(`${field} must be a valid date string`, HTTP_STATUS.BAD_REQUEST);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new AppError(`${field} must be a valid date string`, HTTP_STATUS.BAD_REQUEST);
  }
  return date;
}

export function parseReportFilters(query: Record<string, unknown>): ReportFilterQuery {
  const filters: ReportFilterQuery = {};

  if (isNonEmptyString(query.hotelId)) filters.hotelId = query.hotelId.trim();
  filters.startDate = parseDate(query.startDate, 'startDate');
  filters.endDate = parseDate(query.endDate, 'endDate');

  if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
    throw new AppError('endDate must be after startDate', HTTP_STATUS.BAD_REQUEST);
  }

  return filters;
}
