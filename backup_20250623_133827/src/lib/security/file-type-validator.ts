/**
 * File Type Validator with Magic Number Detection
 * Production-ready file type verification beyond MIME
 */

import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

interface FileTypeResult {
  valid: boolean;
  detectedType?: string;
  mimeType?: string;
  extension?: string;
  magicNumber?: string;
  confidence: number;
  warnings?: string[];
}

interface MagicNumberSignature {
  offset: number;
  bytes: Buffer;
  mask?: Buffer;
  mimeType: string;
  extension: string;
  description: string;
}

export class FileTypeValidator {
  private static instance: FileTypeValidator;
  private signatures: MagicNumberSignature[] = [];
  private allowedTypes: Set<string> = new Set();
  private blockedTypes: Set<string> = new Set();

  constructor() {
    this.initializeSignatures();
    this.initializeAllowedTypes();
    this.initializeBlockedTypes();
  }

  static getInstance(): FileTypeValidator {
    if (!FileTypeValidator.instance) {
      FileTypeValidator.instance = new FileTypeValidator();
    }
    return FileTypeValidator.instance;
  }

  /**
   * Initialize magic number signatures
   */
  private initializeSignatures(): void {
    // Common file signatures
    this.signatures = [
      // Images
      {
        offset: 0,
        bytes: Buffer.from([0xFF, 0xD8, 0xFF]),
        mimeType: 'image/jpeg',
        extension: 'jpg',
        description: 'JPEG image',
      },
      {
        offset: 0,
        bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        mimeType: 'image/png',
        extension: 'png',
        description: 'PNG image',
      },
      {
        offset: 0,
        bytes: Buffer.from('GIF87a'),
        mimeType: 'image/gif',
        extension: 'gif',
        description: 'GIF87a image',
      },
      {
        offset: 0,
        bytes: Buffer.from('GIF89a'),
        mimeType: 'image/gif',
        extension: 'gif',
        description: 'GIF89a image',
      },
      {
        offset: 0,
        bytes: Buffer.from('BM'),
        mimeType: 'image/bmp',
        extension: 'bmp',
        description: 'BMP image',
      },
      {
        offset: 0,
        bytes: Buffer.from([0x00, 0x00, 0x01, 0x00]),
        mimeType: 'image/x-icon',
        extension: 'ico',
        description: 'ICO icon',
      },
      
      // Documents
      {
        offset: 0,
        bytes: Buffer.from('%PDF'),
        mimeType: 'application/pdf',
        extension: 'pdf',
        description: 'PDF document',
      },
      {
        offset: 0,
        bytes: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
        mimeType: 'application/vnd.ms-excel',
        extension: 'xls',
        description: 'Microsoft Office document',
      },
      {
        offset: 0,
        bytes: Buffer.from('PK\x03\x04'),
        mimeType: 'application/zip',
        extension: 'zip',
        description: 'ZIP archive or Office document',
      },
      
      // Text/Code
      {
        offset: 0,
        bytes: Buffer.from('<?xml'),
        mimeType: 'application/xml',
        extension: 'xml',
        description: 'XML document',
      },
      {
        offset: 0,
        bytes: Buffer.from('#!'),
        mimeType: 'text/plain',
        extension: 'sh',
        description: 'Shell script',
      },
      
      // Data formats
      {
        offset: 0,
        bytes: Buffer.from('\x1F\x8B'),
        mimeType: 'application/gzip',
        extension: 'gz',
        description: 'GZIP compressed',
      },
      {
        offset: 0,
        bytes: Buffer.from('7z\xBC\xAF\x27\x1C'),
        mimeType: 'application/x-7z-compressed',
        extension: '7z',
        description: '7-Zip archive',
      },
      {
        offset: 0,
        bytes: Buffer.from('Rar!\x1A\x07'),
        mimeType: 'application/x-rar-compressed',
        extension: 'rar',
        description: 'RAR archive',
      },
      
      // Executables (dangerous)
      {
        offset: 0,
        bytes: Buffer.from('MZ'),
        mimeType: 'application/x-msdownload',
        extension: 'exe',
        description: 'Windows executable',
      },
      {
        offset: 0,
        bytes: Buffer.from('\x7FELF'),
        mimeType: 'application/x-executable',
        extension: 'elf',
        description: 'ELF executable',
      },
      {
        offset: 0,
        bytes: Buffer.from('\xCA\xFE\xBA\xBE'),
        mimeType: 'application/java-vm',
        extension: 'class',
        description: 'Java class file',
      },
      
      // Manufacturing/CAD formats
      {
        offset: 0,
        bytes: Buffer.from('ISO-10303-21;'),
        mimeType: 'application/step',
        extension: 'step',
        description: 'STEP CAD file',
      },
      {
        offset: 0,
        bytes: Buffer.from('solid'),
        mimeType: 'application/sla',
        extension: 'stl',
        description: 'STL 3D model (ASCII)',
      },
    ];
  }

