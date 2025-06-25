/**
 * Binary-Level File Analyzer
 * Production-ready binary analysis for advanced threat detection
 */

import { createReadStream } from 'fs';
import { Transform } from 'stream';
import crypto from 'crypto';

interface BinaryAnalysisResult {
  safe: boolean;
  threats: ThreatIndicator[];
  entropy: number;
  suspiciousPatterns: SuspiciousPattern[];
  embeddedFiles: EmbeddedFile[];
  metadata: BinaryMetadata;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

interface ThreatIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  offset: number;
  pattern: string;
  description: string;
}

interface SuspiciousPattern {
  pattern: string;
  count: number;
  locations: number[];
  risk: string;
}

interface EmbeddedFile {
  offset: number;
  size: number;
  type: string;
  signature: string;
}

interface BinaryMetadata {
  size: number;
  hash: string;
  fileType: string;
  architecture?: string;
  compiler?: string;
  packedStatus: boolean;
  obfuscated: boolean;
}

export class BinaryAnalyzer {
  private static instance: BinaryAnalyzer;
  private suspiciousStrings: Map<string, string> = new Map();
  private shellcodePatterns: RegExp[] = [];
  private packerSignatures: Map<string, Buffer> = new Map();

  constructor() {
    this.initializeThreatPatterns();
  }

  static getInstance(): BinaryAnalyzer {
    if (!BinaryAnalyzer.instance) {
      BinaryAnalyzer.instance = new BinaryAnalyzer();
    }
    return BinaryAnalyzer.instance;
  }

  /**
   * Initialize threat detection patterns
   */
  private initializeThreatPatterns(): void {
    // Suspicious strings
    this.suspiciousStrings.set('cmd.exe', 'Command execution');
    this.suspiciousStrings.set('powershell', 'PowerShell execution');
    this.suspiciousStrings.set('/bin/sh', 'Shell execution');
    this.suspiciousStrings.set('WScript.Shell', 'Script execution');
    this.suspiciousStrings.set('eval(', 'Code evaluation');
    this.suspiciousStrings.set('exec(', 'Code execution');
    this.suspiciousStrings.set('system(', 'System call');
    this.suspiciousStrings.set('CreateProcess', 'Process creation');
    this.suspiciousStrings.set('ShellExecute', 'Shell execution');
    this.suspiciousStrings.set('WinExec', 'Windows execution');
    this.suspiciousStrings.set('KERNEL32.DLL', 'Windows system call');
    this.suspiciousStrings.set('ntdll.dll', 'Low-level Windows API');
    this.suspiciousStrings.set('VirtualAlloc', 'Memory allocation');
    this.suspiciousStrings.set('WriteProcessMemory', 'Process injection');
    this.suspiciousStrings.set('CreateRemoteThread', 'Remote thread creation');
    this.suspiciousStrings.set('LoadLibrary', 'DLL loading');
    this.suspiciousStrings.set('GetProcAddress', 'Dynamic API resolution');
    
    // Network indicators
    this.suspiciousStrings.set('WSAStartup', 'Network initialization');
    this.suspiciousStrings.set('socket', 'Network socket');
    this.suspiciousStrings.set('connect', 'Network connection');
    this.suspiciousStrings.set('http://', 'HTTP URL');
    this.suspiciousStrings.set('https://', 'HTTPS URL');
    this.suspiciousStrings.set('ftp://', 'FTP URL');
    this.suspiciousStrings.set('tor2web', 'Tor network');
    
    // Crypto indicators
    this.suspiciousStrings.set('CryptEncrypt', 'Encryption');
    this.suspiciousStrings.set('AES', 'AES encryption');
    this.suspiciousStrings.set('RSA', 'RSA encryption');
    this.suspiciousStrings.set('.encrypted', 'Ransomware indicator');
    this.suspiciousStrings.set('bitcoin:', 'Cryptocurrency');
    
    // Shellcode patterns (x86/x64)
    this.shellcodePatterns = [
      /\x31\xc0\x50\x68.{4}\x68.{4}\x50/, // Common shellcode pattern
      /\x55\x8b\xec\x83\xec/, // Function prologue
      /\x6a\x00\x6a\x00\x6a\x00\x6a\x00/, // Push null bytes
      /\xe8[\x00-\xff]{4}\x5d/, // Call $+5, pop
      /\xeb[\x00-\xff]\x5e/, // Jmp/call/pop
      /\x90{10,}/, // NOP sled
    ];
    
    // Packer signatures
    this.packerSignatures.set('UPX', Buffer.from('UPX!'));
    this.packerSignatures.set('PECompact', Buffer.from('PEC2'));
    this.packerSignatures.set('ASPack', Buffer.from('ASPack'));
    this.packerSignatures.set('Themida', Buffer.from([0x8B, 0xC0, 0x60, 0x0F, 0x31]));
  }

