/**
 * Comprehensive Logging System
 * Production-ready structured logging with context propagation
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  operation?: string;
  module?: string;
  [key: string]: any;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memory: NodeJS.MemoryUsage;
    cpu?: number;
  };
  tags?: string[];
  source: {
    file?: string;
    function?: string;
    line?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRedis: boolean;
  enableFile: boolean;
  enableElastic: boolean;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  elasticConfig?: {
    node: string;
    auth?: {
      username: string;
      password: string;
    };
    index: string;
  };
  fileConfig?: {
    path: string;
    maxSize: number;
    maxFiles: number;
  };
  sampling?: {
    enabled: boolean;
    rate: number; // 0-1
    rules?: Array<{
      level: LogLevel;
      rate: number;
      conditions?: Record<string, any>;
    }>;
  };
  masking?: {
    fields: string[];
    replacement: string;
  };
}

interface LogBuffer {
  entries: LogEntry[];
  maxSize: number;
  flushInterval: number;
  lastFlush: Date;
}

export class ComprehensiveLogger extends EventEmitter {
  private static instance: ComprehensiveLogger;
  private config: LoggerConfig;
  private redis?: Redis;
  private contextStorage = new AsyncLocalStorage<LogContext>();
  private buffer: LogBuffer;
  private levelPriority: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  constructor(config: LoggerConfig) {
    super();
    this.config = config;
    
    // Initialize Redis if enabled
    if (config.enableRedis && config.redisConfig) {
      this.redis = new Redis({
        host: config.redisConfig.host,
        port: config.redisConfig.port,
        password: config.redisConfig.password,
        db: config.redisConfig.db,
        keyPrefix: 'logs:',
      });
    }

    // Initialize buffer
    this.buffer = {
      entries: [],
      maxSize: 1000,
      flushInterval: 5000, // 5 seconds
      lastFlush: new Date(),
    };

    // Start periodic flush
    setInterval(() => this.flushBuffer(), this.buffer.flushInterval);

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  static getInstance(config?: LoggerConfig): ComprehensiveLogger {
    if (!ComprehensiveLogger.instance) {
      if (!config) {
        throw new Error('Logger configuration required for first initialization');
      }
      ComprehensiveLogger.instance = new ComprehensiveLogger(config);
    }
    return ComprehensiveLogger.instance;
  }

  /**
   * Set logging context for current execution
   */
  withContext<T>(context: LogContext, fn: () => T): T {
    const mergedContext = { ...this.getContext(), ...context };
    return this.contextStorage.run(mergedContext, fn);
  }

  /**
   * Get current logging context
   */
  getContext(): LogContext {
    return this.contextStorage.getStore() || {};
  }

  /**
   * Update current context
   */
  updateContext(updates: Partial<LogContext>): void {
    const current = this.getContext();
    const updated = { ...current, ...updates };
    this.contextStorage.enterWith(updated);
  }

  /**
   * Log trace message
   */
  trace(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('trace', message, metadata, tags);
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('debug', message, metadata, tags);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('info', message, metadata, tags);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('warn', message, metadata, tags);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('error', message, metadata, tags, error);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('fatal', message, metadata, tags, error);
  }

  /**
   * Log with performance measurement
   */
  performance<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): T | Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const logPerformance = (result?: any, error?: Error) => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const perfData = {
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
        memory: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
      };

      if (error) {
        this.error(
          `Operation failed: ${operation}`,
          error,
          { ...metadata, performance: perfData },
          ['performance', 'error']
        );
      } else {
        this.info(
          `Operation completed: ${operation}`,
          { ...metadata, performance: perfData },
          ['performance']
        );
      }
    };

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result
          .then((res) => {
            logPerformance(res);
            return res;
          })
          .catch((err) => {
            logPerformance(undefined, err);
            throw err;
          });
      } else {
        logPerformance(result);
        return result;
      }
    } catch (error) {
      logPerformance(undefined, error as Error);
      throw error;
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): ComprehensiveLogger {
    const childConfig = { ...this.config };
    const childLogger = new ComprehensiveLogger(childConfig);
    
    // Set initial context
    childLogger.contextStorage.enterWith({ ...this.getContext(), ...context });
    
    return childLogger;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    tags?: string[],
    error?: Error
  ): void {
    // Check if level should be logged
    if (this.levelPriority[level] < this.levelPriority[this.config.level]) {
      return;
    }

    // Apply sampling
    if (!this.shouldSample(level, metadata)) {
      return;
    }

    // Get call site information
    const source = this.getCallSite();

    // Create log entry
    const entry: LogEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      level,
      message,
      context: this.getContext(),
      metadata: this.maskSensitiveData(metadata),
      tags,
      source,
    };

    // Add error information
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Add performance data if available
    if (metadata?.performance) {
      entry.performance = metadata.performance;
    }

    // Buffer the entry
    this.bufferEntry(entry);

    // Emit event for real-time processing
    this.emit('log', entry);

    // Console output if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Check if log should be sampled
   */
  private shouldSample(level: LogLevel, metadata?: Record<string, any>): boolean {
    if (!this.config.sampling?.enabled) {
      return true;
    }

    // Check specific rules first
    if (this.config.sampling.rules) {
      for (const rule of this.config.sampling.rules) {
        if (rule.level === level) {
          // Check conditions
          if (rule.conditions && metadata) {
            const matches = Object.entries(rule.conditions).every(
              ([key, value]) => metadata[key] === value
            );
            if (matches) {
              return Math.random() < rule.rate;
            }
          } else {
            return Math.random() < rule.rate;
          }
        }
      }
    }

    // Use default rate
    return Math.random() < this.config.sampling.rate;
  }

  /**
   * Mask sensitive data
   */
  private maskSensitiveData(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata || !this.config.masking) {
      return metadata;
    }

    const masked = { ...metadata };
    const { fields, replacement } = this.config.masking;

    const maskObject = (obj: any, path = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => maskObject(item, `${path}[${index}]`));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (fields.some(field => fullPath.includes(field) || key.includes(field))) {
          result[key] = replacement;
        } else {
          result[key] = maskObject(value, fullPath);
        }
      }
      
      return result;
    };

    return maskObject(masked);
  }

  /**
   * Get call site information
   */
  private getCallSite(): LogEntry['source'] {
    const stack = new Error().stack;
    if (!stack) return {};

    const lines = stack.split('\n');
    // Skip logger internal calls
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('comprehensive-logger.ts')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
          };
        }
      }
    }

    return {};
  }

  /**
   * Buffer log entry
   */
  private bufferEntry(entry: LogEntry): void {
    this.buffer.entries.push(entry);

    // Flush if buffer is full
    if (this.buffer.entries.length >= this.buffer.maxSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush buffer to outputs
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.entries.length === 0) {
      return;
    }

    const entries = [...this.buffer.entries];
    this.buffer.entries = [];
    this.buffer.lastFlush = new Date();

    // Send to Redis
    if (this.config.enableRedis && this.redis) {
      await this.sendToRedis(entries);
    }

    // Send to Elasticsearch
    if (this.config.enableElastic) {
      await this.sendToElastic(entries);
    }

    // Send to file
    if (this.config.enableFile) {
      await this.sendToFile(entries);
    }

    this.emit('buffer_flushed', { count: entries.length });
  }

  /**
   * Send logs to Redis
   */
  private async sendToRedis(entries: LogEntry[]): Promise<void> {
    if (!this.redis) return;

    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const key = `${entry.level}:${entry.timestamp.toISOString()}:${entry.id}`;
        pipeline.setex(key, 7 * 24 * 60 * 60, JSON.stringify(entry)); // 7 days TTL
        
        // Add to level-specific sorted set
        pipeline.zadd(`level:${entry.level}`, entry.timestamp.getTime(), entry.id);
        
        // Add to tenant-specific set if available
        if (entry.context.tenantId) {
          pipeline.zadd(`tenant:${entry.context.tenantId}`, entry.timestamp.getTime(), entry.id);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Failed to send logs to Redis:', error);
    }
  }

  /**
   * Send logs to Elasticsearch
   */
  private async sendToElastic(entries: LogEntry[]): Promise<void> {
    if (!this.config.elasticConfig) return;

    try {
      // This would typically use @elastic/elasticsearch client
      // For now, we'll just emit an event that can be handled by external service
      this.emit('elastic_logs', { entries, config: this.config.elasticConfig });
    } catch (error) {
      console.error('Failed to send logs to Elasticsearch:', error);
    }
  }

  /**
   * Send logs to file
   */
  private async sendToFile(entries: LogEntry[]): Promise<void> {
    if (!this.config.fileConfig) return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const logDir = path.dirname(this.config.fileConfig.path);
      await fs.mkdir(logDir, { recursive: true });

      const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(this.config.fileConfig.path, logLines);
    } catch (error) {
      console.error('Failed to send logs to file:', error);
    }
  }

  /**
   * Output to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context.requestId ? `[${entry.context.requestId}] ` : '';
    
    let output = `${timestamp} ${level} ${context}${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n${entry.error.stack}`;
      }
    }

    // Use appropriate console method
    switch (entry.level) {
      case 'trace':
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  /**
   * Query logs
   */
  async queryLogs(query: {
    level?: LogLevel;
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    tags?: string[];
    fromTime?: Date;
    toTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<LogEntry[]> {
    if (!this.redis) {
      return [];
    }

    try {
      let keys: string[] = [];

      if (query.level) {
        const min = query.fromTime?.getTime() || 0;
        const max = query.toTime?.getTime() || Date.now();
        const ids = await this.redis.zrangebyscore(`level:${query.level}`, min, max);
        keys = ids.map(id => `${query.level}:*:${id}`);
      } else if (query.tenantId) {
        const min = query.fromTime?.getTime() || 0;
        const max = query.toTime?.getTime() || Date.now();
        const ids = await this.redis.zrangebyscore(`tenant:${query.tenantId}`, min, max);
        keys = ids.map(id => `*:${id}`);
      } else {
        keys = await this.redis.keys('*:*:*');
      }

      const entries: LogEntry[] = [];
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      for (let i = offset; i < Math.min(keys.length, offset + limit); i++) {
        try {
          const data = await this.redis.get(keys[i]);
          if (data) {
            const entry = JSON.parse(data) as LogEntry;
            
            // Apply additional filters
            if (query.userId && entry.context.userId !== query.userId) continue;
            if (query.correlationId && entry.context.correlationId !== query.correlationId) continue;
            if (query.tags && !query.tags.some(tag => entry.tags?.includes(tag))) continue;
            
            entries.push(entry);
          }
        } catch (parseError) {
          console.error('Error parsing log entry:', parseError);
        }
      }

      return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error querying logs:', error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  async getStatistics(timeRange?: { from: Date; to: Date }): Promise<{
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByTenant: Record<string, number>;
    errorRate: number;
    averageLogsPerMinute: number;
  }> {
    if (!this.redis) {
      return {
        totalLogs: 0,
        logsByLevel: {} as Record<LogLevel, number>,
        logsByTenant: {},
        errorRate: 0,
        averageLogsPerMinute: 0,
      };
    }

    try {
      const min = timeRange?.from.getTime() || 0;
      const max = timeRange?.to.getTime() || Date.now();
      
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      const logsByLevel: Record<LogLevel, number> = {} as Record<LogLevel, number>;
      let totalLogs = 0;
      let errorLogs = 0;

      for (const level of levels) {
        const count = await this.redis.zcount(`level:${level}`, min, max);
        logsByLevel[level] = count;
        totalLogs += count;
        
        if (level === 'error' || level === 'fatal') {
          errorLogs += count;
        }
      }

      // Get tenant distribution
      const tenantKeys = await this.redis.keys('tenant:*');
      const logsByTenant: Record<string, number> = {};
      
      for (const key of tenantKeys) {
        const tenantId = key.replace('tenant:', '');
        const count = await this.redis.zcount(key, min, max);
        logsByTenant[tenantId] = count;
      }

      const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
      const timeRangeMinutes = timeRange ? 
        (timeRange.to.getTime() - timeRange.from.getTime()) / (1000 * 60) : 
        1440; // 24 hours default
      const averageLogsPerMinute = totalLogs / timeRangeMinutes;

      return {
        totalLogs,
        logsByLevel,
        logsByTenant,
        errorRate,
        averageLogsPerMinute,
      };
    } catch (error) {
      console.error('Error getting log statistics:', error);
      return {
        totalLogs: 0,
        logsByLevel: {} as Record<LogLevel, number>,
        logsByTenant: {},
        errorRate: 0,
        averageLogsPerMinute: 0,
      };
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanup(olderThan: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.redis) return 0;

    try {
      const cutoff = Date.now() - olderThan;
      let deletedCount = 0;

      // Clean up level indexes
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      for (const level of levels) {
        const removed = await this.redis.zremrangebyscore(`level:${level}`, 0, cutoff);
        deletedCount += removed;
      }

      // Clean up tenant indexes
      const tenantKeys = await this.redis.keys('tenant:*');
      for (const key of tenantKeys) {
        const removed = await this.redis.zremrangebyscore(key, 0, cutoff);
        deletedCount += removed;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      return 0;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Flush remaining buffer
    await this.flushBuffer();

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }

    this.emit('shutdown');
  }
}

// Export singleton instance
export const logger = ComprehensiveLogger.getInstance({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableConsole: process.env.NODE_ENV !== 'production',
  enableRedis: process.env.REDIS_LOGGING === 'true',
  enableFile: process.env.FILE_LOGGING === 'true',
  enableElastic: process.env.ELASTIC_LOGGING === 'true',
  redisConfig: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_LOGGING_DB || '12'),
  },
  elasticConfig: process.env.ELASTIC_URL ? {
    node: process.env.ELASTIC_URL,
    auth: process.env.ELASTIC_USERNAME ? {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD!,
    } : undefined,
    index: process.env.ELASTIC_LOG_INDEX || 'manufacturing-logs',
  } : undefined,
  fileConfig: process.env.LOG_FILE_PATH ? {
    path: process.env.LOG_FILE_PATH,
    maxSize: parseInt(process.env.LOG_FILE_MAX_SIZE || '100000000'), // 100MB
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '10'),
  } : undefined,
  sampling: {
    enabled: process.env.LOG_SAMPLING === 'true',
    rate: parseFloat(process.env.LOG_SAMPLING_RATE || '1.0'),
    rules: [
      { level: 'trace', rate: 0.1 },
      { level: 'debug', rate: 0.5 },
      { level: 'info', rate: 1.0 },
      { level: 'warn', rate: 1.0 },
      { level: 'error', rate: 1.0 },
      { level: 'fatal', rate: 1.0 },
    ],
  },
  masking: {
    fields: ['password', 'token', 'secret', 'key', 'authorization', 'cookie'],
    replacement: '[MASKED]',
  },
});