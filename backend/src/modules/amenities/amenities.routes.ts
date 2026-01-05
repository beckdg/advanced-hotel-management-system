import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById } from './amenities.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.AMENITIES_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.AMENITIES_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.AMENITIES_READ), asyncHandler(getById));

export { router as amenitiesRouter };
