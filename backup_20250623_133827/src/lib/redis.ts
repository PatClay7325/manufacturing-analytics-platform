import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Create Redis client with proper configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const client = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      logger.error('Redis connection failed after 3 attempts');
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableOfflineQueue: false,
  lazyConnect: true,
});

// Handle connection events
client.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

// Initialize connection
if (process.env.NODE_ENV !== 'test') {
  client.connect().catch((err) => {
    logger.error({ err }, 'Failed to connect to Redis');
  });
}

// Export for health checks
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latency: number;
}> {
  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    
    return {
      connected: true,
      latency,
    };
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return {
      connected: false,
      latency: -1,
    };
  }
}