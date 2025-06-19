'use client';

import { useEffect, useRef } from 'react';

const MockServerProvider = () => {
  const initialized = useRef(false);

  useEffect(() => {
    // Check if mocks should be disabled
    const disableMocks = 
      process.env.NEXT_PUBLIC_DISABLE_MOCKS === 'true' ||
      typeof window !== 'undefined' && (
        window.location.pathname.includes('/diagnostics') ||
        window.location.pathname.includes('/metrics-test')
      );

    // Only initialize in development mode and if not already initialized and not disabled
    if (process.env.NODE_ENV === 'development' && !initialized.current && !disableMocks) {
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