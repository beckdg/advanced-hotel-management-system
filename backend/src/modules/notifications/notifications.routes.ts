import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { getAll, markRead, markAllRead } from './notifications.controller';

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.NOTIFICATIONS_READ));

router.get('/', asyncHandler(getAll));
router.post('/read-all', asyncHandler(markAllRead));
router.post('/:id/read', asyncHandler(markRead));

export { router as notificationsRouter };
