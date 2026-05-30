'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((res) => {
        // A guest session is anonymous — treat it as "not signed in" for the UI
        // so the header still shows Log In / Sign Up and gates stay in place.
        if (res.success && res.data && !res.data.isGuest) {
          setUser(res.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<User>('/auth/login', { email, password });
    if (res.success && res.data) {
      setUser(res.data);
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.post<User>('/auth/signup', {
        name,
        email,
        password,
      });
      if (res.success && res.data) {
        setUser(res.data);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  const loginWithGoogle = useCallback(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    window.location.href = `${apiUrl}/auth/google`;
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, signup, logout, loginWithGoogle }),
    [user, isLoading, login, signup, logout, loginWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
