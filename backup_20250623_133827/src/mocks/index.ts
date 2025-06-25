/**
 * Mock API Server
 * 
 * This module initializes the mock API server for development mode.
 * It intercepts API requests and responds with mock data.
 */

const initMockServer = async () => {
  // Only initialize in development mode and in the browser
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Use dynamic import to avoid bundling MSW in production
    const { startMockServiceWorker } = await import('./browser');
    await startMockServiceWorker();
    
    console.log('✅ Mock API server initialized');
  }
};

export default initMockServer;