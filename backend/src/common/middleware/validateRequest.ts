import { Request, Response, NextFunction } from 'express';

type ValidatorFn<T> = (input: unknown) => T;

export function validateBody<T>(validator: ValidatorFn<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = validator(req.body);
    next();
  };
}

export function validateQuery<T>(validator: ValidatorFn<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { validatedQuery: T }).validatedQuery = validator(req.query);
    next();
  };
}
