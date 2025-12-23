import { Request, Response } from 'express';
import {
  validateRegisterInput,
  validateLoginInput,
  validateRefreshInput,
} from './auth.validators';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from './auth.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = validateRegisterInput(req.body);
  const result = await registerUser(input, getIpAddress(req));
  res.status(201).json({ status: 'success', data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = validateLoginInput(req.body);
  const result = await loginUser(input, getIpAddress(req));
  res.status(200).json({ status: 'success', data: result });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const input = validateRefreshInput(req.body);
  const result = await refreshAccessToken(input.refreshToken, getIpAddress(req));
  res.status(200).json({ status: 'success', data: result });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const input = validateRefreshInput(req.body);
  await logoutUser(input.refreshToken, req.user?.id, getIpAddress(req));
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
}
