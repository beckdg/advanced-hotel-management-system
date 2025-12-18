import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { verifyAccessToken } from '../../common/utils/jwt';
import { getAuthUserById, userHasPermission } from './rbac.service';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await getAuthUserById(payload.sub);

    if (!user) {
      return next(new AppError('User not found or inactive', HTTP_STATUS.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED));
  }
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    }

    if (!userHasPermission(req.user, permission)) {
      return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
}
