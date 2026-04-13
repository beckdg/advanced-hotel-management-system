import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import { getAllPayments, getPayment } from './billing.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.BILLING_READ), asyncHandler(getAllPayments));
router.get('/:id', requirePermission(PERMISSIONS.BILLING_READ), asyncHandler(getPayment));

export { router as paymentsRouter };
