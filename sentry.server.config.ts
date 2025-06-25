import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Server-side performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Enhanced server debugging
    debug: process.env.NODE_ENV === 'development',
    
    integrations: [
      // HTTP integration for API monitoring
      Sentry.httpIntegration({
        tracing: true,
      }),
      
      // Node.js performance monitoring
      Sentry.nodeProfilingIntegration(),
      
      // Database monitoring
      Sentry.prismaIntegration(),
    ],
    
    // Enhanced context for server environment
    beforeSend: (event, hint) => {
      // Add server context
      event.contexts = {
        ...event.contexts,
        server: {
          platform: 'Manufacturing Analytics Platform Server',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          database: process.env.DATABASE_URL ? 'Connected' : 'Disconnected',
        },
      };
      
      // Filter sensitive server data
      if (event.request?.data) {
        const sensitiveKeys = [
          'password', 'token', 'key', 'secret', 'api_key',
          'DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET'
        ];
        sensitiveKeys.forEach(key => {
          if (event.request?.data?.[key]) {
            event.request.data[key] = '[Filtered]';
          }
        });
      }
      
      return event;
    },
    
    // Performance monitoring for manufacturing APIs
    beforeSendTransaction: (transaction) => {
      // Add manufacturing-specific tags
      transaction.setTag('platform', 'manufacturing-analytics');
      return transaction;
    },
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
  });
}