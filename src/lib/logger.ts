/**
 * Logger utility for the application
 * Provides consistent logging across all modules
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel;
  private enableColors: boolean;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `[${timestamp}] ${levelStr}: ${message}`;
    
    if (args.length > 0) {
      const additionalInfo = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
      formattedMessage += ` ${additionalInfo}`;
    }
    
    return this.enableColors ? this.colorize(level, formattedMessage) : formattedMessage;
  }

  private colorize(level: LogLevel, message: string): string {
    const colors = {
      debug: '\x1b[90m', // Gray
      info: '\x1b[36m',  // Cyan
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    return `${color}${message}${reset}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  // Structured logging methods
  logRequest(req: any, res: any, responseTime: number) {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.status,
      responseTime: `${responseTime}ms`
    };

    const level = res.status >= 400 ? 'warn' : 'info';
    if (level === 'warn') {
      this.warn(`${req.method} ${req.url}`, logData);
    } else {
      this.info(`${req.method} ${req.url}`, logData);
    }
  }

  logError(error: Error, context: Record<string, any> = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    };

    this.error('Application error:', errorInfo);
  }

  logPerformance(operation: string, duration: number, metadata: Record<string, any> = {}) {
    this.info(`Performance: ${operation} completed in ${duration}ms`, metadata);
  }
}

// Create and export singleton instance
export const logger = new Logger();