import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers);

// Export a function to start the worker
export const startMockServiceWorker = async () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MSW] Starting mock service worker...');
    
    // Start the MSW worker
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
        options: {
          scope: '/'
        }
      },
      quiet: false // Show MSW logs
    });
    
    console.log('[MSW] Mock service worker started');
  }
};