/**
 * Resource Cleanup Service
 * Production-ready resource lifecycle management
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface CleanupTask {
  id: string;
  name: string;
  handler: () => Promise<void>;
  priority: number; // Lower number = higher priority
  timeout?: number;
  retries?: number;
}

interface CleanupResult {
  taskId: string;
  taskName: string;
  success: boolean;
  duration: number;
  error?: Error;
  retries: number;
}

interface ResourceTracker {
  id: string;
  type: string;
  path?: string;
  created: Date;
  lastAccessed: Date;
  size?: number;
  metadata?: any;
  cleanup?: () => Promise<void>;
}

export class ResourceCleanupService extends EventEmitter {
  private static instance: ResourceCleanupService;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private trackedResources: Map<string, ResourceTracker> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private cleanupHistory: CleanupResult[] = [];

  constructor() {
    super();
    this.setupSignalHandlers();
    this.startPeriodicCleanup();
  }

  static getInstance(): ResourceCleanupService {
    if (!ResourceCleanupService.instance) {
      ResourceCleanupService.instance = new ResourceCleanupService();
    }
    return ResourceCleanupService.instance;
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.set(task.id, task);
    this.emit('task_registered', task);
  }

  /**
   * Unregister a cleanup task
   */
  unregisterCleanupTask(taskId: string): boolean {
    const result = this.cleanupTasks.delete(taskId);
    if (result) {
      this.emit('task_unregistered', taskId);
    }
    return result;
  }

  /**
   * Track a resource for cleanup
   */
  trackResource(resource: ResourceTracker): void {
    this.trackedResources.set(resource.id, resource);
    this.emit('resource_tracked', resource);
  }

  /**
   * Untrack a resource
   */
  untrackResource(resourceId: string): boolean {
    const result = this.trackedResources.delete(resourceId);
    if (result) {
      this.emit('resource_untracked', resourceId);
    }
    return result;
  }

  /**
   * Track file for cleanup
   */
  trackFile(filePath: string, metadata?: any): string {
    const resourceId = `file:${filePath}:${Date.now()}`;
    
    this.trackResource({
      id: resourceId,
      type: 'file',
      path: filePath,
      created: new Date(),
      lastAccessed: new Date(),
      metadata,
      cleanup: async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          if ((error as any).code !== 'ENOENT') {
            throw error;
          }
        }
      },
    });

    return resourceId;
  }

  /**
   * Track directory for cleanup
   */
  trackDirectory(dirPath: string, metadata?: any): string {
    const resourceId = `dir:${dirPath}:${Date.now()}`;
    
    this.trackResource({
      id: resourceId,
      type: 'directory',
      path: dirPath,
      created: new Date(),
      lastAccessed: new Date(),
      metadata,
      cleanup: async () => {
        try {
          await fs.rmdir(dirPath, { recursive: true });
        } catch (error) {
          if ((error as any).code !== 'ENOENT') {
            throw error;
          }
        }
      },
    });

    return resourceId;
  }

  /**
   * Track temporary resource with TTL
   */
  trackTemporary(
    resource: Omit<ResourceTracker, 'created' | 'lastAccessed'>,
    ttl: number
  ): string {
    const fullResource: ResourceTracker = {
      ...resource,
      created: new Date(),
      lastAccessed: new Date(),
    };

    this.trackResource(fullResource);

    // Schedule cleanup
    setTimeout(() => {
      this.cleanupResource(resource.id);
    }, ttl);

    return resource.id;
  }

  /**
   * Clean up a specific resource
   */
  async cleanupResource(resourceId: string): Promise<boolean> {
    const resource = this.trackedResources.get(resourceId);
    if (!resource) return false;

    try {
      if (resource.cleanup) {
        await resource.cleanup();
      }
      
      this.untrackResource(resourceId);
      this.emit('resource_cleaned', resourceId);
      return true;
    } catch (error) {
      this.emit('cleanup_error', { resourceId, error });
      throw error;
    }
  }

  /**
   * Execute cleanup tasks
   */
  async executeCleanup(): Promise<CleanupResult[]> {
    if (this.isShuttingDown) {
      return [];
    }

    const results: CleanupResult[] = [];
    
    // Sort tasks by priority
    const sortedTasks = Array.from(this.cleanupTasks.values())
      .sort((a, b) => a.priority - b.priority);

    // Execute tasks
    for (const task of sortedTasks) {
      const result = await this.executeCleanupTask(task);
      results.push(result);
      this.cleanupHistory.push(result);
    }

    // Keep only last 100 results
    if (this.cleanupHistory.length > 100) {
      this.cleanupHistory = this.cleanupHistory.slice(-100);
    }

    return results;
  }

  /**
   * Execute a single cleanup task
   */
  private async executeCleanupTask(task: CleanupTask): Promise<CleanupResult> {
    const startTime = performance.now();
    let retries = 0;
    const maxRetries = task.retries || 3;

    while (retries <= maxRetries) {
      try {
        // Execute with timeout
        await this.executeWithTimeout(
          task.handler(),
          task.timeout || 30000
        );

        const duration = performance.now() - startTime;
        
        this.emit('cleanup_success', { task, duration });
        
        return {
          taskId: task.id,
          taskName: task.name,
          success: true,
          duration,
          retries,
        };
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          const duration = performance.now() - startTime;
          
          this.emit('cleanup_failure', { task, error });
          
          return {
            taskId: task.id,
            taskName: task.name,
            success: false,
            duration,
            error: error as Error,
            retries,
          };
        }

        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retries) * 1000)
        );
      }
    }

    // Should not reach here
    return {
      taskId: task.id,
      taskName: task.name,
      success: false,
      duration: performance.now() - startTime,
      error: new Error('Unexpected cleanup failure'),
      retries,
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Cleanup timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(
    tempDir: string = '/tmp',
    maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            if (stats.isDirectory()) {
              await fs.rmdir(filePath, { recursive: true });
            } else {
              await fs.unlink(filePath);
            }
            cleaned++;
          }
        } catch (error) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (error) {
      this.emit('cleanup_error', { type: 'temp_files', error });
    }

    return cleaned;
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const handler = async (signal: string) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => handler('SIGINT'));
    process.on('SIGTERM', () => handler('SIGTERM'));
    process.on('SIGUSR2', () => handler('SIGUSR2')); // Nodemon restart

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.emergencyCleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await this.emergencyCleanup();
      process.exit(1);
    });
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleResources();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up stale resources
   */
  private async cleanupStaleResources(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    const staleResources: string[] = [];

    for (const [id, resource] of this.trackedResources.entries()) {
      const age = now - resource.lastAccessed.getTime();
      
      if (age > staleThreshold) {
        staleResources.push(id);
      }
    }

    for (const id of staleResources) {
      try {
        await this.cleanupResource(id);
      } catch (error) {
        console.error(`Failed to cleanup stale resource ${id}:`, error);
      }
    }

    if (staleResources.length > 0) {
      this.emit('stale_cleanup', { count: staleResources.length });
    }
  }

  /**
   * Emergency cleanup for critical failures
   */
  private async emergencyCleanup(): Promise<void> {
    console.log('Performing emergency cleanup...');
    
    // Clean up all tracked resources
    const resources = Array.from(this.trackedResources.values());
    
    await Promise.allSettled(
      resources.map(resource => 
        resource.cleanup ? resource.cleanup() : Promise.resolve()
      )
    );
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.emit('shutdown_started');

    // Stop periodic cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Execute all cleanup tasks
    const results = await this.executeCleanup();
    
    // Clean up all tracked resources
    const resources = Array.from(this.trackedResources.values());
    await Promise.allSettled(
      resources.map(resource => this.cleanupResource(resource.id))
    );

    this.emit('shutdown_completed', { results });
  }

  /**
   * Get cleanup statistics
   */
  getStats(): {
    trackedResources: number;
    cleanupTasks: number;
    recentCleanups: CleanupResult[];
    resourcesByType: Record<string, number>;
  } {
    const resourcesByType: Record<string, number> = {};
    
    for (const resource of this.trackedResources.values()) {
      resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;
    }

    return {
      trackedResources: this.trackedResources.size,
      cleanupTasks: this.cleanupTasks.size,
      recentCleanups: this.cleanupHistory.slice(-10),
      resourcesByType,
    };
  }
}

// Register default cleanup tasks
const cleanupService = ResourceCleanupService.getInstance();

// Clean temp files
cleanupService.registerCleanupTask({
  id: 'temp-files',
  name: 'Temporary Files Cleanup',
  handler: async () => {
    const cleaned = await cleanupService.cleanupTempFiles();
    console.log(`Cleaned ${cleaned} temporary files`);
  },
  priority: 10,
  timeout: 60000,
  retries: 2,
});

// Memory cleanup
cleanupService.registerCleanupTask({
  id: 'memory-gc',
  name: 'Memory Garbage Collection',
  handler: async () => {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  },
  priority: 20,
  timeout: 5000,
  retries: 1,
});

// Export singleton instance
export { cleanupService };