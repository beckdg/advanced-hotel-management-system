import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById, update, checkIn, checkOut, bulkCancel } from './reservations.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.RESERVATIONS_WRITE), asyncHandler(create));
router.post('/bulk-cancel', requirePermission(PERMISSIONS.RESERVATIONS_WRITE), asyncHandler(bulkCancel));
router.get('/', requirePermission(PERMISSIONS.RESERVATIONS_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.RESERVATIONS_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.RESERVATIONS_WRITE), asyncHandler(update));
router.post(
  '/:id/check-in',
  requirePermission(PERMISSIONS.RESERVATIONS_WRITE),
  asyncHandler(checkIn),
);
router.post(
  '/:id/check-out',
  requirePermission(PERMISSIONS.RESERVATIONS_WRITE),
  asyncHandler(checkOut),
);

export { router as reservationsRouter };
