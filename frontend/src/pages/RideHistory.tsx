import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { RideStatusBadge } from '../components/StatusBadge';
import RatingModal from '../components/RatingModal';
import type { Ride } from '../types';
import { History, Star } from 'lucide-react';

export default function RideHistory() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [ratingRide, setRatingRide] = useState<Ride | null>(null);

  useEffect(() => {
    api.rides.my().then((r) => setRides(r as Ride[])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-7 h-7 text-primary-600" />
          Ride History
        </h1>
        <p className="text-slate-500">Your past and current rides</p>
      </div>

      {rides.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center text-slate-500">
          No rides yet. Request your first ride!
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">{ride.pickupLocation} → {ride.destination}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(ride.requestedAt).toLocaleString()}
                  {ride.driver?.user && ` • Driver: ${ride.driver.user.name}`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <RideStatusBadge status={ride.status} />
                  {ride.fare && <span className="text-sm text-slate-600">₹{ride.fare}</span>}
                </div>
              </div>
              {ride.status === 'COMPLETED' && !ride.rating && (
                <button
                  onClick={() => setRatingRide(ride)}
                  className="flex items-center gap-1 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-200"
                >
                  <Star className="w-4 h-4" /> Rate Ride
                </button>
              )}
              {ride.rating && (
                <span className="flex items-center gap-1 text-amber-500 text-sm">
                  <Star className="w-4 h-4 fill-current" /> Rated {ride.rating.score}/5
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {ratingRide && (
        <RatingModal
          ride={ratingRide}
          onClose={() => setRatingRide(null)}
          onRated={() => {
            api.rides.my().then((r) => setRides(r as Ride[]));
            setRatingRide(null);
          }}
        />
      )}
    </div>
  );
}
