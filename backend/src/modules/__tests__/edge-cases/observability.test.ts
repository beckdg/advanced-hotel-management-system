import request from 'supertest';
import { createApp } from '../../../app';
import { requestIdMiddleware } from '../../../common/middleware/requestId';
import { checkDatabaseStatus, getHealthDetails } from '../../health/health.service';

jest.mock('../../../config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { prisma } from '../../../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const app = createApp();

describe('Observability', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /health returns basic status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', service: 'stayflow-api' });
  });

  it('GET /health/details returns database and uptime', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app).get('/health/details').expect(200);
    expect(res.body.database).toBe('connected');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.version).toBeDefined();
    expect(res.body.environment).toBeDefined();
  });

  it('GET /health/details returns 503 when database down', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/health/details');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database).toBe('disconnected');
  });

  it('includes X-Request-Id response header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('preserves incoming X-Request-Id header', async () => {
    const res = await request(app)
      .get('/health')
      .set('X-Request-Id', 'custom-request-id-123');
    expect(res.headers['x-request-id']).toBe('custom-request-id-123');
  });

  it('requestIdMiddleware assigns id to request', () => {
    const req = { headers: {} } as Parameters<typeof requestIdMiddleware>[0];
    const res = { setHeader: jest.fn() } as unknown as Parameters<typeof requestIdMiddleware>[1];
    const next = jest.fn();

    requestIdMiddleware(req, res, next);
    expect(req.requestId).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('checkDatabaseStatus returns connected on success', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([1]);
    await expect(checkDatabaseStatus()).resolves.toBe('connected');
  });

  it('checkDatabaseStatus returns disconnected on failure', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(checkDatabaseStatus()).resolves.toBe('disconnected');
  });

  it('getHealthDetails includes service name', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([1]);
    const details = await getHealthDetails();
    expect(details.service).toBe('stayflow-api');
  });
});
