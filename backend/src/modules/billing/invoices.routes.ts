import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import {
  create,
  getAll,
  getById,
  update,
  issue,
  pay,
  voidInvoiceHandler,
  addItem,
} from './billing.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(create));
router.get('/', requirePermission(PERMISSIONS.BILLING_READ), asyncHandler(getAll));
router.get('/:id', requirePermission(PERMISSIONS.BILLING_READ), asyncHandler(getById));
router.patch('/:id', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(update));
router.post('/:id/issue', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(issue));
router.post('/:id/pay', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(pay));
router.post('/:id/void', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(voidInvoiceHandler));
router.post('/:id/items', requirePermission(PERMISSIONS.BILLING_WRITE), asyncHandler(addItem));

export { router as invoicesRouter };
