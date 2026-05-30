'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  avatarUrl?: string;
}

interface AuthResponse {
  success: boolean;
  data: AdminUser;
}

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get<AuthResponse>('/auth/me');
      const u = res.data;
      if (u && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')) {
        setUser(u);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    const u = res.data;
    if (!u || (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN')) {
      // A non-admin just authenticated; clear the session cookie that was set.
      await api.post('/auth/logout').catch(() => undefined);
      throw new Error('Access denied. Admin privileges required.');
    }

    setUser(u);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
