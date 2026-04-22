import {
  HousekeepingStatus,
  InvoiceStatus,
  MaintenanceStatus,
  Prisma,
  ReservationStatus,
  RoomStatus,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { toNumber } from '../billing/billing.calculations';
import { ReportFilterQuery } from './reports.validators';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildInvoiceDateFilter(filters: ReportFilterQuery): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};

  if (filters.hotelId) {
    where.reservation = { hotelId: filters.hotelId };
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return where;
}

export async function getOccupancyReport(filters: ReportFilterQuery) {
  const roomWhere: Prisma.RoomWhereInput = filters.hotelId ? { hotelId: filters.hotelId } : {};

  const [totalRooms, occupiedRooms, availableRooms] = await Promise.all([
    prisma.room.count({ where: roomWhere }),
    prisma.room.count({ where: { ...roomWhere, status: RoomStatus.OCCUPIED } }),
    prisma.room.count({ where: { ...roomWhere, status: RoomStatus.AVAILABLE } }),
  ]);

  const occupancyRate =
    totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0;

  return { occupancyRate, occupiedRooms, availableRooms, totalRooms };
}

export async function getRevenueReport(filters: ReportFilterQuery) {
  const baseWhere = buildInvoiceDateFilter(filters);

  const [paidInvoices, unpaidInvoices, revenueAggregate, outstandingAggregate, allInvoices] =
    await Promise.all([
      prisma.invoice.count({
        where: { ...baseWhere, status: InvoiceStatus.PAID },
      }),
      prisma.invoice.count({
        where: {
          ...baseWhere,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        },
      }),
      prisma.invoice.aggregate({
        where: { ...baseWhere, status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: baseWhere,
        _avg: { totalAmount: true },
        _count: true,
      }),
    ]);

  const totalRevenue = toNumber(revenueAggregate._sum.totalAmount ?? 0);
  const outstandingRevenue = toNumber(outstandingAggregate._sum.totalAmount ?? 0);
  const averageInvoiceValue =
    allInvoices._count > 0 ? toNumber(allInvoices._avg.totalAmount ?? 0) : 0;

  return {
    totalRevenue,
    outstandingRevenue,
    averageInvoiceValue: Number(averageInvoiceValue.toFixed(2)),
    paidInvoices,
    unpaidInvoices,
  };
}

export async function getOperationsReport(filters: ReportFilterQuery) {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const maintenanceWhere: Prisma.MaintenanceRequestWhereInput = {
    status: {
      in: [MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS],
    },
    ...(filters.hotelId ? { room: { hotelId: filters.hotelId } } : {}),
  };

  const housekeepingWhere: Prisma.HousekeepingTaskWhereInput = {
    status: { not: HousekeepingStatus.READY },
    ...(filters.hotelId ? { room: { hotelId: filters.hotelId } } : {}),
  };

  const reservationWhere: Prisma.ReservationWhereInput = {
    ...(filters.hotelId ? { hotelId: filters.hotelId } : {}),
    status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
  };

  const [openMaintenance, activeHousekeeping, reservationsToday, checkoutsToday] =
    await Promise.all([
      prisma.maintenanceRequest.count({ where: maintenanceWhere }),
      prisma.housekeepingTask.count({ where: housekeepingWhere }),
      prisma.reservation.count({
        where: {
          ...reservationWhere,
          checkInDate: { gte: dayStart, lte: dayEnd },
        },
      }),
      prisma.reservation.count({
        where: {
          ...reservationWhere,
          checkOutDate: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

  return { openMaintenance, activeHousekeeping, reservationsToday, checkoutsToday };
}
