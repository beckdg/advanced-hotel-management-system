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
import { notificationsRouter } from './notifications';
import { auditRouter } from './audit';
import { reportsRouter } from './reports';
import { searchRouter } from './search';
import { exportsRouter } from './exports';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/hotels', hotelsRouter);
router.use('/room-types', roomTypesRouter);
router.use('/rooms', roomsRouter);
router.use('/amenities', amenitiesRouter);
router.use('/guests', guestsRouter);
router.use('/reservations', reservationsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/housekeeping', housekeepingRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/invoices', invoicesRouter);
router.use('/invoice-items', invoiceItemsRouter);
router.use('/payments', paymentsRouter);
router.use('/notifications', notificationsRouter);
router.use('/audit-logs', auditRouter);
router.use('/reports', reportsRouter);
router.use('/search', searchRouter);
router.use('/exports', exportsRouter);

export { healthRouter };

export { router as apiRouter };
