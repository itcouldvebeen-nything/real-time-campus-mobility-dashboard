import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart3, MapPin, Clock } from 'lucide-react';

interface AnalyticsData {
  totalRides: number;
  popularLocations: { location: string; count: number }[];
  hourlyDemand: { hour: number; count: number }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.rides.analytics().then((d) => setData(d as AnalyticsData)).catch(() => {});
  }, []);

  if (!data) return <div className="text-center py-12 text-slate-500">Loading analytics...</div>;

  const hourlyData = data.hourlyDemand.map((h) => ({
    hour: `${h.hour}:00`,
    requests: h.count,
  }));

  const peakHour = data.hourlyDemand.reduce((max, h) => (h.count > max.count ? h : max), { hour: 0, count: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-600" />
          Demand Analytics
        </h1>
        <p className="text-slate-500">Campus ride demand patterns and insights</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <p className="text-sm text-slate-500">Total Rides</p>
          <p className="text-3xl font-bold text-primary-700">{data.totalRides}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Clock className="w-4 h-4" /> Peak Hour
          </p>
          <p className="text-3xl font-bold text-primary-700">{peakHour.hour}:00</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Top Location
          </p>
          <p className="text-xl font-bold text-primary-700 truncate">
            {data.popularLocations[0]?.location || 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-lg mb-4">Hourly Demand</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="requests" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-lg mb-4">Popular Pickup Locations</h2>
          <div className="space-y-3">
            {data.popularLocations.map((loc, i) => (
              <div key={loc.location} className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{loc.location}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(loc.count / (data.popularLocations[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-slate-500 font-medium">{loc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
