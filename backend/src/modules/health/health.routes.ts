import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { getHealth, getHealthDetailsHandler } from './health.controller';

const router = Router();

router.get('/', asyncHandler(getHealth));
router.get('/details', asyncHandler(getHealthDetailsHandler));

export { router as healthRouter };
