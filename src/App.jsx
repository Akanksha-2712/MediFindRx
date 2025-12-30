import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerHome from './pages/CustomerHome';
import PharmacyDashboard from './pages/PharmacyDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OtpPage from './pages/OtpPage';
import RatingPage from './pages/RatingPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;

  return children;
};

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'pharmacy') return <Navigate to="/pharmacy" />;
  if (user.role === 'hospital') return <Navigate to="/hospital" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return <Navigate to="/customer" />;
};

function App() {
  return (
    <AuthProvider>
      {/* Force Refresh: v1.3 - Stabilizing Context */}
      <DataProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-gradient-to-r from-indigo-100 via-sky-100 to-teal-100">
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/otp/:reservationId" element={<OtpPage />} />
              <Route path="/rate/:pharmacyId" element={<RatingPage />} />

              {/* Customer Routes */}
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="/customer" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CustomerHome />
                </ProtectedRoute>
              } />

              {/* Pharmacy Routes */}
              <Route path="/pharmacy" element={
                <ProtectedRoute allowedRoles={['pharmacy']}>
                  <PharmacyDashboard />
                </ProtectedRoute>
              } />

              {/* Hospital Routes */}
              <Route path="/hospital" element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalDashboard />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
