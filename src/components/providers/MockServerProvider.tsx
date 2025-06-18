'use client';

import { useEffect, useRef } from 'react';

const MockServerProvider = () => {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize in development mode and if not already initialized
    if (process.env.NODE_ENV === 'development' && !initialized.current) {
      initialized.current = true;
      
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