export type NotificationType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CONFIRMED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'PAYMENT_RECEIVED'
  | 'MAINTENANCE_ASSIGNED'
  | 'HOUSEKEEPING_ASSIGNED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; name?: string | null; email: string } | null;
}

export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export interface OccupancyReport {
  occupancyRate: number;
  occupiedRooms: number;
  availableRooms: number;
  totalRooms: number;
}

export interface RevenueReport {
  totalRevenue: number;
  outstandingRevenue: number;
  averageInvoiceValue: number;
  paidInvoices: number;
  unpaidInvoices: number;
}

export interface OperationsReport {
  openMaintenance: number;
  activeHousekeeping: number;
  reservationsToday: number;
  checkoutsToday: number;
}

export interface ReportFilters {
  hotelId?: string;
  startDate?: string;
  endDate?: string;
}
