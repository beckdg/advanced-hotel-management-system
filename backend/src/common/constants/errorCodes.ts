import { HTTP_STATUS } from './index';

export const ERROR_CODES: Record<number, string> = {
  [HTTP_STATUS.BAD_REQUEST]: 'BAD_REQUEST',
  [HTTP_STATUS.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HTTP_STATUS.FORBIDDEN]: 'FORBIDDEN',
  [HTTP_STATUS.NOT_FOUND]: 'NOT_FOUND',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

export function statusToErrorCode(statusCode: number): string {
  return ERROR_CODES[statusCode] ?? 'INTERNAL_ERROR';
}
