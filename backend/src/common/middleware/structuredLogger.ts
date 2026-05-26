import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  requestId?: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
}

function logLevel(status: number): LogEntry['level'] {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

export function structuredRequestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const entry: LogEntry = {
      level: logLevel(res.statusCode),
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    };

    if (env.isDevelopment || env.isTest) {
      const id = entry.requestId ? ` [${entry.requestId}]` : '';
      console.log(
        `${entry.method} ${entry.url} ${entry.status} ${entry.durationMs}ms${id}`,
      );
    } else {
      console.log(JSON.stringify(entry));
    }
  });

  next();
}
