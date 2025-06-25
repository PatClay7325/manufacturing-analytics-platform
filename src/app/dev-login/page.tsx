'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Only work in development
    if (process.env.NODE_ENV !== 'development') {
      router.push('/login');
      return;
    }

    // Auto-login as admin
    const autoLogin = async () => {
      try {
        const response = await fetch('/api/auth/bypass-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@manufacturing.com',
            password: 'demo123'
          })
        });

        if (response.ok) {
          console.log('✅ Development auto-login successful!');
          router.push('/');
        } else {
          console.error('Auto-login failed');
          router.push('/login');
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        router.push('/login');
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Development Mode</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Auto-logging in as admin...</p>
      </div>
    </div>
  );
}