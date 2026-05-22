import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import {
  structuredRequestLogger,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  sanitizeRequest,
  rateLimiter,
} from './common/middleware';
import { apiRouter, healthRouter } from './modules';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(sanitizeRequest);
  app.use(rateLimiter);
  app.use(structuredRequestLogger);

  app.use('/health', healthRouter);
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
