import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { ROLES } from '../constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  const login = (email, password, role) => {
    setLoading(true);
    const loggedUser = authService.login(email, password, role);
    setUser(loggedUser);
    setLoading(false);
    return loggedUser;
  };

  const register = (data) => {
    setLoading(true);
    const newUser = authService.register(data);
    setUser(newUser);
    setLoading(false);
    return newUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchRole = (role) => {
    const newUser = authService.switchRole(role);
    setUser(newUser);
    return newUser;
  };

  const isRole = (targetRole) => {
    return user?.role === targetRole;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user?.loggedIn,
        role: user?.role || null,
        login,
        register,
        logout,
        switchRole,
        isRole,
        isCandidate: user?.role === ROLES.CANDIDATE,
        isEmployer: user?.role === ROLES.EMPLOYER,
        isAdmin: user?.role === ROLES.ADMIN,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
