/**
 * Resource management for workflow orchestration
 * Handles cleanup, memory management, and connection pooling
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

export interface ResourceHandle {
  id: string;
  type: 'database' | 'redis' | 'http' | 'memory' | 'file';
  resource: any;
  createdAt: Date;
  lastUsed: Date;
  cleanup: () => Promise<void>;
}

export class ResourceManager extends EventEmitter {
  private static instance: ResourceManager;
  private resources = new Map<string, ResourceHandle>();
  private cleanupTimer?: NodeJS.Timeout;
  private maxAge = 300000; // 5 minutes
  private maxIdle = 60000; // 1 minute
  private isShuttingDown = false;

  constructor() {
    super();
    this.startCleanupTimer();
    
    // Handle process termination
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught exception, cleaning up resources');
      this.shutdown().then(() => process.exit(1));
    });
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection, cleaning up resources');
      this.shutdown().then(() => process.exit(1));
    });
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Register a resource for managed cleanup
   */
  register(handle: ResourceHandle): void {
    if (this.isShuttingDown) {
      logger.warn('Attempted to register resource during shutdown');
      return;
    }

    this.resources.set(handle.id, handle);
    logger.debug({ resourceId: handle.id, type: handle.type }, 'Resource registered');
  }

  /**
   * Unregister and cleanup a specific resource
   */
  async unregister(resourceId: string): Promise<void> {
    const handle = this.resources.get(resourceId);
    if (!handle) {
      return;
    }

    try {
      await handle.cleanup();
      this.resources.delete(resourceId);
      logger.debug({ resourceId }, 'Resource unregistered');
    } catch (error) {
      logger.error({ error, resourceId }, 'Failed to cleanup resource');
    }
  }

  /**
   * Update resource last used timestamp
   */
  touch(resourceId: string): void {
    const handle = this.resources.get(resourceId);
    if (handle) {
      handle.lastUsed = new Date();
    }
  }

  /**
   * Get resource statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    oldestResource: Date | null;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const byType: Record<string, number> = {};
    let oldestResource: Date | null = null;

    for (const handle of this.resources.values()) {
      byType[handle.type] = (byType[handle.type] || 0) + 1;
      
      if (!oldestResource || handle.createdAt < oldestResource) {
        oldestResource = handle.createdAt;
      }
    }

    return {
      total: this.resources.size,
      byType,
      oldestResource,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Force cleanup of idle resources
   */
  async cleanupIdle(): Promise<number> {
    const now = new Date();
    const toCleanup: string[] = [];

    for (const [id, handle] of this.resources) {
      const age = now.getTime() - handle.createdAt.getTime();
      const idle = now.getTime() - handle.lastUsed.getTime();

      if (age > this.maxAge || idle > this.maxIdle) {
        toCleanup.push(id);
      }
    }

    let cleaned = 0;
    for (const id of toCleanup) {
      try {
        await this.unregister(id);
        cleaned++;
      } catch (error) {
        logger.error({ error, resourceId: id }, 'Failed to cleanup idle resource');
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned, total: this.resources.size }, 'Cleaned up idle resources');
    }

    return cleaned;
  }

  /**
   * Graceful shutdown - cleanup all resources
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting resource manager shutdown');

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Cleanup all resources
    const resourceIds = Array.from(this.resources.keys());
    const cleanupPromises = resourceIds.map(id => this.unregister(id));

    try {
      await Promise.allSettled(cleanupPromises);
      logger.info('Resource manager shutdown completed');
    } catch (error) {
      logger.error({ error }, 'Error during resource manager shutdown');
    }

    this.emit('shutdown');
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.cleanupIdle();
        } catch (error) {
          logger.error({ error }, 'Cleanup timer error');
        }
      }
    }, 30000); // Every 30 seconds
  }
}

/**
 * Helper to create database resource handles
 */
export function createDatabaseResource(
  connection: any,
  closeMethod: string = 'close'
): ResourceHandle {
  return {
    id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'database',
    resource: connection,
    createdAt: new Date(),
    lastUsed: new Date(),
    cleanup: async () => {
      if (connection && typeof connection[closeMethod] === 'function') {
        await connection[closeMethod]();
      }
    },
  };
}

/**
 * Helper to create Redis resource handles
 */
export function createRedisResource(client: any): ResourceHandle {
  return {
    id: `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'redis',
    resource: client,
    createdAt: new Date(),
    lastUsed: new Date(),
    cleanup: async () => {
      if (client && typeof client.disconnect === 'function') {
        await client.disconnect();
      }
    },
  };
}

/**
 * Helper to create HTTP client resource handles
 */
export function createHttpResource(client: any): ResourceHandle {
  return {
    id: `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'http',
    resource: client,
    createdAt: new Date(),
    lastUsed: new Date(),
    cleanup: async () => {
      if (client && typeof client.destroy === 'function') {
        client.destroy();
      }
    },
  };
}

/**
 * Helper to create memory resource handles (for large objects)
 */
export function createMemoryResource(
  data: any,
  name: string = 'memory'
): ResourceHandle {
  return {
    id: `memory-${name}-${Date.now()}`,
    type: 'memory',
    resource: data,
    createdAt: new Date(),
    lastUsed: new Date(),
    cleanup: async () => {
      // Help GC by clearing references
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          delete data[key];
        });
      }
    },
  };
}

// Export singleton instance
export const resourceManager = ResourceManager.getInstance();