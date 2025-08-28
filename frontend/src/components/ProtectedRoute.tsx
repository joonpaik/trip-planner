import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../pages/Login';
import Home from '../pages/Home';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};
