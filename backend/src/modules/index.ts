import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { hotelsRouter, roomTypesRouter } from './hotels';
import { roomsRouter } from './rooms';
import { amenitiesRouter } from './amenities';
import { guestsRouter } from './guests';
import { reservationsRouter } from './reservations';
import { dashboardRouter } from './dashboard';
import { housekeepingRouter } from './housekeeping';
import { maintenanceRouter } from './maintenance';
import { invoicesRouter, invoiceItemsRouter, paymentsRouter } from './billing';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/users', usersRouter);
router.use('/api/hotels', hotelsRouter);
router.use('/api/room-types', roomTypesRouter);
router.use('/api/rooms', roomsRouter);
router.use('/api/amenities', amenitiesRouter);
router.use('/api/guests', guestsRouter);
router.use('/api/reservations', reservationsRouter);
router.use('/api/dashboard', dashboardRouter);
router.use('/api/housekeeping', housekeepingRouter);
router.use('/api/maintenance', maintenanceRouter);
router.use('/api/invoices', invoicesRouter);
router.use('/api/invoice-items', invoiceItemsRouter);
router.use('/api/payments', paymentsRouter);

export { router as apiRouter };
