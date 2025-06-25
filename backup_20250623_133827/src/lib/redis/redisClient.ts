// Redis client stub for now - to be replaced when ioredis is available
interface Redis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<number>;
  disconnect(): void;
}
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let redisClient: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      password: env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 attempts');
          return null;
        }
        const delay = Math.min(times * 1000, 3000);
        logger.warn(`Retrying Redis connection in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  return redisClient;
}

/**
 * Get Redis pub/sub clients for message queue
 */
export function getRedisPubSubClients(): { pub: Redis; sub: Redis } {
  if (!pubClient) {
    pubClient = new Redis(env.REDIS_URL, {
      password: env.REDIS_PASSWORD,
    });
  }

  if (!subClient) {
    subClient = new Redis(env.REDIS_URL, {
      password: env.REDIS_PASSWORD,
    });
  }

  return { pub: pubClient, sub: subClient };
}

/**
 * Close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
  const clients = [redisClient, pubClient, subClient].filter(Boolean);
  
  await Promise.all(
    clients.map(async (client) => {
      if (client) {
        await client.quit();
      }
    })
  );

  redisClient = null;
  pubClient = null;
  subClient = null;
  
  logger.info('Redis connections closed');
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latency: number;
}> {
  try {
    const client = getRedisClient();
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