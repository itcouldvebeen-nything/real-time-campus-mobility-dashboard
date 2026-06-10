import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Ride } from '../types';

interface RatingModalProps {
  ride: Ride;
  onClose: () => void;
  onRated: () => void;
}

export default function RatingModal({ ride, onClose, onRated }: RatingModalProps) {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.ratings.create({ rideId: ride.id, score, feedback: feedback || undefined });
      onRated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Rate Your Ride</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-600 mb-4">
          {ride.pickupLocation} → {ride.destination}
        </p>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setScore(n)} className="p-1">
              <Star
                className={`w-8 h-8 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
            </button>
          ))}
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback..."
          className="w-full border border-slate-200 rounded-xl p-3 mb-4 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