  /**
   * Initialize allowed file types
   */
  private initializeAllowedTypes(): void {
    // Manufacturing data formats
    this.allowedTypes.add('text/csv');
    this.allowedTypes.add('application/json');
    this.allowedTypes.add('application/xml');
    this.allowedTypes.add('text/plain');
    
    // Images for reports
    this.allowedTypes.add('image/jpeg');
    this.allowedTypes.add('image/png');
    this.allowedTypes.add('image/gif');
    this.allowedTypes.add('image/bmp');
    
    // Documents
    this.allowedTypes.add('application/pdf');
    this.allowedTypes.add('application/vnd.ms-excel');
    this.allowedTypes.add('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // CAD/3D formats
    this.allowedTypes.add('application/step');
    this.allowedTypes.add('application/sla');
    this.allowedTypes.add('model/stl');
    
    // Compressed formats (for data transfer)
    this.allowedTypes.add('application/gzip');
    this.allowedTypes.add('application/zip');
  }

  /**
   * Initialize blocked file types
   */
  private initializeBlockedTypes(): void {
    // Executables
    this.blockedTypes.add('application/x-msdownload');
    this.blockedTypes.add('application/x-executable');
    this.blockedTypes.add('application/x-sh');
    this.blockedTypes.add('application/x-bat');
    
    // Scripts
    this.blockedTypes.add('application/javascript');
    this.blockedTypes.add('application/x-python');
    this.blockedTypes.add('application/x-perl');
    this.blockedTypes.add('application/x-ruby');
    
    // System files
    this.blockedTypes.add('application/x-msdownload');
    this.blockedTypes.add('application/x-msdos-program');
    this.blockedTypes.add('application/x-dosexec');
  }

  /**
   * Validate file type by reading magic numbers
   */
  async validateFile(
    filePath: string,
    claimedMimeType?: string,
    claimedExtension?: string
  ): Promise<FileTypeResult> {
    try {
      // Read file header (first 512 bytes should be enough)
      const header = await this.readFileHeader(filePath, 512);
      
      // Detect type from magic numbers
      const detected = this.detectFileType(header);
      
      // Validate against claims
      const validation = this.validateAgainstClaims(
        detected,
        claimedMimeType,
        claimedExtension
      );
      
      return validation;
    } catch (error) {
      return {
        valid: false,
        confidence: 0,
        warnings: [`File validation error: ${error}`],
      };
    }
  }

  /**
   * Read file header
   */
  private async readFileHeader(filePath: string, bytes: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      
      const stream = createReadStream(filePath, {
        start: 0,
        end: bytes - 1,
      });
      
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
      });
      
