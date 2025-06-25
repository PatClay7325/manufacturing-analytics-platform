import { initializeOpenTelemetry } from '@/lib/observability/otel';
import { initializeMemoryPrunerCron } from '@/lib/cron/memoryPrunerCron';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

let initialized = false;

/**
 * Initialize the agent system on startup
 */
export async function initializeAgentSystem(): Promise<void> {
  if (initialized) {
    logger.warn('Agent system already initialized');
    return;
  }

  try {
    logger.info('Initializing agent system...');

    // Initialize OpenTelemetry
    await initializeOpenTelemetry();

    // Initialize memory pruner cron job
    if (env.NODE_ENV !== 'test') {
      initializeMemoryPrunerCron();
    }

    // TODO: Initialize vector database connection
    // TODO: Pre-load intent embeddings

    initialized = true;
    logger.info('Agent system initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize agent system');
    throw error;
  }
}

/**
 * Shutdown the agent system gracefully
 */
export async function shutdownAgentSystem(): Promise<void> {
  logger.info('Shutting down agent system...');

  try {
    // Stop cron jobs
    const { stopMemoryPrunerCron } = await import('@/lib/cron/memoryPrunerCron');
    stopMemoryPrunerCron();

    // Shutdown OpenTelemetry
    const { shutdownOpenTelemetry } = await import('@/lib/observability/otel');
    await shutdownOpenTelemetry();

    initialized = false;
    logger.info('Agent system shut down successfully');
  } catch (error) {
    logger.error({ error }, 'Error during agent system shutdown');
  }
}