import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById, update } from './guests.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.GUESTS_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.GUESTS_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.GUESTS_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.GUESTS_WRITE), asyncHandler(update));

export { router as guestsRouter };
