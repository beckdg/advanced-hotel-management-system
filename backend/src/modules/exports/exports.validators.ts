import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';

export type ExportFormat = 'csv' | 'json';

export function parseExportFormat(query: Record<string, unknown>): ExportFormat {
  const format = typeof query.format === 'string' ? query.format.toLowerCase() : 'json';
  if (format !== 'csv' && format !== 'json') {
    throw new AppError('format must be csv or json', HTTP_STATUS.BAD_REQUEST, {
      code: 'INVALID_EXPORT_FORMAT',
    });
  }
  return format;
}
