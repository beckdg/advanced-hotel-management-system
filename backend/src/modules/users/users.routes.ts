import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { me, getAll, getById, update } from './users.controller';

const router = Router();

router.use(requireAuth);

router.get('/me', asyncHandler(me));
router.get('/', requirePermission(PERMISSIONS.USERS_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.USERS_READ), asyncHandler(getById));
router.patch('/:id', asyncHandler(update));

export { router as usersRouter };
