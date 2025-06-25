import { createClient, RedisClientType } from 'redis';
import { logger } from '@/lib/logger';
import { GrafanaApiService } from '@/services/grafana/GrafanaApiService';
import { CircuitBreaker } from '@/lib/resilience/CircuitBreaker';
import { RetryManager, RetryStrategy } from '@/lib/resilience/RetryManager';
import { EnhancedError } from '@/lib/enhanced-error/EnhancedError';

export interface SessionConfig {
  redisUrl: string;
  sessionTtl: number; // in seconds
  grafanaConfig?: {
    url: string;
    adminApiKey: string;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'ENGINEER' | 'OPERATOR';
  firstName?: string;
  lastName?: string;
  permissions?: string[];
}

export interface SessionData {
  userId: string;
  email: string;
  username: string;
  role: string;
  grafanaToken?: string;
  grafanaUserId?: number;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionMetrics {
  activeSessions: number;
  totalSessions: number;
  expiredSessions: number;
  grafanaTokens: number;
  errors: number;
}

export class SessionBridge {
  private redis: RedisClientType;
  private config: SessionConfig;
  private grafanaService?: GrafanaApiService;
  private circuitBreaker: CircuitBreaker;
  private retryManager: RetryManager;
  private metrics: SessionMetrics;

  constructor(config: SessionConfig) {
    this.config = config;
    this.metrics = {
      activeSessions: 0,
      totalSessions: 0,
      expiredSessions: 0,
      grafanaTokens: 0,
      errors: 0
    };

    // Initialize Redis client
    this.redis = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 5000,
      },
    });

    // Initialize Grafana service if config provided
    if (config.grafanaConfig) {
      this.grafanaService = new GrafanaApiService({
        grafanaUrl: config.grafanaConfig.url,
        apiKey: config.grafanaConfig.adminApiKey,
      });
    }