  /**
   * Analyze binary file
   */
  async analyzeBinary(filePath: string): Promise<BinaryAnalysisResult> {
    const threats: ThreatIndicator[] = [];
    const suspiciousPatterns: SuspiciousPattern[] = [];
    const embeddedFiles: EmbeddedFile[] = [];
    
    // Calculate file hash
    const hash = await this.calculateFileHash(filePath);
    
    // Analyze file structure
    const structure = await this.analyzeFileStructure(filePath);
    
    // Calculate entropy
    const entropy = await this.calculateEntropy(filePath);
    
    // Check for suspicious strings
    const stringThreats = await this.scanForSuspiciousStrings(filePath);
    threats.push(...stringThreats);
    
    // Check for shellcode patterns
    const shellcodeThreats = await this.scanForShellcode(filePath);
    threats.push(...shellcodeThreats);
    
    // Check for packers
    const packerInfo = await this.detectPackers(filePath);
    if (packerInfo.packed) {
      threats.push({
        type: 'packer',
        severity: 'medium',
        offset: packerInfo.offset || 0,
        pattern: packerInfo.packer || 'unknown',
        description: `File is packed with ${packerInfo.packer}`,
      });
    }
    
    // Check for embedded files
    const embedded = await this.scanForEmbeddedFiles(filePath);
    embeddedFiles.push(...embedded);
    
    // Analyze code patterns
    const codePatterns = await this.analyzeCodePatterns(filePath);
    suspiciousPatterns.push(...codePatterns);
    
    // Determine risk level
    const risk = this.calculateRiskLevel(threats, entropy, structure);
    
    // Build metadata
    const metadata: BinaryMetadata = {
      size: structure.size,
      hash,
      fileType: structure.type,
      architecture: structure.architecture,
      compiler: structure.compiler,
      packedStatus: packerInfo.packed,
      obfuscated: entropy > 7.5, // High entropy indicates obfuscation
    };
    
    return {
      safe: threats.filter(t => t.severity !== 'low').length === 0,
      threats,
      entropy,
      suspiciousPatterns,
      embeddedFiles,
      metadata,
      risk,
    };
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);
      
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Analyze file structure
   */
  private async analyzeFileStructure(filePath: string): Promise<{
    size: number;
    type: string;
    architecture?: string;
    compiler?: string;
  }> {
    const { size } = await require('fs').promises.stat(filePath);
    const header = await this.readFileHeader(filePath, 1024);
    
    let type = 'unknown';
    let architecture: string | undefined;
    let compiler: string | undefined;
    
    // PE file detection (Windows executables)
    if (header.slice(0, 2).toString() === 'MZ') {
      type = 'PE';
      const peOffset = header.readUInt32LE(0x3C);
      
      if (peOffset < header.length - 4) {
        const peSignature = header.slice(peOffset, peOffset + 4);
        if (peSignature.toString() === 'PE\0\0') {
          const machine = header.readUInt16LE(peOffset + 4);
          architecture = machine === 0x14c ? 'x86' : machine === 0x8664 ? 'x64' : 'unknown';
          
          // Detect compiler
          if (header.includes('GCC')) compiler = 'GCC';
          else if (header.includes('Microsoft')) compiler = 'MSVC';
          else if (header.includes('Borland')) compiler = 'Borland';
        }
      }
    }
    
    // ELF file detection (Linux executables)
    else if (header.slice(0, 4).toString('hex') === '7f454c46') {
      type = 'ELF';
      architecture = header[4] === 1 ? 'x86' : 'x64';
    }
    
    // Mach-O detection (macOS executables)
    else if (header.readUInt32BE(0) === 0xfeedface || header.readUInt32BE(0) === 0xfeedfacf) {
      type = 'Mach-O';
      architecture = header.readUInt32BE(0) === 0xfeedface ? 'x86' : 'x64';
    }
    
    return { size, type, architecture, compiler };
  }

