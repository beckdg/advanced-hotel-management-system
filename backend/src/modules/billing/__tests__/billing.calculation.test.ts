import { Prisma } from '@prisma/client';
import {
  calculateNights,
  calculateRoomCharge,
  calculateInvoiceTotals,
  calculateItemTotal,
} from '../billing.calculations';

describe('Billing calculations', () => {
  describe('calculateNights', () => {
    it('should calculate nights between dates', () => {
      const checkIn = new Date('2026-07-01');
      const checkOut = new Date('2026-07-05');
      expect(calculateNights(checkIn, checkOut)).toBe(4);
    });

    it('should return at least 1 night', () => {
      const date = new Date('2026-07-01');
      expect(calculateNights(date, date)).toBe(1);
    });
  });

  describe('calculateRoomCharge', () => {
    it('should compute nights * baseRate', () => {
      const result = calculateRoomCharge(
        new Date('2026-07-01'),
        new Date('2026-07-04'),
        150,
      );
      expect(result.nights).toBe(3);
      expect(result.unitPrice).toBe(150);
      expect(result.totalPrice).toBe(450);
    });

    it('should work with Prisma Decimal baseRate', () => {
      const result = calculateRoomCharge(
        new Date('2026-07-01'),
        new Date('2026-07-03'),
        new Prisma.Decimal('200.00'),
      );
      expect(result.totalPrice).toBe(400);
    });
  });

  describe('calculateItemTotal', () => {
    it('should multiply quantity by unit price', () => {
      expect(calculateItemTotal(3, 50)).toBe(150);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should compute subtotal + tax - discount', () => {
      const items = [
        { totalPrice: 400 },
        { totalPrice: 50 },
      ];
      const result = calculateInvoiceTotals(items, 45, 20);
      expect(result.subtotal).toBe(450);
      expect(result.totalAmount).toBe(475);
    });

    it('should handle zero tax and discount', () => {
      const result = calculateInvoiceTotals([{ totalPrice: 300 }], 0, 0);
      expect(result.subtotal).toBe(300);
      expect(result.totalAmount).toBe(300);
    });
  });
});
