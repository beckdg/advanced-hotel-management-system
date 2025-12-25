import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth } from '../rbac';
import { register, login, refresh, logout } from './auth.controller';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', requireAuth, asyncHandler(logout));

export { router as authRouter };
