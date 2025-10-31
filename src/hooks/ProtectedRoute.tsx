import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute: React.FC = () => {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    // Si no hay token, redirige al login
    return <Navigate to="/login" replace />;
  }

  // Si hay token, renderiza el componente hijo (ProductsPage)
  return <Outlet />;
};
