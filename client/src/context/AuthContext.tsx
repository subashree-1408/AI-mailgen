import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../api/client.js';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Session check:', err);
      // If failed and token invalid, clear
      if (getAuthToken()) {
        clearAuthToken();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
    fetchCurrentUser().catch(() => {});
  };

  const signup = async (name: string, email: string, pass: string) => {
    const res = await api.signup({ name, email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
    await fetchCurrentUser();
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
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
