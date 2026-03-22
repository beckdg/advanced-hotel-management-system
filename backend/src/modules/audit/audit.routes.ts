import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { getAll } from './audit.controller';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission(PERMISSIONS.AUDIT_READ), asyncHandler(getAll));

export { router as auditRouter };
