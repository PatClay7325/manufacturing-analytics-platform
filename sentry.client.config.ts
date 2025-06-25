import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay for better debugging
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
    
    // Enhanced error tracking
    debug: process.env.NODE_ENV === 'development',
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      
      // Manufacturing-specific context
      Sentry.extraErrorDataIntegration({
        depth: 10,
      }),
      
      // Performance monitoring
      Sentry.browserTracingIntegration({
        enableInp: true,
      }),
    ],
    
    // Enhanced context for manufacturing environment
    beforeSend: (event, hint) => {
      // Add manufacturing context
      event.contexts = {
        ...event.contexts,
        manufacturing: {
          platform: 'Manufacturing Analytics Platform',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
        },
      };
      
      // Filter out sensitive data
      if (event.request?.data) {
        // Remove sensitive manufacturing data
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'api_key'];
        sensitiveKeys.forEach(key => {
          if (event.request?.data?.[key]) {
            event.request.data[key] = '[Filtered]';
          }
        });
      }
      
      return event;
    },
    
    // Custom error grouping for manufacturing errors
    fingerprint: ['{{ default }}'],
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
  });
}