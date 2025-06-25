/**
 * Path Validator with Chroot Protection
 * Production-ready path validation to prevent directory traversal
 */

import path from 'path';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';

interface PathValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
  realPath?: string;
}

export class PathValidator {
  private static instance: PathValidator;
  private uploadRoot: string;
  private tempRoot: string;
  private quarantineRoot: string;
  private allowedRoots: Set<string>;

  constructor() {
    // Define allowed root directories
    this.uploadRoot = process.env.UPLOAD_ROOT || '/var/uploads';
    this.tempRoot = process.env.TEMP_ROOT || '/var/tmp/uploads';
    this.quarantineRoot = process.env.QUARANTINE_ROOT || '/var/quarantine';
    
    this.allowedRoots = new Set([
      this.uploadRoot,
      this.tempRoot,
      this.quarantineRoot,
    ]);

    // Ensure directories exist
    this.initializeDirectories();
  }

  static getInstance(): PathValidator {
    if (!PathValidator.instance) {
      PathValidator.instance = new PathValidator();
    }
    return PathValidator.instance;
  }

  /**
   * Validate and sanitize a file path
   */
  async validatePath(
    inputPath: string,
    rootDir: string = this.uploadRoot
  ): Promise<PathValidationResult> {
    try {
      // Check if root directory is allowed
      if (!this.allowedRoots.has(rootDir)) {
        return {
          valid: false,
          error: 'Invalid root directory',
        };
      }

      // Remove null bytes
      if (inputPath.includes('\0')) {
        return {
          valid: false,
          error: 'Null byte detected in path',
        };
      }

      // Normalize and resolve the path
      const normalizedPath = path.normalize(inputPath);
      const resolvedPath = path.resolve(rootDir, normalizedPath);

      // Check if resolved path is within allowed root
      const relativePath = path.relative(rootDir, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return {
          valid: false,
          error: 'Path traversal attempt detected',
        };
      }

      // Additional security checks
      const securityChecks = this.performSecurityChecks(resolvedPath);
      if (!securityChecks.valid) {
        return securityChecks;
      }

      // Get real path (follows symlinks)
      try {
        const realPath = await fs.realpath(resolvedPath);
        
        // Verify real path is still within bounds
        if (!realPath.startsWith(rootDir)) {
          return {
            valid: false,
            error: 'Symlink escape detected',
          };
        }

        return {
          valid: true,
          sanitized: resolvedPath,
          realPath: realPath,
        };
      } catch (error) {
        // Path doesn't exist yet, which is fine for new files
        return {
          valid: true,
          sanitized: resolvedPath,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Path validation failed',
      };
    }
  }

  /**
   * Validate filename
   */
  validateFilename(filename: string): PathValidationResult {
    // Check for null bytes
    if (filename.includes('\0')) {
      return {
        valid: false,
        error: 'Null byte in filename',
      };
    }

    // Check length
    if (filename.length > 255) {
      return {
        valid: false,
        error: 'Filename too long',
      };
    }

    // Check for directory separators
    if (filename.includes('/') || filename.includes('\\')) {
      return {
        valid: false,
        error: 'Directory separators not allowed in filename',
      };
    }

    // Check for special characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) {
      return {
        valid: false,
        error: 'Invalid characters in filename',
      };
    }

    // Check for reserved names (Windows)
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    ];
    
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      return {
        valid: false,
        error: 'Reserved filename',
      };
    }

    // Normalize Unicode
    const normalized = filename.normalize('NFKC');

    return {
      valid: true,
      sanitized: normalized,
    };
  }

  /**
   * Generate safe filename from user input
   */
  generateSafeFilename(
    originalFilename: string,
    tenantId?: string
  ): string {
    // Extract extension
    const ext = path.extname(originalFilename).toLowerCase();
    const name = path.basename(originalFilename, ext);

    // Sanitize name
    const safeName = name
      .normalize('NFKC')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100); // Limit length

    // Generate unique identifier
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const hash = createHash('sha256')
      .update(`${originalFilename}${timestamp}${random}`)
      .digest('hex')
      .substring(0, 8);

    // Build final filename
    const parts = [
      tenantId || 'default',
      timestamp,
      hash,
      safeName || 'file',
    ];

    return `${parts.join('_')}${ext}`;
  }

  /**
   * Create directory structure for file
   */
  async createFileDirectory(filePath: string): Promise<void> {
    const validation = await this.validatePath(filePath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const dir = path.dirname(validation.sanitized!);
    await fs.mkdir(dir, { recursive: true, mode: 0o750 });
  }

  /**
   * Perform additional security checks
   */
  private performSecurityChecks(filePath: string): PathValidationResult {
    // Check for double extensions
    const parts = path.basename(filePath).split('.');
    if (parts.length > 2) {
      const suspiciousExts = ['exe', 'scr', 'bat', 'cmd', 'com', 'pif'];
      for (let i = 1; i < parts.length - 1; i++) {
        if (suspiciousExts.includes(parts[i].toLowerCase())) {
          return {
            valid: false,
            error: 'Suspicious double extension detected',
          };
        }
      }
    }

    // Check for Unicode tricks
    if (this.containsUnicodeTricks(filePath)) {
      return {
        valid: false,
        error: 'Unicode manipulation detected',
      };
    }

    // Check for NTFS alternate data streams
    if (filePath.includes(':') && process.platform === 'win32') {
      return {
        valid: false,
        error: 'NTFS alternate data stream detected',
      };
    }

    return { valid: true };
  }

  /**
   * Check for Unicode tricks (RTL override, homoglyphs, etc.)
   */
  private containsUnicodeTricks(str: string): boolean {
    // Right-to-left override characters
    const rtlChars = [
      '\u202A', // LEFT-TO-RIGHT EMBEDDING
      '\u202B', // RIGHT-TO-LEFT EMBEDDING
      '\u202C', // POP DIRECTIONAL FORMATTING
      '\u202D', // LEFT-TO-RIGHT OVERRIDE
      '\u202E', // RIGHT-TO-LEFT OVERRIDE
      '\u2066', // LEFT-TO-RIGHT ISOLATE
      '\u2067', // RIGHT-TO-LEFT ISOLATE
      '\u2068', // FIRST STRONG ISOLATE
      '\u2069', // POP DIRECTIONAL ISOLATE
    ];

    for (const char of rtlChars) {
      if (str.includes(char)) {
        return true;
      }
    }

    // Zero-width characters
    const zeroWidthChars = [
      '\u200B', // ZERO WIDTH SPACE
      '\u200C', // ZERO WIDTH NON-JOINER
      '\u200D', // ZERO WIDTH JOINER
      '\uFEFF', // ZERO WIDTH NO-BREAK SPACE
    ];

    for (const char of zeroWidthChars) {
      if (str.includes(char)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Initialize required directories
   */
  private async initializeDirectories(): Promise<void> {
    for (const root of this.allowedRoots) {
      try {
        await fs.mkdir(root, { recursive: true, mode: 0o750 });
      } catch (error) {
        console.error(`Failed to create directory ${root}:`, error);
      }
    }
  }

  /**
   * Get safe upload path for tenant
   */
  async getSafeUploadPath(
    filename: string,
    tenantId: string,
    category: string = 'general'
  ): Promise<string> {
    // Validate inputs
    const filenameValidation = this.validateFilename(filename);
    if (!filenameValidation.valid) {
      throw new Error(filenameValidation.error);
    }

    // Generate safe filename
    const safeFilename = this.generateSafeFilename(filename, tenantId);

    // Build path structure: /uploads/{tenant}/{year}/{month}/{category}/{filename}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const pathParts = [
      this.uploadRoot,
      tenantId,
      year.toString(),
      month,
      category,
      safeFilename,
    ];

    const fullPath = path.join(...pathParts);

    // Validate final path
    const validation = await this.validatePath(fullPath, this.uploadRoot);
    if (!validation.valid) {
      throw new Error('Generated path validation failed');
    }

    // Create directory structure
    await this.createFileDirectory(fullPath);

    return validation.sanitized!;
  }

  /**
   * Move file to quarantine
   */
  async moveToQuarantine(filePath: string, reason: string): Promise<string> {
    const validation = await this.validatePath(filePath);
    if (!validation.valid) {
      throw new Error('Invalid file path');
    }

    const filename = path.basename(filePath);
    const quarantineFilename = this.generateSafeFilename(filename, 'quarantine');
    const quarantinePath = path.join(this.quarantineRoot, quarantineFilename);

    // Move file
    await fs.rename(validation.sanitized!, quarantinePath);

    // Create metadata file
    const metadata = {
      originalPath: filePath,
      quarantineDate: new Date().toISOString(),
      reason: reason,
    };

    await fs.writeFile(
      `${quarantinePath}.json`,
      JSON.stringify(metadata, null, 2)
    );

    return quarantinePath;
  }
}

// Export singleton instance
export const pathValidator = PathValidator.getInstance();