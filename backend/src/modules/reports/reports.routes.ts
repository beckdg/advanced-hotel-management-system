import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { occupancy, revenue, operations } from './reports.controller';

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.REPORTS_READ));

router.get('/occupancy', asyncHandler(occupancy));
router.get('/revenue', asyncHandler(revenue));
router.get('/operations', asyncHandler(operations));

export { router as reportsRouter };
