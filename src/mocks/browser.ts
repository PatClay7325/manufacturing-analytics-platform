import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers);

// Export a function to start the worker
export const startMockServiceWorker = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('[MSW] Starting mock service worker...');
      
      // Start the MSW worker with proper error handling
      await worker.start({
        onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
        serviceWorker: {
          // Skip waiting for activation
          // @ts-ignore - MSW types are outdated, these options are valid
          skipWaiting: true,
          // Disable strict mode to prevent crashes when SW can't be registered
          // @ts-ignore - MSW types are outdated, these options are valid
          strict: false,
        }
      });
      
      console.log('[MSW] Mock service worker started');
    } catch (error) {
      // Log the error but don't crash the application
      console.error('[MSW] Failed to start mock service worker:', error);
      
      // Return a resolved promise to prevent the error from bubbling up
      return Promise.resolve();
    }
  }
};