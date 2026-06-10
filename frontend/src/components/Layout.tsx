import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, LogOut, User, LayoutDashboard, MapPin, BarChart3 } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Car className="w-7 h-7" />
            <span>CultRide</span>
            <span className="text-xs bg-primary-600 px-2 py-0.5 rounded-full font-normal">IIT Roorkee</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            {user?.role === 'PASSENGER' && (
              <>
                <Link to="/" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  <MapPin className="w-4 h-4" /> Ride
                </Link>
                <Link to="/history" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  History
                </Link>
                <Link to="/analytics" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  <BarChart3 className="w-4 h-4" /> Analytics
                </Link>
              </>
            )}
            {user?.role === 'DRIVER' && (
              <>
                <Link to="/driver" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link to="/driver/requests" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  Requests
                </Link>
              </>
            )}
            <Link to="/profile" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{user?.name}</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-700 text-sm">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-white border-t py-4 text-center text-sm text-slate-500">
        CultRide — Real-Time Campus Mobility Platform &copy; 2024
      </footer>
    </div>
  );
}
