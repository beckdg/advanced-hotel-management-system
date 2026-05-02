import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth } from '../rbac';
import { search } from './search.controller';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(search));

export { router as searchRouter };
