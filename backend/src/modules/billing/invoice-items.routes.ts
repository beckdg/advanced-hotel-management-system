import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { removeItem } from './billing.controller';

const router = Router();

router.use(requireAuth);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.BILLING_WRITE),
  asyncHandler(removeItem),
);

export { router as invoiceItemsRouter };
