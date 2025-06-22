/**
 * Enhanced Logger utility for the manufacturing analytics platform
 * Provides structured logging with database persistence and monitoring integration
 */

import { prisma } from './prisma';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 'auth' | 'api' | 'database' | 'performance' | 'security' | 'system' | 'user' | 'application';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  timestamp: Date;
  source?: string;
  stackTrace?: string;
}

interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  userId?: string;
  ipAddress?: string;
}

class Logger {
  private level: LogLevel;
  private enableColors: boolean;
  private enableDatabase: boolean;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.enableColors = process.env.NODE_ENV !== 'production';
    this.enableDatabase = process.env.ENABLE_DATABASE_LOGGING === 'true';
    
    // Start buffer flushing in production
    if (this.enableDatabase) {
      this.startBufferFlushing();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = entry.level.toUpperCase().padEnd(8);
    const categoryStr = entry.category.toUpperCase().padEnd(12);
    
    let formattedMessage = `[${timestamp}] ${levelStr} [${categoryStr}] ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata, this.sanitizeMetadata, 2);
      formattedMessage += `\n  Metadata: ${metadataStr}`;
    }
    
    if (entry.requestId) {
      formattedMessage += `\n  Request ID: ${entry.requestId}`;
    }
    
    if (entry.userId) {
      formattedMessage += `\n  User ID: ${entry.userId}`;
    }
    
    if (entry.stackTrace) {
      formattedMessage += `\n  Stack: ${entry.stackTrace}`;
    }
    
    return this.enableColors ? this.colorize(entry.level, formattedMessage) : formattedMessage;
  }

  private colorize(level: LogLevel, message: string): string {
    const colors = {
      debug: '\x1b[90m',     // Gray
      info: '\x1b[36m',      // Cyan
      warn: '\x1b[33m',      // Yellow
      error: '\x1b[31m',     // Red
      critical: '\x1b[35m'   // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    return `${color}${message}${reset}`;
  }

  private sanitizeMetadata = (key: string, value: any): any => {
    // Remove sensitive information from logs
    const sensitiveKeys = ['password', 'token', 'apikey', 'secret', 'authorization', 'cookie'];
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      return '[REDACTED]';
    }
    return value;
  };

  private async persistLogEntry(entry: LogEntry): Promise<void> {
    if (!this.enableDatabase) return;
    
    try {
      // Store critical errors immediately, buffer others
      if (entry.level === 'critical' || entry.level === 'error') {
        await this.flushToDatabase([entry]);
      } else {
        this.logBuffer.push(entry);
        
        // Flush buffer if it gets too large
        if (this.logBuffer.length >= 100) {
          await this.flushBuffer();
        }
      }
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to persist log entry:', error);
    }
  }

  private startBufferFlushing(): void {
    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(async () => {
      await this.flushBuffer();
    }, 30000);
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const entries = [...this.logBuffer];
    this.logBuffer = [];
    
    await this.flushToDatabase(entries);
  }

  private async flushToDatabase(entries: LogEntry[]): Promise<void> {
    try {
      // Note: This would require a LogEntry model in Prisma schema
      // For now, we'll use the ErrorLog model for error-level logs
      const errorEntries = entries.filter(entry => entry.level === 'error' || entry.level === 'critical');
      
      for (const entry of errorEntries) {
        await prisma.errorLog.create({
          data: {
            errorId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: entry.message,
            stack: entry.stackTrace || '',
            context: entry.category,
            severity: entry.level.toUpperCase(),
            timestamp: entry.timestamp,
            resolved: false
          }
        });
      }
    } catch (error) {
      console.error('Failed to flush logs to database:', error);
    }
  }

  private log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, any>, options?: {
    userId?: string;
    requestId?: string;
    sessionId?: string;
    source?: string;
    error?: Error;
  }): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      category,
      message,
      metadata,
      userId: options.userId,
      requestId: options.requestId,
      sessionId: options.sessionId,
      timestamp: new Date(),
      source: options.source,
      stackTrace: options.error?.stack
    };

    // Always log to console
    const formattedMessage = this.formatMessage(entry);
    switch (level) {
      case 'debug':
        console.log(formattedMessage);
        break;
      case 'info':
        console.log(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
      case 'critical':
        console.error(formattedMessage);
        break;
    }

    // Persist to database if enabled
    this.persistLogEntry(entry);
  }

  // Public logging methods
  debug(message: string, metadata?: Record<string, any>, options?: { category?: LogCategory; userId?: string; requestId?: string }) {
    this.log('debug', options?.category || 'application', message, metadata, options);
  }

  info(message: string, metadata?: Record<string, any>, options?: { category?: LogCategory; userId?: string; requestId?: string }) {
    this.log('info', options?.category || 'application', message, metadata, options);
  }

  warn(message: string, metadata?: Record<string, any>, options?: { category?: LogCategory; userId?: string; requestId?: string }) {
    this.log('warn', options?.category || 'application', message, metadata, options);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>, options?: { category?: LogCategory; userId?: string; requestId?: string }) {
    this.log('error', options?.category || 'application', message, metadata, { ...options, error });
  }

  critical(message: string, error?: Error, metadata?: Record<string, any>, options?: { category?: LogCategory; userId?: string; requestId?: string }) {
    this.log('critical', options?.category || 'system', message, metadata, { ...options, error });
  }

  // Specialized logging methods
  logAuth(message: string, userId?: string, metadata?: Record<string, any>) {
    this.info(message, metadata, { category: 'auth', userId });
  }

  logSecurity(message: string, level: 'warn' | 'error' | 'critical' = 'warn', metadata?: Record<string, any>) {
    this.log(level, 'security', message, metadata);
  }

  logDatabase(message: string, operation: string, duration?: number, metadata?: Record<string, any>) {
    const logMetadata = { operation, duration, ...metadata };
    const level = duration && duration > 1000 ? 'warn' : 'info'; // Warn for slow queries
    this.log(level, 'database', message, logMetadata);
  }

  logRequest(context: RequestContext, responseTime: number, statusCode: number, error?: Error) {
    const metadata = {
      method: context.method,
      url: context.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    };

    let level: LogLevel = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';
    else if (responseTime > 2000) level = 'warn';

    const message = `${context.method} ${context.url} - ${statusCode} (${responseTime}ms)`;
    this.log(level, 'api', message, metadata, { 
      userId: context.userId, 
      requestId: context.requestId,
      error 
    });
  }

  logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn for operations taking > 5s
    this.log(level, 'performance', `${operation} completed`, { duration: `${duration}ms`, ...metadata });
  }

  logUserAction(action: string, userId: string, metadata?: Record<string, any>) {
    this.info(`User action: ${action}`, metadata, { category: 'user', userId });
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushBuffer();
  }
}

// Create and export singleton instance
export const logger = new Logger();