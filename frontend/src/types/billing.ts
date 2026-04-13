export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  category: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number | string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string | null;
  processedAt?: string | null;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  reservationId: string;
  status: InvoiceStatus;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  issuedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  items: InvoiceItem[];
  payments: Payment[];
  reservation: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    hotel: { id: string; name: string };
    room: {
      id: string;
      roomNumber: string;
      roomType: { id: string; name: string; baseRate: number | string };
    };
    guests: {
      guest: { id: string; firstName: string; lastName: string; email?: string | null };
      isPrimary?: boolean;
    }[];
  };
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  reservationId?: string;
  guestId?: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  reservationId?: string;
  guestId?: string;
}
