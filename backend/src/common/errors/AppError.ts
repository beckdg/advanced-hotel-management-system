import { HTTP_STATUS } from '../constants';
import { statusToErrorCode } from '../constants/errorCodes';

export interface AppErrorOptions {
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    options?: AppErrorOptions,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.code = options?.code ?? statusToErrorCode(statusCode);
    this.details = options?.details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
