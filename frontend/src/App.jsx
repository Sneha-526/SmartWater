import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import UserAuth from './pages/auth/UserAuth';
import VendorAuth from './pages/auth/VendorAuth';
import ResetPassword from './pages/auth/ResetPassword';
import UserDashboard from './pages/user/UserDashboard';
import PlaceOrder from './pages/user/PlaceOrder';
import OrderHistory from './pages/user/OrderHistory';
import VendorDashboard from './pages/vendor/VendorDashboard';
import LoadingScreen from './components/LoadingScreen';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'vendor' ? '/vendor' : '/user'} replace />;
  }
  return children;
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role === 'vendor' ? '/vendor' : '/user'} replace />
            : <LandingPage />
        }
      />
      <Route
        path="/login/user"
        element={user ? <Navigate to="/user" replace /> : <UserAuth />}
      />
      <Route
        path="/login/vendor"
        element={user ? <Navigate to="/vendor" replace /> : <VendorAuth />}
      />
      <Route
        path="/user"
        element={
          <ProtectedRoute role="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/order"
        element={
          <ProtectedRoute role="user">
            <PlaceOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/history"
        element={
          <ProtectedRoute role="user">
            <OrderHistory />
          </ProtectedRoute>
        }
      />
      {/* Redirect old AI insights URL to user dashboard */}
      <Route path="/user/insights" element={<Navigate to="/user" replace />} />
      {/* Password reset page (from email link) */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute role="vendor">
            <VendorDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

