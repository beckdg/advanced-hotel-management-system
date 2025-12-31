import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { usersRouter } from './users';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/users', usersRouter);

export { router as apiRouter };
