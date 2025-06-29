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
  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Redirect logic based on auth status
  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      
      if (!user && !isPublicRoute && pathname !== '/') {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/register')) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // DEVELOPMENT AUTO-LOGIN
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true') {
        console.log('🔐 Development auto-login enabled');
        
        // Try to get current user first
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setError(null);
          return;
        } catch (e) {
          // If not logged in, auto-login
          console.log('🚀 Performing development auto-login...');
          
          const response = await fetch('/api/auth/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            console.log('✅ Auto-login successful!');
            return;
          }
        }
      }
      
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
      setUser(response.user);
      router.push('/');
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