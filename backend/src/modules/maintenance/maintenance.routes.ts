import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import {
  create,
  getAll,
  getById,
  update,
  assign,
  start,
  resolve,
  close,
} from './maintenance.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.MAINTENANCE_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.MAINTENANCE_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(update));
router.post('/:id/assign', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(assign));
router.post('/:id/start', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(start));
router.post('/:id/resolve', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(resolve));
router.post('/:id/close', requirePermission(PERMISSIONS.MAINTENANCE_WRITE), asyncHandler(close));

export { router as maintenanceRouter };
