'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  isLoading: boolean;
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

// Mock user for development
const mockUser: User = {
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
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-login with mock user in development
  useEffect(() => {
    // Skip auth in development - auto login
    setUser(mockUser);
    setLoading(false);
  }, []);

  // Skip redirect logic in development
  useEffect(() => {
    // Development mode - no redirects
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string, remember?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      // Mock login - always succeeds
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(mockUser);
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
      await new Promise(resolve => setTimeout(resolve, 300));
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
      // Mock registration - always succeeds
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser({
        ...mockUser,
        email: data.email,
        name: data.name,
        department: data.department || 'Engineering'
      });
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
    // Mock refresh - does nothing
    console.log('Mock token refresh');
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
    isLoading: loading,
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