      stream.on('end', () => {
        resolve(Buffer.concat(chunks, totalBytes));
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * Detect file type from magic numbers
   */
  private detectFileType(header: Buffer): {
    type?: string;
    mime?: string;
    extension?: string;
    confidence: number;
  } {
    // Check each signature
    for (const sig of this.signatures) {
      if (this.matchesSignature(header, sig)) {
        return {
          type: sig.description,
          mime: sig.mimeType,
          extension: sig.extension,
          confidence: 0.9,
        };
      }
    }
    
    // Fallback: check if it's text
    if (this.isLikelyText(header)) {
      const textType = this.detectTextType(header);
      return {
        type: textType.type,
        mime: textType.mime,
        extension: textType.extension,
        confidence: 0.7,
      };
    }
    
    // Unknown binary
    return {
      type: 'unknown',
      mime: 'application/octet-stream',
      confidence: 0.3,
    };
  }

  /**
   * Check if buffer matches signature
   */
  private matchesSignature(buffer: Buffer, signature: MagicNumberSignature): boolean {
    if (buffer.length < signature.offset + signature.bytes.length) {
      return false;
    }
    
    for (let i = 0; i < signature.bytes.length; i++) {
      const bufferByte = buffer[signature.offset + i];
      const sigByte = signature.bytes[i];
      
      if (signature.mask) {
        const mask = signature.mask[i];
        if ((bufferByte & mask) !== (sigByte & mask)) {
          return false;
        }
      } else {
        if (bufferByte !== sigByte) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if buffer is likely text
   */
  private isLikelyText(buffer: Buffer): boolean {
    let textChars = 0;
    let totalChars = Math.min(buffer.length, 512);
    
    for (let i = 0; i < totalChars; i++) {
      const byte = buffer[i];
      
      // Printable ASCII, tab, newline, carriage return
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        textChars++;
      }
      
      // Null byte indicates binary
      if (byte === 0) {
        return false;
      }
    }
    
    // If >80% printable characters, likely text
    return textChars / totalChars > 0.8;
  }

  /**
   * Detect specific text type
   */
  private detectTextType(buffer: Buffer): {
    type: string;
    mime: string;
    extension: string;
  } {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    
    // CSV detection
    if (this.looksLikeCSV(text)) {
      return {
        type: 'CSV data',
        mime: 'text/csv',
        extension: 'csv',
      };
    }
    
    // JSON detection
    if (this.looksLikeJSON(text)) {
      return {
        type: 'JSON data',
        mime: 'application/json',
        extension: 'json',
      };
    }
    
    // XML detection
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
      return {
        type: 'XML data',
        mime: 'application/xml',
        extension: 'xml',
      };
    }
    
    // Default text
    return {
      type: 'Plain text',
      mime: 'text/plain',
      extension: 'txt',
    };
  }

  /**
   * Check if text looks like CSV
   */
  private looksLikeCSV(text: string): boolean {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return false;
    
    // Count delimiters in first few lines
    const delimiters = [',', '\t', ';', '|'];
    const delimiterCounts: Record<string, number[]> = {};
    
    for (const delimiter of delimiters) {
      delimiterCounts[delimiter] = lines
        .slice(0, 5)
        .map(line => (line.match(new RegExp(delimiter, 'g')) || []).length);
    }
    
    // Check for consistent delimiter count
    for (const [delimiter, counts] of Object.entries(delimiterCounts)) {
      if (counts.length > 1 && counts[0] > 0) {
        const consistent = counts.every(count => count === counts[0]);
        if (consistent) return true;
      }
    }
    
    return false;
  }

  /**
   * Check if text looks like JSON
   */
  private looksLikeJSON(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    
    // Check for JSON-like start
    if (!['{', '['].includes(trimmed[0])) return false;
    
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      // Might be partial JSON, check structure
      const openBraces = (trimmed.match(/[{[]/g) || []).length;
      const closeBraces = (trimmed.match(/[}\]]/g) || []).length;
      const quotes = (trimmed.match(/"/g) || []).length;
      
      return openBraces > 0 && quotes > 0 && quotes % 2 === 0;
    }
  }

  /**
   * Validate detected type against claims
   */
  private validateAgainstClaims(
    detected: { type?: string; mime?: string; extension?: string; confidence: number },
    claimedMimeType?: string,
    claimedExtension?: string
  ): FileTypeResult {
    const warnings: string[] = [];
    let confidence = detected.confidence;
    
    // Check if detected type is allowed
    const isAllowed = detected.mime ? this.allowedTypes.has(detected.mime) : false;
    const isBlocked = detected.mime ? this.blockedTypes.has(detected.mime) : false;
    
    if (isBlocked) {
      return {
        valid: false,
        detectedType: detected.type,
        mimeType: detected.mime,
        extension: detected.extension,
        confidence,
        warnings: ['File type is blocked for security reasons'],
      };
    }
    
    // Validate against claimed MIME type
    if (claimedMimeType && detected.mime && claimedMimeType !== detected.mime) {
      warnings.push(`Claimed MIME type (${claimedMimeType}) doesn't match detected type (${detected.mime})`);
      confidence *= 0.8;
    }
    
    // Validate against claimed extension
    if (claimedExtension && detected.extension) {
      const normalizedClaimed = claimedExtension.toLowerCase().replace('.', '');
      if (normalizedClaimed !== detected.extension) {
        warnings.push(`Claimed extension (.${claimedExtension}) doesn't match detected type (.${detected.extension})`);
        confidence *= 0.9;
      }
    }
    
    // Check for polyglot files (files valid as multiple types)
    if (detected.mime === 'application/zip') {
      warnings.push('ZIP files can contain various content types');
      
      // Special handling for Office documents (which are ZIP files)
      if (claimedExtension && ['xlsx', 'docx', 'pptx'].includes(claimedExtension.toLowerCase())) {
        return {
          valid: true,
          detectedType: 'Microsoft Office document',
          mimeType: 'application/vnd.openxmlformats',
          extension: claimedExtension,
          confidence: 0.8,
          warnings,
        };
      }
    }
    
    return {
      valid: isAllowed && !isBlocked,
      detectedType: detected.type,
      mimeType: detected.mime,
      extension: detected.extension,
      magicNumber: detected.mime ? this.getMagicNumberForType(detected.mime) : undefined,
      confidence,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get magic number hex string for type
   */
  private getMagicNumberForType(mimeType: string): string | undefined {
    const sig = this.signatures.find(s => s.mimeType === mimeType);
    if (sig) {
      return sig.bytes.toString('hex').toUpperCase();
    }
    return undefined;
  }

  /**
   * Add custom file type signature
   */
  addCustomSignature(signature: MagicNumberSignature): void {
    this.signatures.push(signature);
  }

  /**
   * Add allowed MIME type
   */
  addAllowedType(mimeType: string): void {
    this.allowedTypes.add(mimeType);
  }

  /**
   * Add blocked MIME type
   */
  addBlockedType(mimeType: string): void {
    this.blockedTypes.add(mimeType);
  }

  /**
   * Get configuration
   */
  getConfiguration(): {
    allowedTypes: string[];
    blockedTypes: string[];
    signatureCount: number;
  } {
    return {
      allowedTypes: Array.from(this.allowedTypes),
      blockedTypes: Array.from(this.blockedTypes),
      signatureCount: this.signatures.length,
    };
  }
}

// Export singleton instance
export const fileTypeValidator = FileTypeValidator.getInstance();