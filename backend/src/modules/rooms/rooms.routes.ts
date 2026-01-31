import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { create, getAll, getById, update } from './rooms.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.ROOMS_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.ROOMS_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.ROOMS_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.ROOMS_WRITE), asyncHandler(update));

export { router as roomsRouter };
