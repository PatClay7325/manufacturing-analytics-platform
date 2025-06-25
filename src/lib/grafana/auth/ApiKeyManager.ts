import crypto from 'crypto';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';
import { grafanaClient } from '../GrafanaClient';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  grafanaKeyId?: number;
  role: 'Admin' | 'Editor' | 'Viewer';
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  createdBy: string;
}

export interface CreateApiKeyOptions {
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  secondsToLive?: number;
  userId: string;
}

export class ApiKeyManager {
  private readonly ENCRYPTION_KEY: string;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_PREFIX = 'mfg_';

  constructor() {
    // Use environment variable or generate a stable key
    this.ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 
      crypto.createHash('sha256').update(
        process.env.NEXTAUTH_SECRET || 'default-encryption-key'
      ).digest();
  }

  /**
   * Create a new API key
   */
  async createApiKey(options: CreateApiKeyOptions): Promise<ApiKey> {
    const { name, role, secondsToLive, userId } = options;

    // Generate a secure random key
    const rawKey = crypto.randomBytes(32).toString('base64url');
    const fullKey = `${this.KEY_PREFIX}${rawKey}`;
    
    // Hash the key for storage
    const hashedKey = this.hashKey(fullKey);
    
    // Calculate expiration
    const expiresAt = secondsToLive 
      ? new Date(Date.now() + secondsToLive * 1000)
      : undefined;

    try {
      // Create key in Grafana if integration is enabled
      let grafanaKeyId: number | undefined;
      if (process.env.GRAFANA_API_KEY) {
        try {
          const grafanaResponse = await grafanaClient.createApiKey({
            name: `NextJS-${name}`,
            role,
            secondsToLive,
          });
          grafanaKeyId = grafanaResponse.id;
        } catch (error) {
          logger.warn('Failed to create Grafana API key:', error);
          // Continue without Grafana integration
        }
      }

      // Encrypt the key for secure storage
      const encryptedKey = this.encryptKey(fullKey);

      // Store in database
      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          hashedKey,
          encryptedKey,
          grafanaKeyId,
          role,
          expiresAt,
          createdBy: userId,
        },
      });

      logger.info(`API key created: ${name} with role ${role} by user ${userId}`);

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey, // Return the full key only on creation
        hashedKey: apiKey.hashedKey,
        grafanaKeyId: apiKey.grafanaKeyId || undefined,
        role: apiKey.role as 'Admin' | 'Editor' | 'Viewer',
        expiresAt: apiKey.expiresAt || undefined,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt || undefined,
        createdBy: apiKey.createdBy,
      };
    } catch (error) {
      logger.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate an API key
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    if (!key.startsWith(this.KEY_PREFIX)) {
      return null;
    }

    const hashedKey = this.hashKey(key);

    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey },
      });

      if (!apiKey) {
        return null;
      }

      // Check if expired
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        logger.warn(`API key ${apiKey.name} has expired`);
        return null;
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: '', // Don't return the actual key
        hashedKey: apiKey.hashedKey,
        grafanaKeyId: apiKey.grafanaKeyId || undefined,
        role: apiKey.role as 'Admin' | 'Editor' | 'Viewer',
        expiresAt: apiKey.expiresAt || undefined,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt || undefined,
        createdBy: apiKey.createdBy,
      };
    } catch (error) {
      logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * List API keys for a user
   */
  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'key'>[]> {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { createdBy: userId },
        orderBy: { createdAt: 'desc' },
      });

      return apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        key: '', // Don't return the actual key
        hashedKey: key.hashedKey,
        grafanaKeyId: key.grafanaKeyId || undefined,
        role: key.role as 'Admin' | 'Editor' | 'Viewer',
        expiresAt: key.expiresAt || undefined,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt || undefined,
        createdBy: key.createdBy,
      }));
    } catch (error) {
      logger.error('Error listing API keys:', error);
      throw new Error('Failed to list API keys');
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id: keyId,
          createdBy: userId,
        },
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Revoke in Grafana if integrated
      if (apiKey.grafanaKeyId && process.env.GRAFANA_API_KEY) {
        try {
          await grafanaClient.deleteApiKey(apiKey.grafanaKeyId);
        } catch (error) {
          logger.warn('Failed to revoke Grafana API key:', error);
        }
      }

      // Delete from database
      await prisma.apiKey.delete({
        where: { id: keyId },
      });

      logger.info(`API key ${apiKey.name} revoked by user ${userId}`);
    } catch (error) {
      logger.error('Error revoking API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Rotate an API key
   */
  async rotateApiKey(keyId: string, userId: string): Promise<ApiKey> {
    try {
      const oldKey = await prisma.apiKey.findFirst({
        where: {
          id: keyId,
          createdBy: userId,
        },
      });

      if (!oldKey) {
        throw new Error('API key not found');
      }

      // Create new key with same settings
      const newKey = await this.createApiKey({
        name: `${oldKey.name} (rotated)`,
        role: oldKey.role as 'Admin' | 'Editor' | 'Viewer',
        secondsToLive: oldKey.expiresAt 
          ? Math.floor((oldKey.expiresAt.getTime() - Date.now()) / 1000)
          : undefined,
        userId,
      });

      // Revoke old key
      await this.revokeApiKey(keyId, userId);

      logger.info(`API key ${oldKey.name} rotated by user ${userId}`);

      return newKey;
    } catch (error) {
      logger.error('Error rotating API key:', error);
      throw new Error('Failed to rotate API key');
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await prisma.apiKey.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired API keys`);
      }

      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired API keys:', error);
      return 0;
    }
  }

  /**
   * Get API key statistics
   */
  async getApiKeyStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    byRole: Record<string, number>;
    recentlyUsed: number;
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [total, expired, byRole, recentlyUsed] = await Promise.all([
        prisma.apiKey.count(),
        prisma.apiKey.count({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),
        prisma.apiKey.groupBy({
          by: ['role'],
          _count: true,
        }),
        prisma.apiKey.count({
          where: {
            lastUsedAt: {
              gte: oneDayAgo,
            },
          },
        }),
      ]);

      const roleStats = byRole.reduce((acc, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        active: total - expired,
        expired,
        byRole: roleStats,
        recentlyUsed,
      };
    } catch (error) {
      logger.error('Error getting API key stats:', error);
      throw new Error('Failed to get API key statistics');
    }
  }

  /**
   * Hash a key using SHA-256
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Encrypt a key for storage
   */
  private encryptKey(key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
      iv
    );

    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a stored key
   */
  private decryptKey(encryptedKey: string): string {
    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager();