import { Router } from 'express';
import { asyncHandler } from '../../common/utils';
import { requireAuth, requirePermission, PERMISSIONS } from '../rbac';
import {
  exportReservationsHandler,
  exportInvoicesHandler,
  exportAuditLogsHandler,
} from './exports.controller';

const router = Router();

router.use(requireAuth);

router.get(
  '/reservations',
  requirePermission(PERMISSIONS.RESERVATIONS_READ),
  asyncHandler(exportReservationsHandler),
);
router.get(
  '/invoices',
  requirePermission(PERMISSIONS.BILLING_READ),
  asyncHandler(exportInvoicesHandler),
);
router.get(
  '/audit-logs',
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(exportAuditLogsHandler),
);

export { router as exportsRouter };