  /**
   * Calculate entropy (randomness measure)
   */
  private async calculateEntropy(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const frequencies = new Array(256).fill(0);
      let totalBytes = 0;
      
      const stream = createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer) => {
        for (const byte of chunk) {
          frequencies[byte]++;
          totalBytes++;
        }
      });
      
      stream.on('end', () => {
        let entropy = 0;
        
        for (const freq of frequencies) {
          if (freq > 0) {
            const probability = freq / totalBytes;
            entropy -= probability * Math.log2(probability);
          }
        }
        
        resolve(entropy);
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * Scan for suspicious strings
   */
  private async scanForSuspiciousStrings(filePath: string): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];
    const foundStrings = new Set<string>();
    
    return new Promise((resolve, reject) => {
      let offset = 0;
      const stream = createReadStream(filePath);
      let buffer = Buffer.alloc(0);
      
      stream.on('data', (chunk: Buffer) => {
        // Combine with previous buffer for string continuity
        buffer = Buffer.concat([buffer, chunk]);
        
        // Keep only last 1KB for overlap
        if (buffer.length > 4096) {
          const searchBuffer = buffer.slice(0, -1024);
          offset += searchBuffer.length;
          buffer = buffer.slice(-1024);
          
          // Search for suspicious strings
          for (const [pattern, description] of this.suspiciousStrings) {
            const index = searchBuffer.indexOf(pattern);
            if (index !== -1 && !foundStrings.has(pattern)) {
              foundStrings.add(pattern);
              threats.push({
                type: 'suspicious_string',
                severity: this.getStringSeverity(pattern),
                offset: offset + index,
                pattern,
                description,
              });
            }
          }
        }
      });
      
      stream.on('end', () => resolve(threats));
      stream.on('error', reject);
    });
  }

  /**
   * Scan for shellcode patterns
   */
  private async scanForShellcode(filePath: string): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];
    
    return new Promise((resolve, reject) => {
      let offset = 0;
      const stream = createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer) => {
        const hex = chunk.toString('hex');
        
        for (const pattern of this.shellcodePatterns) {
          const match = hex.match(pattern);
          if (match) {
            threats.push({
              type: 'shellcode',
              severity: 'high',
              offset: offset + (match.index || 0) / 2,
              pattern: match[0],
              description: 'Potential shellcode detected',
            });
          }
        }
        
        offset += chunk.length;
      });
      
      stream.on('end', () => resolve(threats));
      stream.on('error', reject);
    });
  }

  /**
   * Detect packers
   */
  private async detectPackers(filePath: string): Promise<{
    packed: boolean;
    packer?: string;
    offset?: number;
  }> {
    const header = await this.readFileHeader(filePath, 4096);
    
    for (const [name, signature] of this.packerSignatures) {
      const index = header.indexOf(signature);
      if (index !== -1) {
        return { packed: true, packer: name, offset: index };
      }
    }
    
    // Check for generic packing indicators
    const entropy = await this.calculateEntropy(filePath);
    if (entropy > 7.5) {
      return { packed: true, packer: 'unknown (high entropy)' };
    }
    
    return { packed: false };
  }

  /**
   * Scan for embedded files
   */
  private async scanForEmbeddedFiles(filePath: string): Promise<EmbeddedFile[]> {
    const embedded: EmbeddedFile[] = [];
    const signatures = [
      { sig: Buffer.from('PK\x03\x04'), type: 'ZIP' },
      { sig: Buffer.from('%PDF'), type: 'PDF' },
      { sig: Buffer.from('\xFF\xD8\xFF'), type: 'JPEG' },
      { sig: Buffer.from('\x89PNG'), type: 'PNG' },
      { sig: Buffer.from('MZ'), type: 'PE' },
    ];
    
    return new Promise((resolve, reject) => {
      let offset = 0;
      const stream = createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer) => {
        for (const { sig, type } of signatures) {
          let index = 0;
          while ((index = chunk.indexOf(sig, index)) !== -1) {
            embedded.push({
              offset: offset + index,
              size: 0, // Would need to parse format to determine
              type,
              signature: sig.toString('hex'),
            });
            index += sig.length;
          }
        }
        offset += chunk.length;
      });
      
      stream.on('end', () => resolve(embedded));
      stream.on('error', reject);
    });
  }

  /**
   * Analyze code patterns
   */
  private async analyzeCodePatterns(filePath: string): Promise<SuspiciousPattern[]> {
    const patterns: Map<string, { count: number; locations: number[] }> = new Map();
    
    // Patterns to look for
    const searchPatterns = [
      { pattern: /\x00{100,}/, risk: 'Null padding (possible malware cavity)' },
      { pattern: /\xFF{100,}/, risk: 'FF padding (possible malware cavity)' },
      { pattern: /[\x00-\x08\x0E-\x1F\x7F-\xFF]{50,}/, risk: 'Non-printable data block' },
      { pattern: /[A-Za-z0-9+/]{100,}={0,2}/, risk: 'Base64 encoded data' },
      { pattern: /[0-9a-fA-F]{64,}/, risk: 'Hex encoded data' },
    ];
    
    return new Promise((resolve, reject) => {
      let offset = 0;
      const stream = createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer) => {
        const str = chunk.toString('binary');
        
        for (const { pattern, risk } of searchPatterns) {
          let match;
          const regex = new RegExp(pattern, 'g');
          
          while ((match = regex.exec(str)) !== null) {
            const key = risk;
            if (!patterns.has(key)) {
              patterns.set(key, { count: 0, locations: [] });
            }
            
            const entry = patterns.get(key)!;
            entry.count++;
            if (entry.locations.length < 10) { // Limit locations stored
              entry.locations.push(offset + match.index);
            }
          }
        }
        
        offset += chunk.length;
      });
      
      stream.on('end', () => {
        const results: SuspiciousPattern[] = [];
        
        for (const [risk, data] of patterns) {
          results.push({
            pattern: risk.split(' ')[0],
            count: data.count,
            locations: data.locations,
            risk,
          });
        }
        
        resolve(results);
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * Get string severity
   */
  private getStringSeverity(str: string): ThreatIndicator['severity'] {
    // Critical patterns
    if (['CreateRemoteThread', 'WriteProcessMemory', 'VirtualAlloc'].includes(str)) {
      return 'critical';
    }
    
    // High severity
    if (['cmd.exe', 'powershell', '/bin/sh', 'eval(', 'exec('].includes(str)) {
      return 'high';
    }
    
    // Medium severity
    if (str.includes('http://') || str.includes('https://') || str.includes('socket')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(
    threats: ThreatIndicator[],
    entropy: number,
    structure: any
  ): BinaryAnalysisResult['risk'] {
    let score = 0;
    
    // Threat scoring
    for (const threat of threats) {
      switch (threat.severity) {
        case 'critical': score += 10; break;
        case 'high': score += 5; break;
        case 'medium': score += 2; break;
        case 'low': score += 1; break;
      }
    }
    
    // Entropy scoring
    if (entropy > 7.8) score += 5;
    else if (entropy > 7.5) score += 3;
    else if (entropy > 7.0) score += 1;
    
    // Structure scoring
    if (structure.type === 'unknown') score += 2;
    if (!structure.architecture) score += 1;
    
    // Determine risk level
    if (score >= 20) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  /**
   * Read file header
   */
  private async readFileHeader(filePath: string, bytes: number): Promise<Buffer> {
    const { promises: fs } = require('fs');
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(bytes);
    await fd.read(buffer, 0, bytes, 0);
    await fd.close();
    return buffer;
  }
}

// Export singleton instance
export const binaryAnalyzer = BinaryAnalyzer.getInstance();