'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR to avoid hydration issues
const DiagnosticsPageContent = dynamic(
  () => import('./DiagnosticsPageContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    )
  }
);

export default function DiagnosticsPage() {
  return <DiagnosticsPageContent />;
}