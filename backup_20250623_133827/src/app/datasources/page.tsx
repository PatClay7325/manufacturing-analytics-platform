'use client';

import React from 'react';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DataSourcesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to connections page (AnalyticsPlatform v10+ behavior)
    router.replace('/connections');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to connections...</p>
      </div>
    </div>
  );
}