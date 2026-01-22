import { AuthUser } from '../modules/rbac/rbac.types';
import { PERMISSIONS, ROLES } from '../modules/rbac/rbac.constants';

export const mockRoleId = 'role-front-desk-id';
export const mockUserId = 'user-test-id';

export const mockAuthUser: AuthUser = {
  id: mockUserId,
  email: 'test@stayflow.com',
  name: 'Test User',
  roleId: mockRoleId,
  roleName: ROLES.FRONT_DESK,
  permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.RESERVATIONS_READ],
};

export const mockAdminUser: AuthUser = {
  id: 'admin-user-id',
  email: 'admin@stayflow.com',
  name: 'Admin User',
  roleId: 'role-admin-id',
  roleName: ROLES.SUPER_ADMIN,
  permissions: [...Object.values(PERMISSIONS)],
};

export const mockHotelId = 'hotel-test-id';
export const mockFloorId = 'floor-test-id';
export const mockRoomTypeId = 'room-type-test-id';
export const mockRoomId = 'room-test-id';
export const mockAmenityId = 'amenity-test-id';

export const mockHotel = {
  id: mockHotelId,
  name: 'Test Hotel',
  address: '123 Test St',
  city: 'Test City',
  country: 'USA',
  phone: null,
  email: null,
  timezone: 'UTC',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  floors: [],
  roomTypes: [],
  _count: { rooms: 0 },
};

export const mockRoom = {
  id: mockRoomId,
  hotelId: mockHotelId,
  roomNumber: '101',
  floorId: mockFloorId,
  roomTypeId: mockRoomTypeId,
  status: 'AVAILABLE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  hotel: { id: mockHotelId, name: 'Test Hotel' },
  floor: { id: mockFloorId, name: 'First Floor', floorNumber: 1 },
  roomType: { id: mockRoomTypeId, name: 'Standard', baseRate: 100, maxOccupancy: 2 },
  amenities: [],
};

export function createMockUserRecord(overrides: Partial<{
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  roleId: string;
  isActive: boolean;
  role: { name: string; permissions: { permission: { name: string } }[] };
}> = {}) {
  return {
    id: mockUserId,
    email: 'test@stayflow.com',
    name: 'Test User',
    passwordHash: '$2b$12$mockhash',
    roleId: mockRoleId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      name: ROLES.FRONT_DESK,
      permissions: [
        { permission: { name: PERMISSIONS.USERS_READ } },
        { permission: { name: PERMISSIONS.RESERVATIONS_READ } },
      ],
    },
    ...overrides,
  };
}
