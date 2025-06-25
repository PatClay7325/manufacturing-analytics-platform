/**
 * Production Crypto Manager - Proper implementation with all security best practices
 */

import crypto from 'crypto';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const pbkdf2 = promisify(crypto.pbkdf2);
const randomBytes = promisify(crypto.randomBytes);

export interface EncryptedData {
  algorithm: string;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  keyDerivation: {
    iterations: number;
    keyLength: number;
    digest: string;
  };
}

export class CryptoManager {
  private algorithm = 'aes-256-gcm';
  private saltLength = 64; // 512 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits
  private keyLength = 32; // 256 bits
  private iterations = 100000;
  private digest = 'sha512';

  /**
   * Encrypt data with AES-256-GCM
   */
  async encrypt(plaintext: string, password: string): Promise<EncryptedData> {
    try {
      // Generate random salt and IV
      const [salt, iv] = await Promise.all([
        randomBytes(this.saltLength),
        randomBytes(this.ivLength)
      ]);

      // Derive key from password
      const key = await pbkdf2(password, salt, this.iterations, this.keyLength, this.digest);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      return {
        algorithm: this.algorithm,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        ciphertext: encrypted.toString('base64'),
        keyDerivation: {
          iterations: this.iterations,
          keyLength: this.keyLength,
          digest: this.digest
        }
      };

    } catch (error) {
      logger.error({ error: error.message }, 'Encryption failed');
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Convert from base64
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

      // Derive key from password
      const key = await pbkdf2(
        password, 
        salt, 
        encryptedData.keyDerivation.iterations,
        encryptedData.keyDerivation.keyLength,
        encryptedData.keyDerivation.digest
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error({ error: error.message }, 'Decryption failed');
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Generate cryptographically secure random key
   */
  async generateKey(length: number = 32): Promise<string> {
    const key = await randomBytes(length);
    return key.toString('base64');
  }

  /**
   * Hash data with SHA-512
   */
  hash(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Compare hash with timing-safe comparison
   */
  compareHash(data: string, hash: string): boolean {
    const dataHash = this.hash(data);
    return crypto.timingSafeEqual(
      Buffer.from(dataHash),
      Buffer.from(hash)
    );
  }

  /**
   * Generate HMAC
   */
  generateHMAC(data: string, key: string): string {
    return crypto.createHmac('sha512', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC with timing-safe comparison
   */
  verifyHMAC(data: string, key: string, hmac: string): boolean {
    const expectedHMAC = this.generateHMAC(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(expectedHMAC),
      Buffer.from(hmac)
    );
  }
}

// Export singleton instance
export const cryptoManager = new CryptoManager();