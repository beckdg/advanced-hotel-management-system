export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedApiResponse<T> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
}

export type ExportFormat = 'csv' | 'json';

export interface SearchResults {
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  }>;
  reservations: Array<{
    id: string;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    hotel: { id: string; name: string };
    room: { id: string; roomNumber: string };
    guests: Array<{
      guest: { id: string; firstName: string; lastName: string; email: string | null };
    }>;
  }>;
  rooms: Array<{
    id: string;
    roomNumber: string;
    status: string;
    hotel: { id: string; name: string };
    roomType: { id: string; name: string };
  }>;
  invoices: Array<{
    id: string;
    status: string;
    totalAmount: string | number;
    reservationId: string;
    reservation?: {
      id: string;
      hotel: { id: string; name: string };
    };
  }>;
  maintenance: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    room: {
      id: string;
      roomNumber: string;
      hotel: { id: string; name: string };
    };
  }>;
}
