'use client';

import React from 'react';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo);
    } else if (!isLoading && user && requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.some(permission => hasPermission(permission));
      if (!hasRequiredPermissions) {
        router.push('/');
      }
    }
  }, [user, isLoading, requiredPermissions, redirectTo, router, hasPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.some(permission => hasPermission(permission));
    if (!hasRequiredPermissions) {
      return null;
    }
  }

  return <>{children}</>;
}