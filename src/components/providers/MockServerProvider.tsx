'use client';

import { useEffect } from 'react';

const MockServerProvider = () => {
  useEffect(() => {
    // Only initialize in development mode
    if (process.env.NODE_ENV === 'development') {
      const initMocks = async () => {
        const { default: initMockServer } = await import('@/mocks');
        await initMockServer();
      };

      initMocks().catch(console.error);
    }
  }, []);

  // This component doesn't render anything
  return null;
};

export default MockServerProvider;