    // Circuit breaker for Redis operations
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      timeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      name: 'session-bridge-redis'
    });

    // Retry manager for failed operations
    this.retryManager = new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL,
      baseDelay: 1000,
      maxDelay: 5000,
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
    });

    this.setupRedisEventHandlers();
    this.startPeriodicCleanup();
  }

  private setupRedisEventHandlers(): void {
    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error });
      this.metrics.errors++;
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected for session management');
    });

    this.redis.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('SessionBridge initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SessionBridge', { error });
      throw EnhancedError.database('Failed to connect to Redis for session management', { error });
    }
  }

  async createSession(user: User, metadata?: { ipAddress?: string; userAgent?: string }): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      
      // Create Grafana API token for the user
      let grafanaToken: string | undefined;
      let grafanaUserId: number | undefined;

      if (this.grafanaService) {
        try {
          const grafanaTokenResponse = await this.grafanaService.createApiKey(
            `session-${user.id}-${Date.now()}`,
            this.mapRoleToGrafanaRole(user.role),
            this.config.sessionTtl // Token expires with session
          );
          
          grafanaToken = grafanaTokenResponse.key;
          this.metrics.grafanaTokens++;

          // Get or create Grafana user
          let grafanaUser = await this.grafanaService.getUserByEmail(user.email);
          if (!grafanaUser) {
            // Create user in Grafana
            await this.grafanaService.addOrgUser(user.email, this.mapRoleToGrafanaRole(user.role));
            grafanaUser = await this.grafanaService.getUserByEmail(user.email);
          }
          grafanaUserId = grafanaUser?.id;

        } catch (error) {
          logger.warn('Failed to create Grafana token, session will work without Grafana integration', { 
            userId: user.id, 
            error 
          });
          // Don't fail session creation if Grafana is unavailable
        }
      }

      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        grafanaToken,
        grafanaUserId,
        expiresAt: Date.now() + (this.config.sessionTtl * 1000),
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      await this.circuitBreaker.execute(async () => {
        return this.retryManager.execute(async () => {
          await this.redis.setEx(
            this.getSessionKey(sessionId), 
            this.config.sessionTtl, 
            JSON.stringify(sessionData)
          );
        });
      });

      this.metrics.activeSessions++;
      this.metrics.totalSessions++;

      logger.info('Session created successfully', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: user.id,
        username: user.username,
        hasGrafanaToken: !!grafanaToken
      });

      return sessionId;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to create session', { userId: user.id, error });
      throw EnhancedError.system('Failed to create user session', undefined, { error });
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSessionData(sessionId);
      
      if (!sessionData) {
        return false;
      }

      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        await this.cleanupSession(sessionId);
        this.metrics.expiredSessions++;
        return false;
      }

      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();
      await this.updateSessionData(sessionId, sessionData);

      return true;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Session validation failed', { sessionId: sessionId.substring(0, 8) + '...', error });
      return false;
    }
  }

  async getSessionData(sessionId: string): Promise<SessionData | null> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return this.retryManager.execute(async () => {
          const data = await this.redis.get(this.getSessionKey(sessionId));
          return data ? JSON.parse(data) : null;
        });
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get session data', { sessionId: sessionId.substring(0, 8) + '...', error });
      return null;
    }
  }

  async updateSessionData(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        return this.retryManager.execute(async () => {
          const ttl = Math.ceil((sessionData.expiresAt - Date.now()) / 1000);
          if (ttl > 0) {
            await this.redis.setEx(
              this.getSessionKey(sessionId), 
              ttl, 
              JSON.stringify(sessionData)
            );
          }
        });
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to update session data', { sessionId: sessionId.substring(0, 8) + '...', error });
      throw EnhancedError.database('Failed to update session', { sessionId, error });
    }
  }

  async extendSession(sessionId: string, additionalTtl?: number): Promise<boolean> {
    try {
      const sessionData = await this.getSessionData(sessionId);
      if (!sessionData) {
        return false;
      }

      const extendBy = additionalTtl || this.config.sessionTtl;
      sessionData.expiresAt = Date.now() + (extendBy * 1000);
      sessionData.lastAccessedAt = Date.now();

      await this.updateSessionData(sessionId, sessionData);
      
      logger.debug('Session extended', {
        sessionId: sessionId.substring(0, 8) + '...',
        newExpiry: new Date(sessionData.expiresAt).toISOString()
      });

      return true;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to extend session', { sessionId: sessionId.substring(0, 8) + '...', error });
      return false;
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSessionData(sessionId);
      
      // Cleanup Grafana token if it exists
      if (sessionData?.grafanaToken && this.grafanaService) {
        try {
          // Get API keys and find the one for this session
          const apiKeys = await this.grafanaService.getApiKeys();
          const sessionKey = apiKeys.find(key => 
            key.name.includes(`session-${sessionData.userId}`)
          );
          
          if (sessionKey) {
            await this.grafanaService.deleteApiKey(sessionKey.id);
            this.metrics.grafanaTokens--;
          }
        } catch (error) {
          logger.warn('Failed to cleanup Grafana token', { 
            sessionId: sessionId.substring(0, 8) + '...', 
            error 
          });
        }
      }

      // Remove session from Redis
      await this.circuitBreaker.execute(async () => {
        return this.retryManager.execute(async () => {
          await this.redis.del(this.getSessionKey(sessionId));
        });
      });

      this.metrics.activeSessions = Math.max(0, this.metrics.activeSessions - 1);

      logger.info('Session cleaned up successfully', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: sessionData?.userId
      });

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to cleanup session', { sessionId: sessionId.substring(0, 8) + '...', error });
      throw EnhancedError.database('Failed to cleanup session', { sessionId, error });
    }
  }

  async getUserSessions(userId: string): Promise<string[]> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return this.retryManager.execute(async () => {
          const pattern = this.getSessionKey('*');
          const keys = await this.redis.keys(pattern);
          
          const userSessions: string[] = [];
          
          for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
              const sessionData: SessionData = JSON.parse(data);
              if (sessionData.userId === userId) {
                userSessions.push(key.replace('session:', ''));
              }
            }
          }
          
          return userSessions;
        });
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get user sessions', { userId, error });
      return [];
    }
  }

  async cleanupUserSessions(userId: string): Promise<number> {
    try {
      const userSessions = await this.getUserSessions(userId);
      
      for (const sessionId of userSessions) {
        await this.cleanupSession(sessionId);
      }

      logger.info('User sessions cleaned up', { userId, count: userSessions.length });
      return userSessions.length;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to cleanup user sessions', { userId, error });
      return 0;
    }
  }

  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private mapRoleToGrafanaRole(role: string): 'Admin' | 'Editor' | 'Viewer' {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'ENGINEER':
        return 'Editor';
      case 'OPERATOR':
      default:
        return 'Viewer';
    }
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        logger.error('Periodic session cleanup failed', { error });
      }
    }, 5 * 60 * 1000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const pattern = this.getSessionKey('*');
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      const now = Date.now();

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData: SessionData = JSON.parse(data);
          if (now > sessionData.expiresAt) {
            const sessionId = key.replace('session:', '');
            await this.cleanupSession(sessionId);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info('Expired sessions cleaned up', { count: cleanedCount });
        this.metrics.expiredSessions += cleanedCount;
      }

    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
    }
  }

  async updateGrafanaToken(sessionId: string, newToken: string): Promise<void> {
    try {
      const sessionData = await this.getSessionData(sessionId);
      if (sessionData) {
        sessionData.grafanaToken = newToken;
        await this.updateSessionData(sessionId, sessionData);
        
        logger.debug('Grafana token updated for session', {
          sessionId: sessionId.substring(0, 8) + '...'
        });
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to update Grafana token', { sessionId: sessionId.substring(0, 8) + '...', error });
      throw EnhancedError.database('Failed to update Grafana token', { sessionId, error });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      logger.info('SessionBridge disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect SessionBridge', { error });
    }
  }
}