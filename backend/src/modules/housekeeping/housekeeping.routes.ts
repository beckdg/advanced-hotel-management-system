import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById, update, start, inspect, complete } from './housekeeping.controller';

const router = Router();

router.use(requireAuth);

router.post('/tasks', requirePermission(PERMISSIONS.HOUSEKEEPING_WRITE), asyncHandler(create));
router.get('/tasks', requirePermission(PERMISSIONS.HOUSEKEEPING_READ), asyncHandler(getAll));
router.get('/tasks/:id', requirePermission(PERMISSIONS.HOUSEKEEPING_READ), asyncHandler(getById));
router.patch('/tasks/:id', requirePermission(PERMISSIONS.HOUSEKEEPING_WRITE), asyncHandler(update));
router.post('/tasks/:id/start', requirePermission(PERMISSIONS.HOUSEKEEPING_WRITE), asyncHandler(start));
router.post('/tasks/:id/inspect', requirePermission(PERMISSIONS.HOUSEKEEPING_WRITE), asyncHandler(inspect));
router.post('/tasks/:id/complete', requirePermission(PERMISSIONS.HOUSEKEEPING_WRITE), asyncHandler(complete));

export { router as housekeepingRouter };
