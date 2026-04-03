import { Prisma } from '@prisma/client';

export const ROOM_CHARGE_CATEGORY = 'ROOM';

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

export function calculateNights(checkInDate: Date, checkOutDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay);
  return Math.max(nights, 1);
}

export function calculateRoomCharge(
  checkInDate: Date,
  checkOutDate: Date,
  baseRate: Prisma.Decimal | number,
): { nights: number; unitPrice: number; totalPrice: number } {
  const nights = calculateNights(checkInDate, checkOutDate);
  const rate = toNumber(baseRate);
  const totalPrice = Number((nights * rate).toFixed(2));
  return { nights, unitPrice: rate, totalPrice };
}

export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}

export function calculateInvoiceTotals(
  items: { totalPrice: Prisma.Decimal | number }[],
  taxAmount: Prisma.Decimal | number,
  discountAmount: Prisma.Decimal | number,
): { subtotal: number; totalAmount: number } {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);
  const tax = toNumber(taxAmount);
  const discount = toNumber(discountAmount);
  const totalAmount = Number((subtotal + tax - discount).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), totalAmount };
}
