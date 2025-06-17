'use client';

import { useEffect, useState } from 'react';

const MockServerProvider = () => {
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    // Only initialize in development mode
    if (process.env.NODE_ENV === 'development') {
      const initMocks = async () => {
        try {
          // Use dynamic import with error handling
          const { default: initMockServer } = await import('@/mocks');
          await initMockServer();
          console.log('Mock service worker initialized successfully');
        } catch (error) {
          console.error('Failed to initialize mock service worker:', error);
          setInitError(error instanceof Error ? error : new Error('Unknown error initializing mock server'));
          // Continue execution even if mock server fails
        }
      };

      initMocks();
    }
  }, []);

  // This component doesn't render anything in production
  // In development, it might show errors if debugging is needed
  if (process.env.NODE_ENV === 'development' && initError && process.env.NEXT_PUBLIC_DEBUG_MSW === 'true') {
    return (
      <div className="fixed bottom-0 right-0 z-50 p-4 bg-red-100 text-red-800 text-xs rounded-tl-lg shadow-lg max-w-xs">
        <p className="font-semibold">Mock Server Error:</p>
        <p>{initError.message}</p>
      </div>
    );
  }
  
  return null;
};

export default MockServerProvider;