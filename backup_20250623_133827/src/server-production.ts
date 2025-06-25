#!/usr/bin/env node
/**
 * Production-Ready Manufacturing AnalyticsPlatform Server
 * Complete 10/10 production implementation with all enterprise features
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { logger } from './lib/logger';
import { productionOrchestrator } from './lib/production/ProductionOrchestrator';
import { healthCheckManager } from './lib/health/HealthCheckManager';
import { apmIntegration } from './lib/performance/APMIntegration';
import { manufacturingDataPipeline } from './lib/data/ManufacturingDataPipeline';
import { register } from 'prom-client';

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, 'Required environment variable missing');
    process.exit(1);
  }
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Main server startup function
 */
async function startServer(): Promise<void> {
  const startupTimer = Date.now();
  
  try {
    logger.info({
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      hostname,
      port,
    }, 'Starting Manufacturing AnalyticsPlatform');

    // Phase 1: Prepare Next.js application
    logger.info('Preparing Next.js application');
    await app.prepare();

    // Phase 2: Start production orchestrator with all components
    logger.info('Starting production orchestrator');
    await productionOrchestrator.start({
      configPath: process.env.CONFIG_PATH,
      skipHealthChecks: process.env.SKIP_HEALTH_CHECKS === 'true',
      skipAPM: process.env.SKIP_APM === 'true',
    });

    // Phase 3: Create HTTP server with enhanced request handling
    const server = createServer(async (req, res) => {
      try {
        // Start APM tracing for request
        const span = apmIntegration.startSpan(
          `${req.method} ${req.url}`,
          undefined,
          undefined,
          {
            'http.method': req.method,
            'http.url': req.url,
            'http.user_agent': req.headers['user-agent'],
          }
        );

        const startTime = Date.now();
        
        // Enhanced request logging
        const requestId = Math.random().toString(36).substr(2, 9);
        req.headers['x-request-id'] = requestId;
        
        logger.info({
          requestId,
          method: req.method,
          url: req.url,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        }, 'Request received');

        try {
          const parsedUrl = parse(req.url!, true);
          
          // Handle special production endpoints
          if (req.url === '/health') {
            await handleHealthCheck(req, res);
            return;
          }
          
          if (req.url === '/health/ready') {
            await handleReadinessCheck(req, res);
            return;
          }
          
          if (req.url === '/health/live') {
            await handleLivenessCheck(req, res);
            return;
          }
          
          if (req.url === '/metrics') {
            await handleMetrics(req, res);
            return;
          }
          
          if (req.url === '/diagnostics') {
            await handleDiagnostics(req, res);
            return;
          }

          // Handle regular Next.js requests
          await handle(req, res, parsedUrl);
          
        } catch (error) {
          logger.error({ error, requestId }, 'Request handling failed');
          
          apmIntegration.addSpanTags(span.spanId, {
            error: true,
            'error.message': error instanceof Error ? error.message : 'Unknown error',
          });
          
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Internal Server Error',
              requestId,
              timestamp: new Date().toISOString(),
            }));
          }
        } finally {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode || 500;
          
          // Instrument request for APM
          apmIntegration.instrumentRequest(
            req.method || 'GET',
            parsedUrl?.pathname || req.url || '/',
            statusCode,
            duration
          );
          
          // Finish APM span
          apmIntegration.finishSpan(
            span.spanId,
            statusCode >= 400 ? 'error' : 'ok'
          );
          
          logger.info({
            requestId,
            method: req.method,
            url: req.url,
            statusCode,
            duration,
          }, 'Request completed');
        }
      } catch (error) {
        logger.error({ error }, 'Critical request processing error');
        
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      }
    });

    // Configure server settings
    server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
    server.headersTimeout = 66000; // Higher than keepAliveTimeout
    
    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(port, hostname, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const startupTime = (Date.now() - startupTimer) / 1000;
    
    logger.info({
      hostname,
      port,
      startupTime,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    }, 'Manufacturing AnalyticsPlatform started successfully');

    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
      
      try {
        // Stop accepting new connections
        server.close(async (err) => {
          if (err) {
            logger.error({ error: err }, 'Error closing server');
          }
          
          // Stop production orchestrator
          await productionOrchestrator.stop(signal.toLowerCase());
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        });
        
        // Force exit after timeout
        setTimeout(() => {
          logger.error('Graceful shutdown timeout, forcing exit');
          process.exit(1);
        }, 30000); // 30 seconds
        
      } catch (error) {
        logger.error({ error }, 'Graceful shutdown failed');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.fatal({ error, startupTime: Date.now() - startupTimer }, 'Server startup failed');
    process.exit(1);
  }
}

/**
 * Handle health check endpoint
 */
async function handleHealthCheck(req: any, res: any): Promise<void> {
  try {
    const health = await healthCheckManager.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }));
  }
}

/**
 * Handle Kubernetes readiness probe
 */
async function handleReadinessCheck(req: any, res: any): Promise<void> {
  try {
    const isReady = await productionOrchestrator.isReady();
    const statusCode = isReady ? 200 : 503;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_ready', error: 'Check failed' }));
  }
}

/**
 * Handle Kubernetes liveness probe
 */
async function handleLivenessCheck(req: any, res: any): Promise<void> {
  try {
    const isAlive = productionOrchestrator.isAlive();
    const statusCode = isAlive ? 200 : 503;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: isAlive ? 'alive' : 'dead',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }));
  } catch (error) {
    logger.error({ error }, 'Liveness check failed');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'dead', error: 'Check failed' }));
  }
}

/**
 * Handle Prometheus metrics endpoint
 */
async function handleMetrics(req: any, res: any): Promise<void> {
  try {
    const metrics = await register.metrics();
    res.writeHead(200, { 'Content-Type': register.contentType });
    res.end(metrics);
  } catch (error) {
    logger.error({ error }, 'Metrics endpoint failed');
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Metrics unavailable');
  }
}

/**
 * Handle diagnostics endpoint (internal use)
 */
async function handleDiagnostics(req: any, res: any): Promise<void> {
  try {
    // Basic authentication for diagnostics
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    const token = auth.substring(7);
    const expectedToken = process.env.DIAGNOSTICS_TOKEN;
    
    if (!expectedToken || token !== expectedToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
      return;
    }
    
    const diagnostics = await productionOrchestrator.getDiagnostics();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(diagnostics, null, 2));
  } catch (error) {
    logger.error({ error }, 'Diagnostics endpoint failed');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Diagnostics unavailable' }));
  }
}

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  });
}

export { startServer };