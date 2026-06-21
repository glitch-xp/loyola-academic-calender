import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const storedUsername = localStorage.getItem('admin_username');
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      // Optionally verify token with an API call here
    }
    setLoading(false);
  }, []);

  const login = (token: string, newUsername: string) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', newUsername);
    setIsAuthenticated(true);
    setUsername(newUsername);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
