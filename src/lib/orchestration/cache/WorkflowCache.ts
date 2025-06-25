/**
 * Redis-based caching layer for workflow orchestration
 * Provides high-performance caching with TTL and invalidation
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis/redisClient';
import { WorkflowDefinition } from '../types';

export class WorkflowCache {
  private redis: Redis;
  private readonly defaultTtl = 300000; // 5 minutes
  private readonly keyPrefix = 'workflow-cache:';

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Cache workflow definition
   */
  async setWorkflow(workflowId: string, workflow: WorkflowDefinition, ttl?: number): Promise<void> {
    try {
      const key = `${this.keyPrefix}definition:${workflowId}`;
      const value = JSON.stringify(workflow);
      
      if (ttl) {
        await this.redis.setex(key, Math.floor(ttl / 1000), value);
      } else {
        await this.redis.psetex(key, this.defaultTtl, value);
      }

      // Also cache version-specific key
      const versionKey = `${this.keyPrefix}definition:${workflowId}:${workflow.version}`;
      await this.redis.psetex(versionKey, this.defaultTtl, value);

      logger.debug({
        workflowId,
        version: workflow.version,
        ttl: ttl || this.defaultTtl,
      }, 'Workflow cached');

    } catch (error) {
      logger.error({ 
        error, 
        workflowId 
      }, 'Failed to cache workflow');
    }
  }

  /**
   * Get cached workflow definition
   */
  async getWorkflow(workflowId: string, version?: string): Promise<WorkflowDefinition | null> {
    try {
      const key = version 
        ? `${this.keyPrefix}definition:${workflowId}:${version}`
        : `${this.keyPrefix}definition:${workflowId}`;
      
      const value = await this.redis.get(key);
      
      if (value) {
        logger.debug({
          workflowId,
          version,
          cacheHit: true,
        }, 'Workflow cache hit');
        
        return JSON.parse(value) as WorkflowDefinition;
      }

      logger.debug({
        workflowId,
        version,
        cacheHit: false,
      }, 'Workflow cache miss');

      return null;
    } catch (error) {
      logger.error({ 
        error, 
        workflowId, 
        version 
      }, 'Failed to get cached workflow');
      return null;
    }
  }

  /**
   * Invalidate workflow cache
   */
  async invalidateWorkflow(workflowId: string, version?: string): Promise<void> {
    try {
      const keys = [];
      
      if (version) {
        keys.push(`${this.keyPrefix}definition:${workflowId}:${version}`);
      } else {
        // Get all versions and main key
        const pattern = `${this.keyPrefix}definition:${workflowId}*`;
        const matchingKeys = await this.redis.keys(pattern);
        keys.push(...matchingKeys);
      }

      if (keys.length > 0) {
        await this.redis.del(...keys);
        
        logger.debug({
          workflowId,
          version,
          keysDeleted: keys.length,
        }, 'Workflow cache invalidated');
      }

    } catch (error) {
      logger.error({ 
        error, 
        workflowId, 
        version 
      }, 'Failed to invalidate workflow cache');
    }
  }

  /**
   * Cache execution result
   */
  async setExecutionResult(
    executionId: string, 
    result: any, 
    ttl: number = 3600000 // 1 hour default
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}execution:${executionId}`;
      const value = JSON.stringify({
        result,
        cachedAt: new Date().toISOString(),
      });
      
      await this.redis.psetex(key, ttl, value);

      logger.debug({
        executionId,
        ttl,
      }, 'Execution result cached');

    } catch (error) {
      logger.error({ 
        error, 
        executionId 
      }, 'Failed to cache execution result');
    }
  }

  /**
   * Get cached execution result
   */
  async getExecutionResult(executionId: string): Promise<{
    result: any;
    cachedAt: string;
  } | null> {
    try {
      const key = `${this.keyPrefix}execution:${executionId}`;
      const value = await this.redis.get(key);
      
      if (value) {
        logger.debug({
          executionId,
          cacheHit: true,
        }, 'Execution result cache hit');
        
        return JSON.parse(value);
      }

      return null;
    } catch (error) {
      logger.error({ 
        error, 
        executionId 
      }, 'Failed to get cached execution result');
      return null;
    }
  }

  /**
   * Cache transformation result
   */
  async setTransformationResult(
    transformer: string,
    inputHash: string,
    result: any,
    ttl: number = 1800000 // 30 minutes default
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}transform:${transformer}:${inputHash}`;
      const value = JSON.stringify({
        result,
        cachedAt: new Date().toISOString(),
      });
      
      await this.redis.psetex(key, ttl, value);

      logger.debug({
        transformer,
        inputHash,
        ttl,
      }, 'Transformation result cached');

    } catch (error) {
      logger.error({ 
        error, 
        transformer, 
        inputHash 
      }, 'Failed to cache transformation result');
    }
  }

  /**
   * Get cached transformation result
   */
  async getTransformationResult(
    transformer: string,
    inputHash: string
  ): Promise<{
    result: any;
    cachedAt: string;
  } | null> {
    try {
      const key = `${this.keyPrefix}transform:${transformer}:${inputHash}`;
      const value = await this.redis.get(key);
      
      if (value) {
        logger.debug({
          transformer,
          inputHash,
          cacheHit: true,
        }, 'Transformation result cache hit');
        
        return JSON.parse(value);
      }

      return null;
    } catch (error) {
      logger.error({ 
        error, 
        transformer, 
        inputHash 
      }, 'Failed to get cached transformation result');
      return null;
    }
  }

  /**
   * Cache agent execution result
   */
  async setAgentResult(
    agentType: string,
    inputHash: string,
    result: any,
    ttl: number = 900000 // 15 minutes default
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}agent:${agentType}:${inputHash}`;
      const value = JSON.stringify({
        result,
        cachedAt: new Date().toISOString(),
      });
      
      await this.redis.psetex(key, ttl, value);

      logger.debug({
        agentType,
        inputHash,
        ttl,
      }, 'Agent result cached');

    } catch (error) {
      logger.error({ 
        error, 
        agentType, 
        inputHash 
      }, 'Failed to cache agent result');
    }
  }

  /**
   * Get cached agent result
   */
  async getAgentResult(
    agentType: string,
    inputHash: string
  ): Promise<{
    result: any;
    cachedAt: string;
  } | null> {
    try {
      const key = `${this.keyPrefix}agent:${agentType}:${inputHash}`;
      const value = await this.redis.get(key);
      
      if (value) {
        logger.debug({
          agentType,
          inputHash,
          cacheHit: true,
        }, 'Agent result cache hit');
        
        return JSON.parse(value);
      }

      return null;
    } catch (error) {
      logger.error({ 
        error, 
        agentType, 
        inputHash 
      }, 'Failed to get cached agent result');
      return null;
    }
  }

  /**
   * Generate hash for input caching
   */
  generateInputHash(input: any): string {
    try {
      const normalized = JSON.stringify(input, Object.keys(input).sort());
      return require('crypto')
        .createHash('sha256')
        .update(normalized)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for shorter keys
    } catch (error) {
      logger.error({ error, input: typeof input }, 'Failed to generate input hash');
      return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        
        logger.info({
          keysDeleted: keys.length,
        }, 'All workflow cache cleared');
      }

    } catch (error) {
      logger.error({ error }, 'Failed to clear workflow cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    keysByType: Record<string, number>;
    memoryUsage: string;
  }> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      const keysByType: Record<string, number> = {};
      
      for (const key of keys) {
        const type = key.split(':')[1] || 'unknown';
        keysByType[type] = (keysByType[type] || 0) + 1;
      }

      const memoryInfo = await this.redis.memory('USAGE', pattern);
      const memoryUsage = typeof memoryInfo === 'number' 
        ? `${Math.round(memoryInfo / 1024 / 1024 * 100) / 100} MB`
        : 'Unknown';

      return {
        totalKeys: keys.length,
        keysByType,
        memoryUsage,
      };

    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return {
        totalKeys: 0,
        keysByType: {},
        memoryUsage: 'Unknown',
      };
    }
  }
}