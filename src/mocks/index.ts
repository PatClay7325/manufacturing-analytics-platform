/**
 * Mock API Server
 * 
 * This module initializes the mock API server for development mode.
 * It intercepts API requests and responds with mock data.
 */

const initMockServer = async () => {
  // Only initialize in development mode and in the browser
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      // Use dynamic import to avoid bundling MSW in production
      const { startMockServiceWorker } = await import('./browser');
      await startMockServiceWorker();
      
      console.log('✅ Mock API server initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mock API server:', error);
      // Return a resolved promise to prevent the error from bubbling up
      return Promise.resolve();
    }
  }
};

export default initMockServer;