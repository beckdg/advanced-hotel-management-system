export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'DIRTY'
  | 'CLEANING'
  | 'OUT_OF_SERVICE';

export interface Hotel {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  floors?: Floor[];
  roomTypes?: RoomType[];
  _count?: { rooms: number };
}

export interface Floor {
  id: string;
  hotelId: string;
  name: string;
  floorNumber: number;
  description?: string | null;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description?: string | null;
  maxOccupancy: number;
  baseRate: string | number;
  hotel?: { id: string; name: string };
  _count?: { rooms: number };
}

export interface Amenity {
  id: string;
  name: string;
  description?: string | null;
  _count?: { rooms: number };
}

export interface Room {
  id: string;
  hotelId: string;
  roomNumber: string;
  floorId: string;
  roomTypeId: string;
  status: RoomStatus;
  hotel: { id: string; name: string };
  floor: { id: string; name: string; floorNumber: number };
  roomType: { id: string; name: string; baseRate: string | number; maxOccupancy: number };
  amenities: { amenity: Amenity }[];
}

export interface CreateHotelInput {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface RoomFilters {
  hotelId?: string;
  roomTypeId?: string;
  status?: RoomStatus;
  floorId?: string;
}
