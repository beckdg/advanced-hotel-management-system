import request from 'supertest';
import { createApp } from '../../../app';
import * as passwordUtils from '../../../common/utils/password';
import { createMockUserRecord, mockRoleId } from '../../../test/helpers';
import { ROLES } from '../../rbac';

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { prisma } from '../../../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth API', () => {
  const app = createApp();
  const mockUser = createMockUserRecord();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed-password');
    jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);
    jest.spyOn(passwordUtils, 'hashToken').mockResolvedValue('hashed-token');
    jest.spyOn(passwordUtils, 'compareToken').mockResolvedValue(true);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'token-id' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: mockRoleId,
        name: ROLES.FRONT_DESK,
      });
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@stayflow.com',
          password: 'Password123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@stayflow.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@stayflow.com',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.message).toBe('Email already registered');
    });

    it('should reject invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: 'short' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@stayflow.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@stayflow.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@stayflow.com',
          password: 'Password123!',
        });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'token-id', tokenHash: 'hashed-token', userId: mockUser.id },
      ]);
      (mockPrisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      if (loginResponse.status !== 200) {
        (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        const fallbackLogin = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@stayflow.com', password: 'Password123!' });
        const refreshToken = fallbackLogin.body.data.refreshToken;

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body.data.accessToken).toBeDefined();
        return;
      }

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'token-id', tokenHash: 'hashed-token' },
      ]);
      (mockPrisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@stayflow.com', password: 'Password123!' });

      const { accessToken, refreshToken } = loginResponse.body.data;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
