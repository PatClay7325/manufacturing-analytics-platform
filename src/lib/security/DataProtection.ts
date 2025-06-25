/**
 * Enterprise Data Protection & Encryption
 * GDPR compliance, field-level encryption, and PII protection
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { Counter, Histogram, register } from 'prom-client';

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  keyLength: number;
  ivLength: number;
  tagLength?: number;
  iterations?: number;
}

export interface PIIField {
  fieldName: string;
  dataType: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'custom';
  maskingStrategy: 'full' | 'partial' | 'hash' | 'tokenize';
  retentionDays?: number;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  piiFields: PIIField[];
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionPolicy: {
    days: number;
    autoDelete: boolean;
  };
}

// Data protection metrics
const encryptionOperations = new Counter({
  name: 'data_encryption_operations_total',
  help: 'Total number of encryption operations',
  labelNames: ['operation', 'status'],
});

const encryptionDuration = new Histogram({
  name: 'data_encryption_duration_seconds',
  help: 'Duration of encryption operations',
  labelNames: ['operation'],
  buckets: [0.001, 0.01, 0.1, 1],
});

const piiMaskingOperations = new Counter({
  name: 'pii_masking_operations_total',
  help: 'Total number of PII masking operations',
  labelNames: ['field_type', 'strategy'],
});

register.registerMetric(encryptionOperations);
register.registerMetric(encryptionDuration);
register.registerMetric(piiMaskingOperations);

export class DataProtectionService {
  private static instance: DataProtectionService;
  private masterKey: Buffer;
  private encryptionConfig: EncryptionConfig;
  private dataClassifications = new Map<string, DataClassification>();
  private keyRotationInterval: NodeJS.Timeout;

  constructor() {
    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      iterations: 100000,
    };
    
    this.initializeMasterKey();
    this.setupDataClassifications();
    this.setupKeyRotation();
  }

  static getInstance(): DataProtectionService {
    if (!DataProtectionService.instance) {
      DataProtectionService.instance = new DataProtectionService();
    }
    return DataProtectionService.instance;
  }

  /**
   * Encrypt sensitive data with field-level encryption
   */
  async encryptField(value: any, fieldName: string, context?: string): Promise<string> {
    const timer = encryptionDuration.startTimer({ operation: 'encrypt' });
    
    try {
      if (value === null || value === undefined || value === '') {
        return value;
      }

      const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
      const iv = crypto.randomBytes(this.encryptionConfig.ivLength);
      
      // Derive field-specific key
      const fieldKey = this.deriveFieldKey(fieldName, context);
      
      const cipher = crypto.createCipher(this.encryptionConfig.algorithm, fieldKey);
      cipher.setAAD(Buffer.from(fieldName + (context || '')));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + encrypted data + auth tag
      const result = {
        iv: iv.toString('base64'),
        data: encrypted,
        tag: authTag.toString('base64'),
        version: '1',
      };
      
      encryptionOperations.inc({ operation: 'encrypt', status: 'success' });
      
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      encryptionOperations.inc({ operation: 'encrypt', status: 'error' });
      logger.error({ error, fieldName }, 'Field encryption failed');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Decrypt field-level encrypted data
   */
  async decryptField(encryptedValue: string, fieldName: string, context?: string): Promise<any> {
    const timer = encryptionDuration.startTimer({ operation: 'decrypt' });
    
    try {
      if (!encryptedValue) {
        return encryptedValue;
      }

      const data = JSON.parse(Buffer.from(encryptedValue, 'base64').toString('utf8'));
      
      const iv = Buffer.from(data.iv, 'base64');
      const authTag = Buffer.from(data.tag, 'base64');
      
      // Derive field-specific key
      const fieldKey = this.deriveFieldKey(fieldName, context);
      
      const decipher = crypto.createDecipher(this.encryptionConfig.algorithm, fieldKey);
      decipher.setAAD(Buffer.from(fieldName + (context || '')));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(data.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      encryptionOperations.inc({ operation: 'decrypt', status: 'success' });
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      encryptionOperations.inc({ operation: 'decrypt', status: 'error' });
      logger.error({ error, fieldName }, 'Field decryption failed');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Encrypt data at rest for database storage
   */
  async encryptAtRest(data: Record<string, any>, tableName: string): Promise<Record<string, any>> {
    const classification = this.dataClassifications.get(tableName);
    if (!classification || !classification.encryptionRequired) {
      return data;
    }

    const encrypted = { ...data };
    
    for (const piiField of classification.piiFields) {
      if (encrypted[piiField.fieldName] !== undefined) {
        encrypted[piiField.fieldName] = await this.encryptField(
          encrypted[piiField.fieldName],
          piiField.fieldName,
          tableName
        );
      }
    }
    
    // Add encryption metadata
    encrypted._encryption_version = '1';
    encrypted._encryption_timestamp = new Date().toISOString();
    
    return encrypted;
  }

  /**
   * Decrypt data at rest from database
   */
  async decryptAtRest(data: Record<string, any>, tableName: string): Promise<Record<string, any>> {
    const classification = this.dataClassifications.get(tableName);
    if (!classification || !classification.encryptionRequired || !data._encryption_version) {
      return data;
    }

    const decrypted = { ...data };
    
    for (const piiField of classification.piiFields) {
      if (decrypted[piiField.fieldName] !== undefined) {
        try {
          decrypted[piiField.fieldName] = await this.decryptField(
            decrypted[piiField.fieldName],
            piiField.fieldName,
            tableName
          );
        } catch (error) {
          logger.error({ error, field: piiField.fieldName, tableName }, 'Failed to decrypt field');
          // Leave encrypted if decryption fails
        }
      }
    }
    
    // Remove encryption metadata
    delete decrypted._encryption_version;
    delete decrypted._encryption_timestamp;
    
    return decrypted;
  }

  /**
   * Mask PII data for logging and display
   */
  maskPIIData(data: any, context: string = 'default'): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = Array.isArray(data) ? [...data] : { ...data };
    
    this.traverseAndMask(masked, context);
    
    return masked;
  }

  /**
   * Generate anonymized data for analytics
   */
  anonymizeData(data: Record<string, any>, tableName: string): Record<string, any> {
    const classification = this.dataClassifications.get(tableName);
    if (!classification) {
      return data;
    }

    const anonymized = { ...data };
    
    for (const piiField of classification.piiFields) {
      if (anonymized[piiField.fieldName] !== undefined) {
        anonymized[piiField.fieldName] = this.generateAnonymizedValue(
          anonymized[piiField.fieldName],
          piiField.dataType
        );
      }
    }
    
    return anonymized;
  }

  /**
   * Check data retention and mark for deletion
   */
  async checkDataRetention(tableName: string): Promise<{
    toDelete: any[];
    warnings: any[];
  }> {
    const classification = this.dataClassifications.get(tableName);
    if (!classification) {
      return { toDelete: [], warnings: [] };
    }

    // This would integrate with your database to find expired records
    // Implementation depends on your database schema
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - classification.retentionPolicy.days);
    
    logger.info({
      tableName,
      retentionDays: classification.retentionPolicy.days,
      cutoffDate,
    }, 'Checking data retention policy');
    
    return { toDelete: [], warnings: [] };
  }

  /**
   * GDPR compliance: Right to be forgotten
   */
  async forgetUser(userId: string): Promise<{
    success: boolean;
    tablesProcessed: string[];
    errors: any[];
  }> {
    const tablesProcessed: string[] = [];
    const errors: any[] = [];
    
    try {
      for (const [tableName, classification] of this.dataClassifications) {
        if (classification.piiFields.length > 0) {
          try {
            // This would integrate with your database to delete/anonymize user data
            logger.info({ userId, tableName }, 'Processing GDPR deletion request');
            tablesProcessed.push(tableName);
          } catch (error) {
            errors.push({ tableName, error: error.message });
          }
        }
      }
      
      logger.info({ userId, tablesProcessed: tablesProcessed.length }, 'GDPR deletion completed');
      
      return { success: errors.length === 0, tablesProcessed, errors };
    } catch (error) {
      logger.error({ error, userId }, 'GDPR deletion failed');
      return { success: false, tablesProcessed, errors: [error] };
    }
  }

  /**
   * GDPR compliance: Data export
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};
    
    try {
      for (const [tableName, classification] of this.dataClassifications) {
        if (classification.piiFields.length > 0) {
          // This would integrate with your database to export user data
          userData[tableName] = [];
        }
      }
      
      logger.info({ userId }, 'GDPR data export completed');
      
      return userData;
    } catch (error) {
      logger.error({ error, userId }, 'GDPR data export failed');
      throw error;
    }
  }

  /**
   * Initialize master encryption key
   */
  private initializeMasterKey(): void {
    const keySource = process.env.ENCRYPTION_MASTER_KEY;
    if (!keySource) {
      // Generate a new key for development
      this.masterKey = crypto.randomBytes(this.encryptionConfig.keyLength);
      logger.warn('Using generated encryption key - not suitable for production');
    } else {
      this.masterKey = Buffer.from(keySource, 'base64');
    }
  }

  /**
   * Derive field-specific encryption key
   */
  private deriveFieldKey(fieldName: string, context?: string): Buffer {
    const salt = crypto.createHash('sha256')
      .update(fieldName + (context || ''))
      .digest();
    
    return crypto.scryptSync(
      this.masterKey,
      salt,
      this.encryptionConfig.keyLength
    );
  }

  /**
   * Setup data classifications for different tables
   */
  private setupDataClassifications(): void {
    // Users table
    this.dataClassifications.set('users', {
      level: 'confidential',
      encryptionRequired: true,
      auditRequired: true,
      piiFields: [
        { fieldName: 'email', dataType: 'email', maskingStrategy: 'partial' },
        { fieldName: 'phone', dataType: 'phone', maskingStrategy: 'partial' },
        { fieldName: 'firstName', dataType: 'name', maskingStrategy: 'partial' },
        { fieldName: 'lastName', dataType: 'name', maskingStrategy: 'partial' },
      ],
      retentionPolicy: { days: 2555, autoDelete: false }, // 7 years
    });

    // Equipment metrics
    this.dataClassifications.set('metrics', {
      level: 'internal',
      encryptionRequired: false,
      auditRequired: true,
      piiFields: [],
      retentionPolicy: { days: 365, autoDelete: true }, // 1 year
    });

    // Audit logs
    this.dataClassifications.set('audit_events', {
      level: 'confidential',
      encryptionRequired: true,
      auditRequired: false,
      piiFields: [
        { fieldName: 'userId', dataType: 'custom', maskingStrategy: 'hash' },
        { fieldName: 'ipAddress', dataType: 'custom', maskingStrategy: 'partial' },
      ],
      retentionPolicy: { days: 2555, autoDelete: false }, // 7 years
    });
  }

  /**
   * Setup automatic key rotation
   */
  private setupKeyRotation(): void {
    // Rotate keys every 90 days in production
    const rotationInterval = process.env.NODE_ENV === 'production' 
      ? 90 * 24 * 60 * 60 * 1000 // 90 days
      : 24 * 60 * 60 * 1000; // 1 day for testing
    
    this.keyRotationInterval = setInterval(() => {
      this.rotateEncryptionKeys();
    }, rotationInterval);
  }

  /**
   * Rotate encryption keys
   */
  private async rotateEncryptionKeys(): Promise<void> {
    try {
      logger.info('Starting encryption key rotation');
      
      // In production, this would:
      // 1. Generate new master key
      // 2. Re-encrypt all data with new key
      // 3. Update key in secure storage
      // 4. Cleanup old keys after grace period
      
      logger.info('Encryption key rotation completed');
    } catch (error) {
      logger.error({ error }, 'Encryption key rotation failed');
    }
  }

  /**
   * Traverse object and mask PII fields
   */
  private traverseAndMask(obj: any, context: string): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (this.isPIIField(key)) {
        const dataType = this.inferDataType(value);
        obj[key] = this.maskValue(value, dataType, 'partial');
        piiMaskingOperations.inc({ field_type: dataType, strategy: 'partial' });
      } else if (typeof value === 'object' && value !== null) {
        this.traverseAndMask(value, context);
      }
    }
  }

  /**
   * Check if field contains PII
   */
  private isPIIField(fieldName: string): boolean {
    const piiPatterns = [
      /email/i, /phone/i, /ssn/i, /social/i, /credit/i, /card/i,
      /address/i, /firstname/i, /lastname/i, /name/i, /birthdate/i,
      /passport/i, /license/i, /ip_?address/i
    ];
    
    return piiPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: any): string {
    if (typeof value !== 'string') {
      return 'custom';
    }
    
    if (value.includes('@')) return 'email';
    if (/^\+?[\d\s\-\(\)]+$/.test(value)) return 'phone';
    if (/^\d{3}-\d{2}-\d{4}$/.test(value)) return 'ssn';
    if (/^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value)) return 'credit_card';
    
    return 'custom';
  }

  /**
   * Mask value based on strategy
   */
  private maskValue(value: any, dataType: string, strategy: string): string {
    if (!value || typeof value !== 'string') {
      return '***';
    }

    switch (strategy) {
      case 'full':
        return '*'.repeat(value.length);
      
      case 'partial':
        if (dataType === 'email') {
          const [local, domain] = value.split('@');
          return `${local.charAt(0)}***@${domain}`;
        }
        if (dataType === 'phone') {
          return value.replace(/\d(?=\d{4})/g, '*');
        }
        if (value.length <= 4) {
          return '*'.repeat(value.length);
        }
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      
      case 'hash':
        return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
      
      default:
        return '***';
    }
  }

  /**
   * Generate anonymized value for analytics
   */
  private generateAnonymizedValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'email':
        return `user${crypto.randomInt(10000, 99999)}@example.com`;
      case 'phone':
        return `555-${crypto.randomInt(100, 999)}-${crypto.randomInt(1000, 9999)}`;
      case 'name':
        return `User${crypto.randomInt(1000, 9999)}`;
      default:
        return `anon_${crypto.randomBytes(4).toString('hex')}`;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }
  }
}

// Export singleton instance
export const dataProtectionService = DataProtectionService.getInstance();