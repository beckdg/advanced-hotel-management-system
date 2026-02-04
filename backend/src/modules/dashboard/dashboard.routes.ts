import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth } from '../rbac';
import { getMetrics } from './dashboard.controller';

const router = Router();

router.use(requireAuth);
router.get('/metrics', asyncHandler(getMetrics));

export { router as dashboardRouter };
