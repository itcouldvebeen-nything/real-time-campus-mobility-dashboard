import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { DriverStatusBadge } from '../components/StatusBadge';
import { User, Mail, Phone, Car, Shield } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateProfile({ name, phone });
      await refreshUser();
      setMessage('Profile updated successfully');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-primary-700" />
          </div>
          <div>
            <p className="font-bold text-lg">{user?.name}</p>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              {user?.role}
            </span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <Mail className="w-4 h-4" /> Email
          </label>
          <input value={user?.email || ''} disabled className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <User className="w-4 h-4" /> Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <Phone className="w-4 h-4" /> Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {user?.driverProfile && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Car className="w-5 h-5" /> Driver Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-slate-500">Vehicle</p>
                <p className="font-medium">{user.driverProfile.vehicleType}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-slate-500">Number</p>
                <p className="font-medium">{user.driverProfile.vehicleNumber}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-slate-500">License</p>
                <p className="font-medium">{user.driverProfile.licenseNumber}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-slate-500">Status</p>
                <DriverStatusBadge status={user.driverProfile.status} />
              </div>
            </div>
            {user.driverProfile.isVerified && (
              <p className="flex items-center gap-1 text-green-600 text-sm">
                <Shield className="w-4 h-4" /> Verified Driver
              </p>
            )}
          </div>
        )}

        {message && <p className="text-sm text-primary-600">{message}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
