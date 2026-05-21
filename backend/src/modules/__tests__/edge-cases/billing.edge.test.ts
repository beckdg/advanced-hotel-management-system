import request from 'supertest';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
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
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    invoiceItem: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    payment: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../notifications', () => ({
  ...jest.requireActual('../../notifications'),
  notifyPaymentReceived: jest.fn(),
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
const app = createApp();
const mockInvoiceId = 'invoice-edge-1';

function auth() {
  return `Bearer ${signAccessToken({
    sub: mockAdminUser.id,
    email: mockAdminUser.email,
    roleId: mockAdminUser.roleId,
    roleName: mockAdminUser.roleName,
  })}`;
}

const baseInvoice = {
  id: mockInvoiceId,
  reservationId: 'res-1',
  status: InvoiceStatus.DRAFT,
  subtotal: 400,
  taxAmount: 40,
  discountAmount: 0,
  totalAmount: 440,
  issuedAt: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  payments: [],
  reservation: {
    id: 'res-1',
    checkInDate: new Date(),
    checkOutDate: new Date(),
    status: 'CONFIRMED',
    hotel: { id: 'h1', name: 'Hotel' },
    room: { id: 'r1', roomNumber: '101', roomType: { id: 'rt', name: 'Std', baseRate: 100 } },
    guests: [],
  },
};

describe('Billing edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserById.mockResolvedValue(mockAdminUser);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('rejects payment with zero amount', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...baseInvoice,
      status: InvoiceStatus.ISSUED,
    });

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', auth())
      .send({ amount: 0, method: 'CASH' });
    expect(res.status).toBe(400);
  });

  it('rejects payment on DRAFT invoice', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(baseInvoice);

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', auth())
      .send({ amount: 100, method: 'CASH' });
    expect(res.status).toBe(400);
  });

  it('rejects void on PAID invoice', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...baseInvoice,
      status: InvoiceStatus.PAID,
    });

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/void`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('rejects issue on already ISSUED invoice', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...baseInvoice,
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/issue`)
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown invoice', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/invoices/unknown`)
      .set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  it('filters invoices by status', async () => {
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);

    await request(app)
      .get('/api/invoices?status=PAID')
      .set('Authorization', auth())
      .expect(200);

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: InvoiceStatus.PAID }),
      }),
    );
  });

  it('paginates payments list', async () => {
    (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.payment.count as jest.Mock).mockResolvedValue(25);

    const res = await request(app)
      .get('/api/payments?page=1&limit=10&sortBy=amount&sortOrder=desc')
      .set('Authorization', auth());
    expect(res.body.pagination.total).toBe(25);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('rejects invoice item with negative quantity', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(baseInvoice);

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/items`)
      .set('Authorization', auth())
      .send({
        description: 'Bad item',
        quantity: -1,
        unitPrice: 10,
        category: 'MISC',
      });
    expect(res.status).toBe(400);
  });

  it('rejects overpayment beyond invoice total', async () => {
    (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...baseInvoice,
      status: InvoiceStatus.ISSUED,
      payments: [{ amount: 400, status: PaymentStatus.COMPLETED }],
    });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        payment: { create: jest.fn() },
        invoice: { update: jest.fn(), findUnique: jest.fn() },
      }),
    );

    const res = await request(app)
      .post(`/api/invoices/${mockInvoiceId}/pay`)
      .set('Authorization', auth())
      .send({ amount: 500, method: 'CASH' });
    expect(res.status).toBe(400);
  });
});
