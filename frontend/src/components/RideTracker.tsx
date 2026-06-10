import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { RideStatusBadge } from './StatusBadge';
import CampusMap from './CampusMap';
import RatingModal from './RatingModal';
import type { Ride } from '../types';
import { Clock, MapPin, User, Phone, IndianRupee, X } from 'lucide-react';

interface RideTrackerProps {
  initialRide?: Ride | null;
  onRideEnd?: () => void;
}

const STEPS: Ride['status'][] = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

export default function RideTracker({ initialRide, onRideEnd }: RideTrackerProps) {
  const [ride, setRide] = useState<Ride | null>(initialRide ?? null);
  const [showRating, setShowRating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialRide) {
      api.rides.active().then((r) => setRide(r as Ride | null)).catch(() => {});
    }
  }, [initialRide]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (updated: Ride) => {
      if (ride && updated.id === ride.id) {
        setRide(updated);
        if (updated.status === 'COMPLETED' && !updated.rating) {
          setShowRating(true);
        }
      } else if (!ride && updated.passengerId) {
        setRide(updated);
      }
    };
    socket.on('ride:update', handler);
    socket.on('ride:requested', handler);
    socket.on('ride:accepted', handler);
    socket.on('ride:in_progress', handler);
    socket.on('ride:completed', (updated: Ride) => {
      handler(updated);
      if (updated.id === ride?.id) setShowRating(true);
    });
    socket.on('ride:cancelled', handler);
    return () => {
      socket.off('ride:update', handler);
      socket.off('ride:requested', handler);
      socket.off('ride:accepted', handler);
      socket.off('ride:in_progress', handler);
      socket.off('ride:completed', handler);
      socket.off('ride:cancelled', handler);
    };
  }, [ride]);

  const cancelRide = async () => {
    if (!ride || !confirm('Cancel this ride?')) return;
    setLoading(true);
    try {
      const updated = await api.rides.updateStatus(ride.id, { status: 'CANCELLED', cancelReason: 'Cancelled by passenger' }) as Ride;
      setRide(updated);
      onRideEnd?.();
    } finally {
      setLoading(false);
    }
  };

  if (!ride) return null;

  const stepIndex = STEPS.indexOf(ride.status);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="bg-primary-700 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Active Ride</h2>
          <RideStatusBadge status={ride.status} />
        </div>
        {ride.status === 'REQUESTED' && (
          <button onClick={cancelRide} disabled={loading} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-sm">
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= stepIndex ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-xs mt-1 text-slate-500 hidden sm:block">{step.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Pickup</p>
              <p className="font-medium">{ride.pickupLocation}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Destination</p>
              <p className="font-medium">{ride.destination}</p>
            </div>
          </div>
        </div>

        {ride.driver && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-700" />
              </div>
              <div>
                <p className="font-medium">{ride.driver.user?.name}</p>
                <p className="text-sm text-slate-500">{ride.driver.vehicleType} — {ride.driver.vehicleNumber}</p>
              </div>
            </div>
            {ride.driver.user?.phone && (
              <a href={`tel:${ride.driver.user.phone}`} className="flex items-center gap-1 text-primary-600 text-sm">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
          {ride.fare && (
            <span className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4" /> ₹{ride.fare}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> {new Date(ride.requestedAt).toLocaleTimeString()}
          </span>
        </div>

        <CampusMap
          pickup={{ lat: ride.pickupLat, lng: ride.pickupLng, label: ride.pickupLocation }}
          destination={{ lat: ride.destLat, lng: ride.destLng, label: ride.destination }}
          height="250px"
        />
      </div>

      {showRating && ride.status === 'COMPLETED' && !ride.rating && (
        <RatingModal
          ride={ride}
          onClose={() => setShowRating(false)}
          onRated={() => {
            setShowRating(false);
            onRideEnd?.();
          }}
        />
      )}
    </div>
  );
}
