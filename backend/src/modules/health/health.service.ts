import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { SERVICE_NAME } from '../../common/constants';
import { getUptimeSeconds } from '../../common/runtime';

export type DatabaseStatus = 'connected' | 'disconnected';

export interface HealthDetails {
  status: 'ok' | 'degraded';
  service: string;
  database: DatabaseStatus;
  uptime: number;
  version: string;
  environment: string;
}

export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

export async function getHealthDetails(): Promise<HealthDetails> {
  const database = await checkDatabaseStatus();

  return {
    status: database === 'connected' ? 'ok' : 'degraded',
    service: SERVICE_NAME,
    database,
    uptime: getUptimeSeconds(),
    version: process.env.npm_package_version ?? '1.0.0',
    environment: env.nodeEnv,
  };
}
