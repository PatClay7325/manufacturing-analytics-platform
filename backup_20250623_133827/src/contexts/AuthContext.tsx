'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/services/api/authApi';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  department?: string;
  permissions: string[];
  site?: {
    id: string;
    name: string;
    enterprise?: {
      id: string;
      name: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean; // Alias for loading for consistency
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  department?: string;
  siteId?: string;
  inviteCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication status on mount
  useEffect(() => {
    // In development, use mock auth to avoid API errors
    if (process.env.NODE_ENV === 'development') {
      setUser({
        id: '1',
        email: 'admin@manufacturing.com',
        name: 'Admin User',
        role: 'admin',
        department: 'Engineering',
        permissions: ['admin:all', 'dashboard:view', 'dashboard:edit'],
        site: {
          id: 'site-1',
          name: 'Main Factory',
          enterprise: {
            id: 'enterprise-1',
            name: 'Manufacturing Corp'
          }
        }
      });
      setLoading(false);
    } else {
      checkAuth();
    }
  }, []);

  // Redirect logic based on auth status
  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      
      if (!user && !isPublicRoute && pathname !== '/') {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/register')) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      setUser(null);
      // Don't set error for 401 - it's expected when not logged in
      if (err instanceof Error && !err.message.includes('401')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, remember?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.login(email, password, remember);
      
      // The API sets an HTTP-only cookie, so we don't need to handle it here
      // Just store the user data
      setUser(response.user);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authApi.logout();
      
      // The API will clear the HTTP-only cookie
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.register(data);
      
      // The API sets an HTTP-only cookie
      setUser(response.user);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken();
      setUser(response.user);
    } catch (err) {
      console.error('Token refresh error:', err);
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.permissions.includes('admin:all');
  }, [user]);

  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  }, [user]);

  const value = {
    user,
    loading,
    isLoading: loading, // Alias for consistency
    error,
    login,
    logout,
    register,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}