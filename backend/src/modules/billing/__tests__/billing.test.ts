import request from 'supertest';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../common/utils/jwt';
import { mockAdminUser } from '../../../test/helpers';

jest.mock('../../../config/database', () => ({
  prisma: {
    reservation: { findUnique: jest.fn() },
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    invoiceItem: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    payment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../rbac/rbac.service', () => ({
  getAuthUserById: jest.fn(),
  mapUserToAuthUser: jest.requireActual('../../rbac/rbac.service').mapUserToAuthUser,
  userHasPermission: jest.requireActual('../../rbac/rbac.service').userHasPermission,
}));

import { prisma } from '../../../config/database';
import { getAuthUserById } from '../../rbac/rbac.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUserById = getAuthUserById as jest.MockedFunction<typeof getAuthUserById>;

const mockReservationId = 'reservation-test-id';
const mockInvoiceId = 'invoice-test-id';

const mockInvoice = {
  id: mockInvoiceId,
  reservationId: mockReservationId,
  status: InvoiceStatus.DRAFT,
  subtotal: 400,
  taxAmount: 0,
  discountAmount: 0,
  totalAmount: 400,
  issuedAt: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      invoiceId: mockInvoiceId,
      description: 'Room charge',
      quantity: 4,
      unitPrice: 100,
      totalPrice: 400,
      category: 'ROOM',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  payments: [],
  reservation: {
    id: mockReservationId,
    checkInDate: new Date('2026-07-01'),
    checkOutDate: new Date('2026-07-05'),
    status: 'CONFIRMED',
    hotel: { id: 'hotel-1', name: 'Test Hotel' },
    room: {
      id: 'room-1',
      roomNumber: '101',
      roomType: { id: 'rt-1', name: 'Standard', baseRate: 100 },
    },
    guests: [],
  },
};

describe('Billing API', () => {
  const app = createApp();

  function authHeader() {
    return `Bearer ${signAccessToken({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      roleId: mockAdminUser.roleId,
      roleName: mockAdminUser.roleName,
    })}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('should issue invoice (DRAFT -> ISSUED)', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date(),
    });

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/issue`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('ISSUED');
  });

  it('should record full payment (ISSUED -> PAID)', async () => {
    const issuedInvoice = { ...mockInvoice, status: InvoiceStatus.ISSUED, totalAmount: 400 };

    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(issuedInvoice);
    (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue([]);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        payment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            amount: 400,
            status: PaymentStatus.COMPLETED,
          }),
          findMany: jest.fn().mockResolvedValue([{ amount: 400, status: PaymentStatus.COMPLETED }]),
        },
        invoice: {
          update: jest.fn().mockResolvedValue({
            ...issuedInvoice,
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', authHeader())
      .send({ amount: 400, method: PaymentMethod.CARD })
      .expect(200);

    expect(response.body.data.status).toBe('PAID');
  });

  it('should record partial payment (ISSUED -> PARTIALLY_PAID)', async () => {
    const issuedInvoice = { ...mockInvoice, status: InvoiceStatus.ISSUED, totalAmount: 400 };

    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(issuedInvoice);
    (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue([]);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        payment: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([{ amount: 200, status: PaymentStatus.COMPLETED }]),
        },
        invoice: {
          update: jest.fn().mockResolvedValue({
            ...issuedInvoice,
            status: InvoiceStatus.PARTIALLY_PAID,
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', authHeader())
      .send({ amount: 200, method: PaymentMethod.CASH })
      .expect(200);

    expect(response.body.data.status).toBe('PARTIALLY_PAID');
  });

  it('should void invoice (ISSUED -> VOID)', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.ISSUED,
    });
    (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.VOID,
    });

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/void`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(response.body.data.status).toBe('VOID');
  });

  it('should reject invalid transition DRAFT -> PAID via pay', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', authHeader())
      .send({ amount: 400, method: PaymentMethod.CARD })
      .expect(400);

    expect(response.body.message).toContain('issued or partially paid');
  });

  it('should add charge to draft invoice', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        invoiceItem: { create: jest.fn() },
        invoice: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockInvoice,
            items: [
              ...mockInvoice.items,
              {
                id: 'item-2',
                totalPrice: 25,
                category: 'MINIBAR',
              },
            ],
          }),
          update: jest.fn().mockResolvedValue({
            ...mockInvoice,
            subtotal: 425,
            totalAmount: 425,
          }),
        },
      }),
    );

    const response = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/items`)
      .set('Authorization', authHeader())
      .send({
        description: 'Minibar',
        quantity: 1,
        unitPrice: 25,
        category: 'MINIBAR',
      })
      .expect(200);

    expect(response.body.data.totalAmount).toBe(425);
  });
});
