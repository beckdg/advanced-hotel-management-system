import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById, update } from './hotels.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.HOTELS_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.HOTELS_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.HOTELS_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.HOTELS_WRITE), asyncHandler(update));

export { router as hotelsRouter };
