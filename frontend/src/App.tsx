import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import PassengerHome from './pages/PassengerHome';
import DriverDashboard from './pages/DriverDashboard';
import DriverRequests from './pages/DriverRequests';
import Profile from './pages/Profile';
import RideHistory from './pages/RideHistory';
import Analytics from './pages/Analytics';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'PASSENGER' | 'DRIVER' }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'DRIVER') return <Navigate to="/driver" replace />;
  return <PassengerHome />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="history" element={<ProtectedRoute role="PASSENGER"><RideHistory /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute role="PASSENGER"><Analytics /></ProtectedRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="driver" element={<ProtectedRoute role="DRIVER"><DriverDashboard /></ProtectedRoute>} />
        <Route path="driver/requests" element={<ProtectedRoute role="DRIVER"><DriverRequests /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
