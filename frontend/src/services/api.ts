import { useAuthStore } from '@/store/authStore';
import type { AuthResponse, LoginCredentials, User } from '@/types/auth';
import type { Hotel, Room, RoomType, CreateHotelInput, RoomFilters } from '@/types/hotel';
import type {
  Guest,
  Reservation,
  CreateGuestInput,
  CreateReservationInput,
  ReservationFilters,
  DashboardMetrics,
  ReservationStatus,
} from '@/types/reservation';
import type {
  HousekeepingTask,
  MaintenanceRequest,
  CreateMaintenanceInput,
} from '@/types/operations';
import type {
  Invoice,
  Payment,
  CreateInvoiceItemInput,
  RecordPaymentInput,
  InvoiceFilters,
  PaymentFilters,
} from '@/types/billing';
import type {
  Notification,
  AuditLog,
  AuditLogFilters,
  OccupancyReport,
  RevenueReport,
  OperationsReport,
  ReportFilters,
} from '@/types/notifications';
import type {
  PaginatedApiResponse,
  PaginationQuery,
  SearchResults,
  ExportFormat,
} from '@/types/api';
import type { RoomStatus } from '@/types/hotel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function appendPagination(
  params: URLSearchParams,
  pagination?: PaginationQuery,
): void {
  if (pagination?.page) params.set('page', String(pagination.page));
  if (pagination?.limit) params.set('limit', String(pagination.limit));
  if (pagination?.sortBy) params.set('sortBy', pagination.sortBy);
  if (pagination?.sortOrder) params.set('sortOrder', pagination.sortOrder);
}

export interface ApiError {
  status: 'error';
  message: string;
}

interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401 && accessToken && !endpoint.includes('/auth/')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        status: 'error',
        message: response.statusText,
      }));
      throw new Error(error.message);
    }

    return response.json() as Promise<T>;
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        useAuthStore.getState().logout();
        return false;
      }

      const data = (await response.json()) as AuthResponse;
      useAuthStore.getState().setAuth(data.data.user, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
      return true;
    } catch {
      useAuthStore.getState().logout();
      return false;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        status: 'error',
        message: response.statusText,
      }));
      throw new Error(error.message);
    }

    return response.json() as Promise<AuthResponse>;
  }

  async logout(): Promise<void> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await this.request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Proceed with local logout even if API call fails
      }
    }
    useAuthStore.getState().logout();
  }

  async getMe(): Promise<ApiSuccessResponse<User>> {
    return this.request<ApiSuccessResponse<User>>('/api/users/me');
  }

  async getHealth(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('/health');
  }

  async getHotels(pagination?: PaginationQuery): Promise<PaginatedApiResponse<Hotel>> {
    const params = new URLSearchParams();
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Hotel>>(`/api/hotels${query}`);
  }

  async createHotel(input: CreateHotelInput): Promise<ApiSuccessResponse<Hotel>> {
    return this.request<ApiSuccessResponse<Hotel>>('/api/hotels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getRoomTypes(hotelId?: string): Promise<ApiSuccessResponse<RoomType[]>> {
    const query = hotelId ? `?hotelId=${hotelId}` : '';
    return this.request<ApiSuccessResponse<RoomType[]>>(`/api/room-types${query}`);
  }

  async getRooms(
    filters?: RoomFilters,
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<Room>> {
    const params = new URLSearchParams();
    if (filters?.hotelId) params.set('hotelId', filters.hotelId);
    if (filters?.roomTypeId) params.set('roomTypeId', filters.roomTypeId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.floorId) params.set('floorId', filters.floorId);
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Room>>(`/api/rooms${query}`);
  }

  async bulkUpdateRoomStatus(
    roomIds: string[],
    status: RoomStatus,
  ): Promise<ApiSuccessResponse<Room[]>> {
    return this.request<ApiSuccessResponse<Room[]>>('/api/rooms/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ roomIds, status }),
    });
  }

  async getGuests(pagination?: PaginationQuery): Promise<PaginatedApiResponse<Guest>> {
    const params = new URLSearchParams();
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Guest>>(`/api/guests${query}`);
  }

  async createGuest(input: CreateGuestInput): Promise<ApiSuccessResponse<Guest>> {
    return this.request<ApiSuccessResponse<Guest>>('/api/guests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getReservations(
    filters?: ReservationFilters,
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<Reservation>> {
    const params = new URLSearchParams();
    if (filters?.hotelId) params.set('hotelId', filters.hotelId);
    if (filters?.roomId) params.set('roomId', filters.roomId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.guestId) params.set('guestId', filters.guestId);
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Reservation>>(`/api/reservations${query}`);
  }

  async bulkCancelReservations(
    reservationIds: string[],
  ): Promise<ApiSuccessResponse<Reservation[]>> {
    return this.request<ApiSuccessResponse<Reservation[]>>('/api/reservations/bulk-cancel', {
      method: 'POST',
      body: JSON.stringify({ reservationIds }),
    });
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<ApiSuccessResponse<Reservation>> {
    return this.request<ApiSuccessResponse<Reservation>>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateReservation(
    id: string,
    input: { status?: ReservationStatus },
  ): Promise<ApiSuccessResponse<Reservation>> {
    return this.request<ApiSuccessResponse<Reservation>>(`/api/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async checkInReservation(id: string): Promise<ApiSuccessResponse<Reservation>> {
    return this.request<ApiSuccessResponse<Reservation>>(`/api/reservations/${id}/check-in`, {
      method: 'POST',
    });
  }

  async checkOutReservation(id: string): Promise<ApiSuccessResponse<Reservation>> {
    return this.request<ApiSuccessResponse<Reservation>>(`/api/reservations/${id}/check-out`, {
      method: 'POST',
    });
  }

  async getDashboardMetrics(): Promise<ApiSuccessResponse<DashboardMetrics>> {
    return this.request<ApiSuccessResponse<DashboardMetrics>>('/api/dashboard/metrics');
  }

  async getHousekeepingTasks(
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<HousekeepingTask>> {
    const params = new URLSearchParams();
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<HousekeepingTask>>(
      `/api/housekeeping/tasks${query}`,
    );
  }

  async startHousekeepingTask(id: string): Promise<ApiSuccessResponse<HousekeepingTask>> {
    return this.request<ApiSuccessResponse<HousekeepingTask>>(
      `/api/housekeeping/tasks/${id}/start`,
      { method: 'POST' },
    );
  }

  async inspectHousekeepingTask(id: string): Promise<ApiSuccessResponse<HousekeepingTask>> {
    return this.request<ApiSuccessResponse<HousekeepingTask>>(
      `/api/housekeeping/tasks/${id}/inspect`,
      { method: 'POST' },
    );
  }

  async completeHousekeepingTask(id: string): Promise<ApiSuccessResponse<HousekeepingTask>> {
    return this.request<ApiSuccessResponse<HousekeepingTask>>(
      `/api/housekeeping/tasks/${id}/complete`,
      { method: 'POST' },
    );
  }

  async getMaintenanceRequests(
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<MaintenanceRequest>> {
    const params = new URLSearchParams();
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<MaintenanceRequest>>(`/api/maintenance${query}`);
  }

  async bulkAssignMaintenance(
    requestIds: string[],
    assignedToUserId: string,
  ): Promise<ApiSuccessResponse<MaintenanceRequest[]>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest[]>>('/api/maintenance/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ requestIds, assignedToUserId }),
    });
  }

  async createMaintenanceRequest(
    input: CreateMaintenanceInput,
  ): Promise<ApiSuccessResponse<MaintenanceRequest>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest>>('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async assignMaintenanceRequest(
    id: string,
    assignedToUserId: string,
  ): Promise<ApiSuccessResponse<MaintenanceRequest>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest>>(`/api/maintenance/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedToUserId }),
    });
  }

  async startMaintenanceRequest(id: string): Promise<ApiSuccessResponse<MaintenanceRequest>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest>>(`/api/maintenance/${id}/start`, {
      method: 'POST',
    });
  }

  async resolveMaintenanceRequest(id: string): Promise<ApiSuccessResponse<MaintenanceRequest>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest>>(`/api/maintenance/${id}/resolve`, {
      method: 'POST',
    });
  }

  async closeMaintenanceRequest(id: string): Promise<ApiSuccessResponse<MaintenanceRequest>> {
    return this.request<ApiSuccessResponse<MaintenanceRequest>>(`/api/maintenance/${id}/close`, {
      method: 'POST',
    });
  }

  async getInvoices(
    filters?: InvoiceFilters,
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<Invoice>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.reservationId) params.set('reservationId', filters.reservationId);
    if (filters?.guestId) params.set('guestId', filters.guestId);
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Invoice>>(`/api/invoices${query}`);
  }

  async getInvoice(id: string): Promise<ApiSuccessResponse<Invoice>> {
    return this.request<ApiSuccessResponse<Invoice>>(`/api/invoices/${id}`);
  }

  async issueInvoice(id: string): Promise<ApiSuccessResponse<Invoice>> {
    return this.request<ApiSuccessResponse<Invoice>>(`/api/invoices/${id}/issue`, {
      method: 'POST',
    });
  }

  async voidInvoice(id: string): Promise<ApiSuccessResponse<Invoice>> {
    return this.request<ApiSuccessResponse<Invoice>>(`/api/invoices/${id}/void`, {
      method: 'POST',
    });
  }

  async recordPayment(
    id: string,
    input: RecordPaymentInput,
  ): Promise<ApiSuccessResponse<Invoice>> {
    return this.request<ApiSuccessResponse<Invoice>>(`/api/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async addInvoiceItem(
    id: string,
    input: CreateInvoiceItemInput,
  ): Promise<ApiSuccessResponse<Invoice>> {
    return this.request<ApiSuccessResponse<Invoice>>(`/api/invoices/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getPayments(
    filters?: PaymentFilters,
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<Payment>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.reservationId) params.set('reservationId', filters.reservationId);
    if (filters?.guestId) params.set('guestId', filters.guestId);
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Payment>>(`/api/payments${query}`);
  }

  async getNotifications(
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<Notification>> {
    const params = new URLSearchParams();
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<Notification>>(`/api/notifications${query}`);
  }

  async bulkMarkNotificationsRead(
    notificationIds: string[],
  ): Promise<ApiSuccessResponse<Notification[]>> {
    return this.request<ApiSuccessResponse<Notification[]>>('/api/notifications/bulk-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }

  async markNotificationRead(id: string): Promise<ApiSuccessResponse<Notification>> {
    return this.request<ApiSuccessResponse<Notification>>(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead(): Promise<ApiSuccessResponse<Notification[]>> {
    return this.request<ApiSuccessResponse<Notification[]>>('/api/notifications/read-all', {
      method: 'POST',
    });
  }

  async getAuditLogs(
    filters?: AuditLogFilters,
    pagination?: PaginationQuery,
  ): Promise<PaginatedApiResponse<AuditLog>> {
    const params = new URLSearchParams();
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    appendPagination(params, pagination);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedApiResponse<AuditLog>>(`/api/audit-logs${query}`);
  }

  async globalSearch(q: string): Promise<ApiSuccessResponse<SearchResults>> {
    return this.request<ApiSuccessResponse<SearchResults>>(
      `/api/search${buildQueryString({ q })}`,
    );
  }

  async downloadExport(
    type: 'reservations' | 'invoices' | 'audit-logs',
    format: ExportFormat,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/exports/${type}?format=${format}`;
    const accessToken = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        status: 'error',
        message: response.statusText,
      }));
      throw new Error(error.message);
    }

    const blob = await response.blob();
    const filename = `${type}.${format}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async getOccupancyReport(filters?: ReportFilters): Promise<ApiSuccessResponse<OccupancyReport>> {
    const params = new URLSearchParams();
    if (filters?.hotelId) params.set('hotelId', filters.hotelId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiSuccessResponse<OccupancyReport>>(`/api/reports/occupancy${query}`);
  }

  async getRevenueReport(filters?: ReportFilters): Promise<ApiSuccessResponse<RevenueReport>> {
    const params = new URLSearchParams();
    if (filters?.hotelId) params.set('hotelId', filters.hotelId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiSuccessResponse<RevenueReport>>(`/api/reports/revenue${query}`);
  }

  async getOperationsReport(filters?: ReportFilters): Promise<ApiSuccessResponse<OperationsReport>> {
    const params = new URLSearchParams();
    if (filters?.hotelId) params.set('hotelId', filters.hotelId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiSuccessResponse<OperationsReport>>(`/api/reports/operations${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
