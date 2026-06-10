import type { RideStatus, DriverStatus } from '../types';

const rideColors: Record<RideStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const driverColors: Record<DriverStatus, string> = {
  ONLINE: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-slate-100 text-slate-600',
  BUSY: 'bg-orange-100 text-orange-800',
};

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${rideColors[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${driverColors[status]}`}>
      {status}
    </span>
  );
}
