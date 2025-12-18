import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../common/errors';
import { HTTP_STATUS } from '../../../common/constants';
import { signAccessToken } from '../../../common/utils/jwt';
import { requireAuth, requirePermission } from '../rbac.middleware';
import { PERMISSIONS } from '../rbac.constants';
import { mockAuthUser } from '../../../test/helpers';

jest.mock('../rbac.service', () => ({
  getAuthUserById: jest.fn(),
  userHasPermission: jest.requireActual('../rbac.service').userHasPermission,
}));

import { getAuthUserById } from '../rbac.service';

const mockGetAuthUserById = getAuthUserById as jest.MockedFunction<typeof getAuthUserById>;

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

function createMockNext(): NextFunction {
  return jest.fn();
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject requests without authorization header', async () => {
    const req = createMockReq();
    const next = createMockNext();

    await requireAuth(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('should reject requests with invalid token', async () => {
    const req = createMockReq({ headers: { authorization: 'Bearer invalid-token' } });
    const next = createMockNext();

    await requireAuth(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error.message).toBe('Invalid or expired token');
  });

  it('should attach user to request with valid token', async () => {
    const token = signAccessToken({
      sub: mockAuthUser.id,
      email: mockAuthUser.email,
      roleId: mockAuthUser.roleId,
      roleName: mockAuthUser.roleName,
    });

    mockGetAuthUserById.mockResolvedValue(mockAuthUser);

    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const next = createMockNext();

    await requireAuth(req, createMockRes(), next);

    expect(req.user).toEqual(mockAuthUser);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requirePermission middleware', () => {
  it('should reject unauthenticated requests', () => {
    const req = createMockReq();
    const next = createMockNext();
    const middleware = requirePermission(PERMISSIONS.USERS_READ);

    middleware(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('should reject users without required permission', () => {
    const req = createMockReq({ user: mockAuthUser });
    const next = createMockNext();
    const middleware = requirePermission(PERMISSIONS.USERS_UPDATE);

    middleware(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it('should allow users with required permission', () => {
    const req = createMockReq({ user: mockAuthUser });
    const next = createMockNext();
    const middleware = requirePermission(PERMISSIONS.USERS_READ);

    middleware(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
