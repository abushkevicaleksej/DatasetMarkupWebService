import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { loginRequest } from './client';
import axios from 'axios'
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      const { data } = await apiClient.get('/api/routes/me');
      setUser(data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (username: string, password: string) => {
    const tokens = await loginRequest(username, password);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    await fetchCurrentUser();
  };

  const register = async (username: string, email: string, password: string, role: string = "user") => {
    await apiClient.post('/api/routes/register', { username, email, password, role });
    await login(username, password);
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await axios.post('/api/routes/logout',
          new URLSearchParams({ refresh_token: refresh }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch {}
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};