import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { CAMPUS_LOCATIONS } from '../data/campusLocations';
import CampusMap from '../components/CampusMap';
import RideTracker from '../components/RideTracker';
import { DriverStatusBadge } from '../components/StatusBadge';
import type { DriverProfile, Ride } from '../types';
import { MapPin, Navigation, Users, Star, Calendar } from 'lucide-react';

export default function PassengerHome() {
  const [pickup, setPickup] = useState(CAMPUS_LOCATIONS[0]);
  const [destination, setDestination] = useState(CAMPUS_LOCATIONS[2]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    api.drivers.available().then((d) => setDrivers(d as DriverProfile[])).catch(() => {});
    api.rides.active().then((r) => setActiveRide(r as Ride | null)).catch(() => {});

    const socket = getSocket();
    const onStatus = (data: { driverId: string; status: string; lat?: number; lng?: number }) => {
      setDrivers((prev) => {
        const idx = prev.findIndex((d) => d.id === data.driverId);
        if (data.status === 'OFFLINE') return prev.filter((d) => d.id !== data.driverId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: data.status as DriverProfile['status'], currentLat: data.lat ?? updated[idx].currentLat, currentLng: data.lng ?? updated[idx].currentLng };
          return updated;
        }
        return prev;
      });
    };
    socket.on('driver:status', onStatus);
    socket.on('ride:requested', (ride: Ride) => setActiveRide(ride));
    socket.on('ride:accepted', (ride: Ride) => setActiveRide(ride));
    return () => {
      socket.off('driver:status', onStatus);
    };
  }, []);

  const requestRide = async () => {
    if (pickup.name === destination.name) {
      setError('Pickup and destination must be different');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let scheduledAt: string | undefined;
      if (scheduleDate && scheduleTime) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }
      const ride = await api.rides.request({
        pickupLocation: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        destination: destination.name,
        destLat: destination.lat,
        destLng: destination.lng,
        scheduledAt,
      }) as Ride;
      setActiveRide(ride);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  if (activeRide && ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(activeRide.status)) {
    return (
      <RideTracker
        initialRide={activeRide}
        onRideEnd={() => {
          setActiveRide(null);
          api.drivers.available().then((d) => setDrivers(d as DriverProfile[]));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Request a Ride</h1>
        <p className="text-slate-500">Book an e-rickshaw across IIT Roorkee campus</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 text-green-600" /> Pickup Location
              </label>
              <select
                value={pickup.name}
                onChange={(e) => setPickup(CAMPUS_LOCATIONS.find((l) => l.name === e.target.value)!)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Navigation className="w-4 h-4 text-red-600" /> Destination
              </label>
              <select
                value={destination.name}
                onChange={(e) => setDestination(CAMPUS_LOCATIONS.find((l) => l.name === e.target.value)!)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4" /> Schedule (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={requestRide}
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20"
            >
              {loading ? 'Requesting...' : scheduleDate ? 'Schedule Ride' : 'Request Ride Now'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <Users className="w-5 h-5 text-primary-600" />
              Available Drivers ({drivers.length})
            </h3>
            {drivers.length === 0 ? (
              <p className="text-slate-500 text-sm">No drivers online right now</p>
            ) : (
              <div className="space-y-3">
                {drivers.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium">{d.user?.name}</p>
                      <p className="text-sm text-slate-500">{d.vehicleType} — {d.vehicleNumber}</p>
                    </div>
                    <div className="text-right">
                      <DriverStatusBadge status={d.status} />
                      <p className="text-sm mt-1 flex items-center gap-1 justify-end">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {d.averageRating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <CampusMap
          pickup={{ lat: pickup.lat, lng: pickup.lng, label: pickup.name }}
          destination={{ lat: destination.lat, lng: destination.lng, label: destination.name }}
          drivers={drivers}
          height="500px"
        />
      </div>
    </div>
  );
}
