import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { hotelsRouter, roomTypesRouter } from './hotels';
import { roomsRouter } from './rooms';
import { amenitiesRouter } from './amenities';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/users', usersRouter);
router.use('/api/hotels', hotelsRouter);
router.use('/api/room-types', roomTypesRouter);
router.use('/api/rooms', roomsRouter);
router.use('/api/amenities', amenitiesRouter);

export { router as apiRouter };
