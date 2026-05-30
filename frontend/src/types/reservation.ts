import type { AuditLog, Notification } from '@/types/notifications';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { reservations: number };
}

export interface ReservationGuest {
  guest: Guest;
  isPrimary: boolean;
}

export interface Reservation {
  id: string;
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  totalGuests: number;
  notes?: string | null;
  hotel: { id: string; name: string };
  room: {
    id: string;
    roomNumber: string;
    status: string;
    roomType: { id: string; name: string; maxOccupancy: number };
  };
  guests: ReservationGuest[];
}

export interface CreateGuestInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface CreateReservationInput {
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  totalGuests: number;
  notes?: string;
  guestIds: string[];
  status?: ReservationStatus;
}

export interface ReservationFilters {
  hotelId?: string;
  roomId?: string;
  status?: ReservationStatus;
  guestId?: string;
}

export interface DashboardMetrics {
  totalRooms: number;
  activeReservations: number;
  occupiedRooms: number;
  dirtyRooms: number;
  activeMaintenanceRequests: number;
  availableRooms: number;
  totalRevenue: number;
  outstandingInvoices: number;
  paidInvoices: number;
  recentNotifications: Notification[];
  unreadNotifications: number;
  recentAuditActivity: AuditLog[];
}
