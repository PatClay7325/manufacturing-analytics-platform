import cron from 'node-cron';
import { MemoryPrunerAgent } from '@/lib/agents/MemoryPrunerAgent';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

let cronJob: cron.ScheduledTask | null = null;

/**
 * Initialize the memory pruner cron job
 */
export function initializeMemoryPrunerCron(): void {
  // Stop existing job if any
  stopMemoryPrunerCron();

  const schedule = env.CRON_SCHEDULE;
  
  logger.info({ schedule }, 'Initializing memory pruner cron job');

  // Validate cron expression
  if (!cron.validate(schedule)) {
    logger.error({ schedule }, 'Invalid cron schedule');
    return;
  }

  // Create the scheduled task
  cronJob = cron.schedule(schedule, async () => {
    logger.info('Running scheduled memory pruning');
    
    try {
      const pruner = MemoryPrunerAgent.getInstance();
      const result = await pruner.prune();
      
      logger.info({ 
        totalDeleted: result.totalDeleted,
        duration: result.duration 
      }, 'Scheduled memory pruning completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled memory pruning failed');
    }
  }, {
    scheduled: true,
    timezone: 'UTC', // Use UTC for consistency
  });

  logger.info({ schedule }, 'Memory pruner cron job initialized');
}

/**
 * Stop the memory pruner cron job
 */
export function stopMemoryPrunerCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Memory pruner cron job stopped');
  }
}

/**
 * Get cron job status
 */
export function getMemoryPrunerCronStatus(): {
  running: boolean;
  schedule: string;
  nextRun: Date | null;
} {
  return {
    running: cronJob !== null,
    schedule: env.CRON_SCHEDULE,
    nextRun: cronJob ? getNextScheduledRun(env.CRON_SCHEDULE) : null,
  };
}

/**
 * Calculate next scheduled run time
 */
function getNextScheduledRun(schedule: string): Date | null {
  try {
    const interval = cron.parseExpression(schedule);
    return interval.next().toDate();
  } catch (error) {
    logger.error({ error, schedule }, 'Failed to parse cron expression');
    return null;
  }
}

/**
 * Run memory pruning immediately (manual trigger)
 */
export async function runMemoryPruningNow(): Promise<void> {
  logger.info('Manually triggering memory pruning');
  
  try {
    const pruner = MemoryPrunerAgent.getInstance();
    const result = await pruner.prune();
    
    logger.info({ 
      totalDeleted: result.totalDeleted,
      duration: result.duration 
    }, 'Manual memory pruning completed');
  } catch (error) {
    logger.error({ error }, 'Manual memory pruning failed');
    throw error;
  }
}