import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** One or more roles allowed to access this route. If omitted, any authenticated user is allowed. */
  allowedRoles?: Array<'admin' | 'doctor' | 'receptionist'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Fetch CSRF token when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      apiClient.fetchCsrfToken().catch(err => {
        console.warn('Failed to fetch CSRF token:', err);
      });
    }
  }, [isAuthenticated]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them — redirect to login if denied
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
