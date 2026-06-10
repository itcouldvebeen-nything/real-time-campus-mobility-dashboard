export type UserRole = 'PASSENGER' | 'DRIVER';
export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';
export type RideStatus = 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleNumber: string;
  vehicleType: string;
  licenseNumber: string;
  isVerified: boolean;
  status: DriverStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  totalRides: number;
  averageRating: number;
  user?: { id: string; name: string; phone?: string | null };
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  driverProfile?: DriverProfile | null;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string | null;
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  destination: string;
  destLat: number;
  destLng: number;
  status: RideStatus;
  fare?: number | null;
  scheduledAt?: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  passenger?: { id: string; name: string; phone?: string | null };
  driver?: DriverProfile & { user?: { id: string; name: string; phone?: string | null } };
  rating?: Rating | null;
}

export interface Rating {
  id: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  score: number;
  feedback?: string | null;
  createdAt: string;
  passenger?: { name: string };
  ride?: { pickupLocation: string; destination: string };
}

export interface CampusLocation {
  name: string;
  lat: number;
  lng: number;
}
