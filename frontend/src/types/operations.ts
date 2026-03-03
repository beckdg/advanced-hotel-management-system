export type HousekeepingStatus = 'DIRTY' | 'CLEANING' | 'INSPECTING' | 'READY';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface HousekeepingTask {
  id: string;
  roomId: string;
  assignedToUserId?: string | null;
  status: HousekeepingStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    roomNumber: string;
    status: string;
    hotel: { id: string; name: string };
  };
  assignedTo?: { id: string; name: string | null; email: string } | null;
}

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  reportedByUserId: string;
  assignedToUserId?: string | null;
  title: string;
  description?: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    roomNumber: string;
    status: string;
    hotel: { id: string; name: string };
  };
  reportedBy: { id: string; name: string | null; email: string };
  assignedTo?: { id: string; name: string | null; email: string } | null;
}

export interface CreateMaintenanceInput {
  roomId: string;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
}
