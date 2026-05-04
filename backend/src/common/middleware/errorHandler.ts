import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { HTTP_STATUS } from '../constants';
import { statusToErrorCode } from '../constants/errorCodes';
import { env } from '../../config/env';

interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode =
    err instanceof AppError ? err.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const message =
    err instanceof AppError || env.isDevelopment
      ? err.message
      : 'Internal server error';

  const response: ErrorResponse = {
    status: 'error',
    code: err instanceof AppError ? err.code : statusToErrorCode(statusCode),
    message,
  };

  if (err instanceof AppError && err.details !== undefined) {
    response.details = err.details;
  }

  if (env.isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(`Route not found: ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND, {
      code: 'ROUTE_NOT_FOUND',
    }),
  );
}
