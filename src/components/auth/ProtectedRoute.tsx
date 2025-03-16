import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'manager' | 'receptionist')[];
}

const roleHierarchy = {
  admin: ['admin', 'manager', 'receptionist'],
  manager: ['manager', 'receptionist'],
  receptionist: ['receptionist'],
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!userRole || !allowedRoles.some(role => 
    roleHierarchy[userRole as keyof typeof roleHierarchy].includes(role)
  )) {
    // Redirect to dashboard if authenticated but not authorized
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 