import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { getHealth } from './health.controller';

const router = Router();

router.get('/', asyncHandler(getHealth));

export { router as healthRouter };
