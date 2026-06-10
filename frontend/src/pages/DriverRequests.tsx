import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { RideStatusBadge } from '../components/StatusBadge';
import type { Ride } from '../types';
import { Bell, Check, X, MapPin, User, IndianRupee } from 'lucide-react';

export default function DriverRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Ride[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadRequests = () => {
    if (user?.driverProfile?.status === 'ONLINE') {
      api.rides.pending().then((r) => setRequests(r as Ride[])).catch(() => {});
    } else {
      setRequests([]);
    }
  };

  useEffect(() => {
    loadRequests();
    const socket = getSocket();
    socket.on('ride:requested', loadRequests);
    socket.on('ride:accepted', loadRequests);
    socket.on('ride:cancelled', loadRequests);
    return () => {
      socket.off('ride:requested', loadRequests);
      socket.off('ride:accepted', loadRequests);
      socket.off('ride:cancelled', loadRequests);
    };
  }, [user?.driverProfile?.status]);

  const acceptRide = async (id: string) => {
    setLoading(id);
    try {
      await api.rides.accept(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setLoading(null);
    }
  };

  const isOnline = user?.driverProfile?.status === 'ONLINE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary-600" />
          Ride Requests
        </h1>
        <p className="text-slate-500">
          {isOnline ? 'Incoming ride requests appear here in real-time' : 'Go online to receive requests'}
        </p>
      </div>

      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-800 font-medium">You are currently offline</p>
          <p className="text-amber-600 text-sm mt-1">Go online from the dashboard to start receiving ride requests</p>
        </div>
      )}

      {isOnline && requests.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Waiting for ride requests...</p>
          <p className="text-sm text-slate-400 mt-1">New requests will appear instantly</p>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((ride) => (
          <div key={ride.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse-once">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RideStatusBadge status={ride.status} />
                  {ride.scheduledAt && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Scheduled</span>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">{ride.pickupLocation}</p>
                    <p className="text-sm text-slate-500">→ {ride.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {ride.passenger?.name}
                  </span>
                  {ride.fare && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" /> ₹{ride.fare}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptRide(ride.id)}
                  disabled={loading === ride.id}
                  className="flex items-center gap-1 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  <Check className="w-4 h-4" /> Accept
                </button>
                <button className="flex items-center gap-1 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
