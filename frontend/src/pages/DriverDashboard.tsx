import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { DriverStatusBadge, RideStatusBadge } from '../components/StatusBadge';
import type { Ride, Rating } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Car, Star, IndianRupee, ToggleLeft, ToggleRight, Clock, TrendingUp,
} from 'lucide-react';

interface DashboardData {
  profile: object;
  stats: {
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalEarnings: number;
    averageRating: number;
  };
  activeRides: Ride[];
  rideHistory: Ride[];
  ratings: Rating[];
  peakHours: { hour: number; count: number }[];
}

export default function DriverDashboard() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const isOnline = user?.driverProfile?.status === 'ONLINE' || user?.driverProfile?.status === 'BUSY';

  const loadDashboard = () => {
    api.drivers.dashboard()
      .then((d) => setData(d as DashboardData))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
    const socket = getSocket();
    socket.on('ride:requested', loadDashboard);
    socket.on('ride:completed', loadDashboard);
    socket.on('rating:new', loadDashboard);
    return () => {
      socket.off('ride:requested', loadDashboard);
      socket.off('ride:completed', loadDashboard);
      socket.off('rating:new', loadDashboard);
    };
  }, []);

  const toggleStatus = async () => {
    const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    const socket = getSocket();
    if (newStatus === 'ONLINE') {
      socket.emit('driver:goOnline', { lat: 29.8660, lng: 77.8965 });
      await api.drivers.updateStatus({ status: 'ONLINE', lat: 29.8660, lng: 77.8965 });
    } else {
      socket.emit('driver:goOffline');
      await api.drivers.updateStatus({ status: 'OFFLINE' });
    }
    await refreshUser();
    loadDashboard();
  };

  const updateRideStatus = async (rideId: string, status: string) => {
    await api.rides.updateStatus(rideId, { status });
    loadDashboard();
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load dashboard</div>;

  const chartData = data.peakHours.map((p) => ({
    hour: `${p.hour}:00`,
    rides: p.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.name}</p>
        </div>
        <button
          onClick={toggleStatus}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
            isOnline
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {isOnline ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          {isOnline ? 'Go Offline' : 'Go Online'}
          <DriverStatusBadge status={user?.driverProfile?.status || 'OFFLINE'} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rides', value: data.stats.totalRides, icon: Car, color: 'bg-blue-100 text-blue-700' },
          { label: 'Active Rides', value: data.stats.activeRides, icon: Clock, color: 'bg-amber-100 text-amber-700' },
          { label: 'Earnings', value: `₹${data.stats.totalEarnings}`, icon: IndianRupee, color: 'bg-green-100 text-green-700' },
          { label: 'Rating', value: data.stats.averageRating.toFixed(1), icon: Star, color: 'bg-purple-100 text-purple-700' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {data.activeRides.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-lg mb-4">Active Rides</h2>
          {data.activeRides.map((ride) => (
            <div key={ride.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl mb-3">
              <div>
                <p className="font-medium">{ride.pickupLocation} → {ride.destination}</p>
                <p className="text-sm text-slate-500">Passenger: {ride.passenger?.name}</p>
                <RideStatusBadge status={ride.status} />
              </div>
              <div className="flex gap-2">
                {ride.status === 'ACCEPTED' && (
                  <button
                    onClick={() => updateRideStatus(ride.id, 'IN_PROGRESS')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  >
                    Start Ride
                  </button>
                )}
                {ride.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => updateRideStatus(ride.id, 'COMPLETED')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    Complete Ride
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" /> Peak Hours
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="rides" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-lg mb-4">Recent Ratings</h2>
          {data.ratings.length === 0 ? (
            <p className="text-slate-500 text-sm">No ratings yet</p>
          ) : (
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {data.ratings.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.passenger?.name}</span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" /> {r.score}
                    </span>
                  </div>
                  {r.feedback && <p className="text-sm text-slate-500 mt-1">{r.feedback}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-lg mb-4">Ride History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-3 pr-4">Route</th>
                <th className="pb-3 pr-4">Passenger</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Fare</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.rideHistory.slice(0, 10).map((ride) => (
                <tr key={ride.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4">{ride.pickupLocation} → {ride.destination}</td>
                  <td className="py-3 pr-4">{ride.passenger?.name}</td>
                  <td className="py-3 pr-4"><RideStatusBadge status={ride.status} /></td>
                  <td className="py-3 pr-4">₹{ride.fare}</td>
                  <td className="py-3">{new Date(ride.requestedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
