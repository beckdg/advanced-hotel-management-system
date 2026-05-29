import request from 'supertest';
import { createApp } from '../../../app';
import * as passwordUtils from '../../../common/utils/password';
import { signAccessToken } from '../../../common/utils/jwt';
import { createMockUserRecord, mockRoleId } from '../../../test/helpers';
import { ROLES } from '../../rbac';

jest.mock('../../rbac/rbac.service', () => ({
  getAuthUserById: jest.fn(),
  mapUserToAuthUser: jest.requireActual('../../rbac/rbac.service').mapUserToAuthUser,
  userHasPermission: jest.requireActual('../../rbac/rbac.service').userHasPermission,
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    role: { findUnique: jest.fn() },
    refreshToken: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { prisma } from '../../../config/database';
import { getAuthUserById } from '../../rbac/rbac.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUserById = getAuthUserById as jest.MockedFunction<typeof getAuthUserById>;
const app = createApp();

describe('Auth edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed');
    jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);
    jest.spyOn(passwordUtils, 'hashToken').mockResolvedValue('hashed-token');
    jest.spyOn(passwordUtils, 'compareToken').mockResolvedValue(true);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects register with missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'Pass123!' });
    expect(res.status).toBe(400);
  });

  it('rejects register with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects register with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-email', password: 'Pass123!', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects register when role not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.role.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'Pass123!', name: 'New' });
    expect(res.status).toBe(500);
  });

  it('rejects login with missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('rejects login for inactive user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      createMockUserRecord({ isActive: false }),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@stayflow.com', password: 'Pass123!' });
    expect(res.status).toBe(401);
  });

  it('rejects login with wrong password', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(createMockUserRecord());
    jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@stayflow.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects refresh without token body', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('rejects refresh with unknown token', async () => {
    (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'unknown-token' });
    expect(res.status).toBe(401);
  });

  it('rejects protected route with malformed bearer token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects protected route with empty bearer token', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('rejects protected route when user no longer exists', async () => {
    mockGetAuthUserById.mockResolvedValue(null);
    const token = signAccessToken({
      sub: 'deleted-user',
      email: 'gone@test.com',
      roleId: mockRoleId,
      roleName: ROLES.FRONT_DESK,
    });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('includes X-Request-Id on auth responses', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
