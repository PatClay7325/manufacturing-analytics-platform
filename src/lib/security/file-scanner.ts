/**
 * File Scanner Service
 * Virus/malware scanning for uploaded files
 */

import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform, Readable, Writable } from 'stream';
import * as path from 'path';

interface ScanResult {
  clean: boolean;
  threats: string[];
  metadata: {
    size: number;
    hash: string;
    mimeType?: string;
    scanDuration: number;
  };
}

interface FileSignature {
  pattern: Buffer;
  offset: number;
  mimeType: string;
  description: string;
}

export class FileScanner {
  private static instance: FileScanner;
  private maliciousPatterns: RegExp[];
  private fileSignatures: FileSignature[];
  private maxFileSize: number;

  constructor() {
    this.maxFileSize = 500 * 1024 * 1024; // 500MB max
    
    // Common malicious patterns (simplified for demo)
    this.maliciousPatterns = [
      /(<script[^>]*>.*?<\/script>)/gi,
      /(<iframe[^>]*>.*?<\/iframe>)/gi,
      /(eval\s*\()/gi,
      /(\bexec\s*\()/gi,
      /(\bsystem\s*\()/gi,
      /(__import__\s*\()/gi,
      /(\bpowershell\b)/gi,
      /(\bcmd\.exe\b)/gi,
      /(\bwscript\b)/gi,
      /(\bcscript\b)/gi,
    ];

    // File signatures for validation
    this.fileSignatures = [
      {
        pattern: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP/XLSX
        offset: 0,
        mimeType: 'application/zip',
        description: 'ZIP archive',
      },
      {
        pattern: Buffer.from('\uFEFF'), // UTF-8 BOM
        offset: 0,
        mimeType: 'text/plain',
        description: 'UTF-8 text',
      },
      {
        pattern: Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
        offset: 0,
        mimeType: 'image/jpeg',
        description: 'JPEG image',
      },
      {
        pattern: Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG
        offset: 0,
        mimeType: 'image/png',
        description: 'PNG image',
      },
    ];
  }

  static getInstance(): FileScanner {
    if (!FileScanner.instance) {
      FileScanner.instance = new FileScanner();
    }
    return FileScanner.instance;
  }

  /**
   * Scan a file stream for threats
   */
  async scanStream(
    inputStream: Readable,
    outputStream: Writable
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const threats: string[] = [];
    let totalSize = 0;
    const hash = createHash('sha256');
    let fileHeader: Buffer | null = null;

    // Create scanning transform stream
    const scanTransform = new Transform({
      async transform(chunk: Buffer, encoding, callback) {
        try {
          // Capture file header for signature validation
          if (!fileHeader && chunk.length >= 16) {
            fileHeader = chunk.slice(0, 16);
          }

          // Update hash
          hash.update(chunk);
          totalSize += chunk.length;

          // Check file size
          if (totalSize > this.maxFileSize) {
            callback(new Error('File size exceeds maximum allowed'));
            return;
          }

          // Scan chunk for patterns
          const chunkStr = chunk.toString('utf8');
          for (const pattern of this.maliciousPatterns) {
            if (pattern.test(chunkStr)) {
              threats.push(`Malicious pattern detected: ${pattern.source}`);
            }
          }

          // Pass through
          callback(null, chunk);
        } catch (error) {
          callback(error as Error);
        }
      },
    });

    try {
      // Pipe through scanner
      await pipeline(inputStream, scanTransform, outputStream);

      // Validate file signature
      const mimeType = this.detectMimeType(fileHeader);

      return {
        clean: threats.length === 0,
        threats,
        metadata: {
          size: totalSize,
          hash: hash.digest('hex'),
          mimeType,
          scanDuration: Date.now() - startTime,
        },
      };
    } catch (error) {
      threats.push(`Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        clean: false,
        threats,
        metadata: {
          size: totalSize,
          hash: hash.digest('hex'),
          scanDuration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Scan a file path
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const readStream = createReadStream(filePath);
    const nullStream = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });

    return this.scanStream(readStream, nullStream);
  }

  /**
   * Check if content contains suspicious patterns
   */
  scanContent(content: string): ScanResult {
    const startTime = Date.now();
    const threats: string[] = [];

    // Check for malicious patterns
    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(content)) {
        threats.push(`Suspicious pattern: ${pattern.source}`);
      }
    }

    // Check for encoded malicious content
    const encodedPatterns = [
      /eval\s*\(\s*atob\s*\(/gi,
      /eval\s*\(\s*Base64\.decode/gi,
      /document\.write\s*\(\s*unescape/gi,
    ];

    for (const pattern of encodedPatterns) {
      if (pattern.test(content)) {
        threats.push(`Encoded malicious pattern: ${pattern.source}`);
      }
    }

    // Check for suspicious file references
    const suspiciousFiles = [
      /\.exe["'\s]/gi,
      /\.bat["'\s]/gi,
      /\.cmd["'\s]/gi,
      /\.scr["'\s]/gi,
      /\.vbs["'\s]/gi,
      /\.ps1["'\s]/gi,
    ];

    for (const pattern of suspiciousFiles) {
      if (pattern.test(content)) {
        threats.push(`Suspicious file reference: ${pattern.source}`);
      }
    }

    return {
      clean: threats.length === 0,
      threats,
      metadata: {
        size: content.length,
        hash: createHash('sha256').update(content).digest('hex'),
        scanDuration: Date.now() - startTime,
      },
    };
  }

  /**
   * Validate file extension
   */
  validateExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Detect MIME type from file header
   */
  private detectMimeType(header: Buffer | null): string | undefined {
    if (!header) return undefined;

    for (const sig of this.fileSignatures) {
      if (header.slice(sig.offset, sig.offset + sig.pattern.length).equals(sig.pattern)) {
        return sig.mimeType;
      }
    }

    // Check for text files
    const textHeader = header.toString('utf8');
    if (/^[\x20-\x7E\r\n\t]+$/.test(textHeader)) {
      return 'text/plain';
    }

    return undefined;
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let safe = filename.replace(/[\.\.\//\\]/g, '');
    
    // Remove special characters
    safe = safe.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Ensure it has an extension
    if (!path.extname(safe)) {
      safe += '.dat';
    }
    
    // Limit length
    const ext = path.extname(safe);
    const name = path.basename(safe, ext);
    if (name.length > 100) {
      safe = name.substring(0, 100) + ext;
    }
    
    return safe;
  }

  /**
   * Check for zip bomb patterns
   */
  async checkZipBomb(filePath: string): Promise<boolean> {
    // Simple check based on compression ratio
    // In production, use proper zip library to check nested levels
    const stats = await import('fs').then(fs => fs.promises.stat(filePath));
    
    // This is a placeholder - implement actual zip bomb detection
    return false;
  }
}

// Export singleton instance
export const fileScanner = FileScanner.getInstance();