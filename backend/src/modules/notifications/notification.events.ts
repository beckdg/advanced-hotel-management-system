import { NotificationType } from '@prisma/client';
import { emitNotification } from './notifications.service';

export async function notifyReservationCreated(
  userId: string,
  reservationId: string,
  roomNumber: string,
) {
  await emitNotification({
    userId,
    type: NotificationType.RESERVATION_CREATED,
    title: 'Reservation Created',
    message: `New reservation created for room ${roomNumber} (${reservationId})`,
  });
}

export async function notifyReservationConfirmed(
  userId: string,
  reservationId: string,
  roomNumber: string,
) {
  await emitNotification({
    userId,
    type: NotificationType.RESERVATION_CONFIRMED,
    title: 'Reservation Confirmed',
    message: `Reservation confirmed for room ${roomNumber} (${reservationId})`,
  });
}

export async function notifyCheckIn(userId: string, reservationId: string, roomNumber: string) {
  await emitNotification({
    userId,
    type: NotificationType.CHECK_IN,
    title: 'Guest Checked In',
    message: `Guest checked in to room ${roomNumber} (${reservationId})`,
  });
}

export async function notifyCheckOut(userId: string, reservationId: string, roomNumber: string) {
  await emitNotification({
    userId,
    type: NotificationType.CHECK_OUT,
    title: 'Guest Checked Out',
    message: `Guest checked out from room ${roomNumber} (${reservationId})`,
  });
}

export async function notifyPaymentReceived(
  userId: string,
  invoiceId: string,
  amount: number,
) {
  await emitNotification({
    userId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Payment Received',
    message: `Payment of $${amount.toFixed(2)} recorded for invoice ${invoiceId}`,
  });
}

export async function notifyMaintenanceAssigned(
  userId: string,
  requestId: string,
  title: string,
) {
  await emitNotification({
    userId,
    type: NotificationType.MAINTENANCE_ASSIGNED,
    title: 'Maintenance Assigned',
    message: `You have been assigned maintenance request: ${title} (${requestId})`,
  });
}

export async function notifyHousekeepingAssigned(
  userId: string,
  taskId: string,
  roomNumber: string,
) {
  await emitNotification({
    userId,
    type: NotificationType.HOUSEKEEPING_ASSIGNED,
    title: 'Housekeeping Assigned',
    message: `You have been assigned housekeeping for room ${roomNumber} (${taskId})`,
  });
}
