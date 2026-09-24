import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants';

export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === ROLES.EMPLOYER || user?.role === ROLES.ADMIN) {
      return <Navigate to="/hr/dashboard" replace />;
    }
    return <Navigate to="/candidate/dashboard" replace />;
  }

  return children;
};
