import { InvoiceStatus } from '@prisma/client';
import { generateDraftInvoiceForReservation } from '../billing.service';

jest.mock('../../../config/database', () => ({
  prisma: {
    invoice: { findUnique: jest.fn(), create: jest.fn() },
    reservation: { findUnique: jest.fn() },
    invoiceItem: { create: jest.fn() },
  },
}));

import { prisma } from '../../../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Room charge generation', () => {
  const reservationId = 'reservation-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate DRAFT invoice with room charge item', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.reservation.findUnique as jest.Mock).mockResolvedValue({
      id: reservationId,
      checkInDate: new Date('2026-07-01'),
      checkOutDate: new Date('2026-07-05'),
      room: {
        roomType: { name: 'Deluxe', baseRate: 150 },
      },
    });

    const createdInvoice = {
      id: 'invoice-1',
      reservationId,
      status: InvoiceStatus.DRAFT,
      taxAmount: 0,
      discountAmount: 0,
      items: [
        {
          totalPrice: 600,
        },
      ],
    };

    const invoiceCreate = jest.fn().mockResolvedValue(createdInvoice);

    const tx = {
      invoice: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(createdInvoice),
        create: invoiceCreate,
        update: jest.fn().mockResolvedValue({ ...createdInvoice, subtotal: 600, totalAmount: 600 }),
      },
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: reservationId,
          checkInDate: new Date('2026-07-01'),
          checkOutDate: new Date('2026-07-05'),
          room: { roomType: { name: 'Deluxe', baseRate: 150 } },
        }),
      },
    };

    await generateDraftInvoiceForReservation(reservationId, tx as never);

    expect(invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reservationId,
          status: InvoiceStatus.DRAFT,
          items: {
            create: expect.objectContaining({
              quantity: 4,
              category: 'ROOM',
            }),
          },
        }),
      }),
    );
  });

  it('should skip if invoice already exists', async () => {
    const existing = { id: 'invoice-1', reservationId };
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(existing);

    const result = await generateDraftInvoiceForReservation(reservationId);

    expect(result).toBe(existing);
    expect(mockPrisma.reservation.findUnique).not.toHaveBeenCalled();
  });
});
