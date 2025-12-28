import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export function validateRegisterInput(body: unknown): RegisterInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (!isNonEmptyString(email) || !email.includes('@')) {
    throw new AppError('Valid email is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (!isNonEmptyString(password) || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    email: email.toLowerCase().trim(),
    password,
    name: isNonEmptyString(name) ? name.trim() : undefined,
  };
}

export function validateLoginInput(body: unknown): LoginInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const { email, password } = body as Record<string, unknown>;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new AppError('Email and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    email: email.toLowerCase().trim(),
    password,
  };
}

export function validateRefreshInput(body: unknown): RefreshInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const { refreshToken } = body as Record<string, unknown>;

  if (!isNonEmptyString(refreshToken)) {
    throw new AppError('Refresh token is required', HTTP_STATUS.BAD_REQUEST);
  }

  return { refreshToken };
}
