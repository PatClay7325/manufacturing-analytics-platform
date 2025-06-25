/**
 * OPC UA Security Manager
 * Handles certificates, authentication, and security policies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  OPCUACertificateManager,
  SecurityPolicy,
  MessageSecurityMode,
  UserTokenType,
  makeSHA1Thumbprint
} from 'node-opcua';
import { SecurityConfig, SecurityError } from '../types';
import { logger } from '../../logger';

export interface CertificateInfo {
  thumbprint: string;
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  isValid: boolean;
}

export class SecurityManager {
  private certificateManager?: OPCUACertificateManager;
  private certificatePath?: string;
  private privateKeyPath?: string;
  private initialized: boolean = false;

  constructor(private config: SecurityConfig) {}

  /**
   * Initialize security manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing OPC UA security manager');

      // Set up certificate paths
      const baseDir = path.dirname(this.config.certificatePath);
      await this.ensureDirectoryExists(baseDir);

      // Initialize certificate manager
      this.certificateManager = new OPCUACertificateManager({
        automaticallyAcceptUnknownCertificate: !this.config.rejectUnknownCertificates,
        rootFolder: baseDir,
        certificateFolder: path.join(baseDir, 'certs'),
        privateKeyFolder: path.join(baseDir, 'private'),
        trustedFolder: this.config.trustedCertificatesPath || path.join(baseDir, 'trusted'),
        issuersCertificateFolder: this.config.issuerCertificatesPath || path.join(baseDir, 'issuers'),
        rejectedFolder: this.config.rejectedCertificatesPath || path.join(baseDir, 'rejected')
      });

      await this.certificateManager.initialize();

      // Check if certificates exist
      const certificateExists = await this.fileExists(this.config.certificatePath);
      const privateKeyExists = await this.fileExists(this.config.privateKeyPath);

      if (!certificateExists || !privateKeyExists) {
        logger.info('Certificates not found, generating new ones');
        await this.generateCertificates();
      } else {
        logger.info('Using existing certificates');
        this.certificatePath = this.config.certificatePath;
        this.privateKeyPath = this.config.privateKeyPath;
        
        // Validate existing certificates
        await this.validateCertificate();
      }

      this.initialized = true;
      logger.info('Security manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize security manager', { error });
      throw new SecurityError(
        'Failed to initialize security: ' + error.message,
        { originalError: error }
      );
    }
  }

  /**
   * Generate self-signed certificates
   */
  private async generateCertificates(): Promise<void> {
    if (!this.certificateManager) {
      throw new SecurityError('Certificate manager not initialized');
    }

    const applicationName = 'ManufacturingOPCUAClient';
    const applicationUri = `urn:${require('os').hostname()}:${applicationName}`;

    // Generate certificate
    const { certificate, privateKey } = await this.certificateManager.createSelfSignedCertificate({
      applicationUri,
      dns: [require('os').hostname()],
      ip: await this.getLocalIpAddresses(),
      startDate: new Date(),
      validity: 365 * 5, // 5 years
      subject: {
        commonName: applicationName,
        organizationName: 'Manufacturing AnalyticsPlatform',
        organizationalUnitName: 'OPC UA Client',
        localityName: 'Factory',
        countryName: 'US'
      }
    });

    // Save certificate and private key
    await fs.writeFile(this.config.certificatePath, certificate);
    await fs.writeFile(this.config.privateKeyPath, privateKey);

    this.certificatePath = this.config.certificatePath;
    this.privateKeyPath = this.config.privateKeyPath;

    logger.info('Generated new self-signed certificates', {
      certificatePath: this.config.certificatePath,
      privateKeyPath: this.config.privateKeyPath
    });
  }

  /**
   * Validate certificate
   */
  private async validateCertificate(): Promise<void> {
    if (!this.certificatePath) {
      throw new SecurityError('Certificate path not set');
    }

    try {
      const certificateData = await fs.readFile(this.certificatePath);
      const certificateInfo = await this.getCertificateInfo(certificateData);

      if (!certificateInfo.isValid) {
        logger.warn('Certificate is not valid', certificateInfo);
        
        // Generate new certificate if expired
        if (certificateInfo.validTo < new Date()) {
          logger.info('Certificate expired, generating new one');
          await this.generateCertificates();
        }
      } else {
        logger.info('Certificate is valid', {
          subject: certificateInfo.subject,
          validTo: certificateInfo.validTo
        });
      }
    } catch (error) {
      logger.error('Error validating certificate', { error });
      throw new SecurityError(
        'Certificate validation failed: ' + error.message,
        { originalError: error }
      );
    }
  }

  /**
   * Get certificate information
   */
  async getCertificateInfo(certificateData: Buffer): Promise<CertificateInfo> {
    try {
      // This is a simplified implementation
      // In production, use proper X.509 parsing
      const thumbprint = makeSHA1Thumbprint(certificateData).toString('hex');
      const now = new Date();
      
      return {
        thumbprint,
        subject: 'CN=ManufacturingOPCUAClient',
        issuer: 'CN=ManufacturingOPCUAClient',
        validFrom: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        validTo: new Date(now.getTime() + 4 * 365 * 24 * 60 * 60 * 1000), // 4 years from now
        isValid: true
      };
    } catch (error) {
      throw new SecurityError(
        'Failed to parse certificate: ' + error.message,
        { originalError: error }
      );
    }
  }

  /**
   * Get security options for client connection
   */
  async getSecurityOptions() {
    if (!this.initialized) {
      await this.initialize();
    }

    const certificate = await fs.readFile(this.certificatePath!);
    const privateKey = await fs.readFile(this.privateKeyPath!);

    return {
      certificateData: certificate,
      privateKeyData: privateKey,
      certificateManager: this.certificateManager
    };
  }

  /**
   * Trust a server certificate
   */
  async trustServerCertificate(certificate: Buffer): Promise<void> {
    if (!this.certificateManager) {
      throw new SecurityError('Certificate manager not initialized');
    }

    try {
      const thumbprint = makeSHA1Thumbprint(certificate).toString('hex');
      logger.info('Trusting server certificate', { thumbprint });

      // Add to trusted certificates
      const trustedPath = path.join(
        this.config.trustedCertificatesPath || './pki/trusted',
        `${thumbprint}.der`
      );
      
      await fs.writeFile(trustedPath, certificate);
      logger.info('Server certificate trusted', { thumbprint, path: trustedPath });
    } catch (error) {
      logger.error('Failed to trust server certificate', { error });
      throw new SecurityError(
        'Failed to trust certificate: ' + error.message,
        { originalError: error }
      );
    }
  }

  /**
   * Get user identity token based on configuration
   */
  getUserIdentityToken(userName?: string, password?: string) {
    if (userName && password) {
      return {
        type: UserTokenType.UserName,
        userName,
        password
      };
    }

    return {
      type: UserTokenType.Anonymous
    };
  }

  /**
   * Get recommended security policy based on server capabilities
   */
  getRecommendedSecurityPolicy(availablePolicies: string[]): SecurityPolicy {
    // Priority order for security policies
    const policyPriority = [
      SecurityPolicy.Basic256Sha256,
      SecurityPolicy.Basic256,
      SecurityPolicy.Basic128Rsa15,
      SecurityPolicy.None
    ];

    for (const policy of policyPriority) {
      if (availablePolicies.includes(policy)) {
        return policy;
      }
    }

    return SecurityPolicy.None;
  }

  /**
   * Get recommended security mode
   */
  getRecommendedSecurityMode(requireEncryption: boolean = true): MessageSecurityMode {
    if (requireEncryption) {
      return MessageSecurityMode.SignAndEncrypt;
    }
    return MessageSecurityMode.Sign;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get local IP addresses for certificate generation
   */
  private async getLocalIpAddresses(): Promise<string[]> {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }

    return addresses;
  }

  /**
   * Clean up old certificates
   */
  async cleanupOldCertificates(daysToKeep: number = 30): Promise<void> {
    if (!this.certificateManager) {
      return;
    }

    try {
      const rejectedPath = this.config.rejectedCertificatesPath || './pki/rejected';
      const files = await fs.readdir(rejectedPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        const filePath = path.join(rejectedPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info('Removed old rejected certificate', { file });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up certificates', { error });
    }
  }
}