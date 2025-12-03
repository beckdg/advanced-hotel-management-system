import request from 'supertest';
import { createApp } from '../../../app';

describe('GET /health', () => {
  const app = createApp();

  it('should return health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'stayflow-api',
    });
  });
});
