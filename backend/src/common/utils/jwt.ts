import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { TokenPayload } from '../../modules/rbac/rbac.types';

const accessSignOptions: SignOptions = {
  expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn'],
};

const refreshSignOptions: SignOptions = {
  expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'],
};

export function signAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.jwtAccessSecret, accessSignOptions);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtRefreshSecret, refreshSignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function getRefreshTokenExpiry(): Date {
  const match = env.jwtRefreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * multipliers[unit]);
}
