/**
 * ClamAV Virus Scanner Integration
 * Production-ready malware scanning with sandboxing
 */

import { spawn } from 'child_process';
import { createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import net from 'net';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ScanResult {
  clean: boolean;
  infected: boolean;
  viruses: string[];
  error?: string;
  scanTime: number;
  fileSize: number;
  quarantinePath?: string;
}

interface ClamAVConfig {
  host: string;
  port: number;
  timeout: number;
  quarantineDir: string;
  maxFileSize: number;
  chunkSize: number;
}

export class ClamAVScanner {
  private static instance: ClamAVScanner;
  private config: ClamAVConfig;
  private isConnected: boolean = false;

  constructor() {
    this.config = {
      host: process.env.CLAMAV_HOST || 'localhost',
      port: parseInt(process.env.CLAMAV_PORT || '3310'),
      timeout: parseInt(process.env.CLAMAV_TIMEOUT || '300000'), // 5 minutes
      quarantineDir: process.env.QUARANTINE_DIR || '/var/quarantine',
      maxFileSize: parseInt(process.env.MAX_SCAN_SIZE || '524288000'), // 500MB
      chunkSize: 65536, // 64KB chunks
    };

    // Ensure quarantine directory exists
    this.ensureQuarantineDir();
  }

  static getInstance(): ClamAVScanner {
    if (!ClamAVScanner.instance) {
      ClamAVScanner.instance = new ClamAVScanner();
    }
    return ClamAVScanner.instance;
  }

  /**
   * Scan a file using ClamAV daemon
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const stats = await fs.stat(filePath);

    // Check file size limit
    if (stats.size > this.config.maxFileSize) {
      return {
        clean: false,
        infected: false,
        viruses: [],
        error: `File size ${stats.size} exceeds maximum ${this.config.maxFileSize}`,
        scanTime: Date.now() - startTime,
        fileSize: stats.size,
      };
    }

    try {
      // Try network scan first (faster)
      const result = await this.scanViaNetwork(filePath, stats.size);
      result.scanTime = Date.now() - startTime;
      result.fileSize = stats.size;

      // Quarantine infected files
      if (result.infected) {
        result.quarantinePath = await this.quarantineFile(filePath);
      }

      return result;
    } catch (networkError) {
      console.warn('Network scan failed, falling back to command line:', networkError);
      
      // Fallback to command line
      try {
        const result = await this.scanViaCommandLine(filePath);
        result.scanTime = Date.now() - startTime;
        result.fileSize = stats.size;

        if (result.infected) {
          result.quarantinePath = await this.quarantineFile(filePath);
        }

        return result;
      } catch (cmdError) {
        return {
          clean: false,
          infected: false,
          viruses: [],
          error: cmdError instanceof Error ? cmdError.message : 'Scan failed',
          scanTime: Date.now() - startTime,
          fileSize: stats.size,
        };
      }
    }
  }

  /**
   * Scan via ClamAV network protocol (clamd)
   */
  private async scanViaNetwork(filePath: string, fileSize: number): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';

      socket.setTimeout(this.config.timeout);

      socket.on('connect', async () => {
        try {
          // Send INSTREAM command
          socket.write('zINSTREAM\0');

          // Stream file in chunks
          const stream = createReadStream(filePath, { 
            highWaterMark: this.config.chunkSize 
          });

          for await (const chunk of stream) {
            // Send chunk size in network byte order
            const size = Buffer.allocUnsafe(4);
            size.writeUInt32BE(chunk.length, 0);
            socket.write(size);
            socket.write(chunk);
          }

          // Send zero-length chunk to end stream
          const end = Buffer.allocUnsafe(4);
          end.writeUInt32BE(0, 0);
          socket.write(end);
        } catch (error) {
          socket.destroy();
          reject(error);
        }
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        const trimmed = response.trim();
        
        if (trimmed === 'stream: OK') {
          resolve({
            clean: true,
            infected: false,
            viruses: [],
            scanTime: 0,
            fileSize: fileSize,
          });
        } else if (trimmed.startsWith('stream:') && trimmed.includes('FOUND')) {
          // Extract virus name
          const match = trimmed.match(/stream: (.+) FOUND/);
          const virus = match ? match[1] : 'Unknown';
          
          resolve({
            clean: false,
            infected: true,
            viruses: [virus],
            scanTime: 0,
            fileSize: fileSize,
          });
        } else {
          reject(new Error(`Unexpected response: ${trimmed}`));
        }
      });

      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Scan timeout'));
      });

      socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * Fallback scan via command line
   */
  private async scanViaCommandLine(filePath: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const clamscan = spawn('clamscan', [
        '--no-summary',
        '--stdout',
        '--infected',
        filePath
      ]);

      let stdout = '';
      let stderr = '';

      clamscan.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      clamscan.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      clamscan.on('error', (error) => {
        reject(new Error(`Failed to start clamscan: ${error.message}`));
      });

      clamscan.on('close', (code) => {
        if (code === 0) {
          // Clean
          resolve({
            clean: true,
            infected: false,
            viruses: [],
            scanTime: 0,
            fileSize: 0,
          });
        } else if (code === 1) {
          // Infected
          const viruses: string[] = [];
          const lines = stdout.split('\n');
          
          for (const line of lines) {
            if (line.includes('FOUND')) {
              const match = line.match(/: (.+) FOUND/);
              if (match) {
                viruses.push(match[1]);
              }
            }
          }

          resolve({
            clean: false,
            infected: true,
            viruses,
            scanTime: 0,
            fileSize: 0,
          });
        } else {
          // Error
          reject(new Error(`Scan failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Quarantine infected file
   */
  private async quarantineFile(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const quarantineId = uuidv4();
    const quarantinePath = path.join(
      this.config.quarantineDir,
      `${quarantineId}_${fileName}`
    );

    // Move file to quarantine
    await fs.rename(filePath, quarantinePath);

    // Set restrictive permissions
    await fs.chmod(quarantinePath, 0o600);

    // Log quarantine action
    await fs.writeFile(
      `${quarantinePath}.info`,
      JSON.stringify({
        originalPath: filePath,
        quarantineDate: new Date().toISOString(),
        quarantineId,
      }, null, 2)
    );

    return quarantinePath;
  }

  /**
   * Test ClamAV connection
   */
  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        socket.write('zPING\0');
      });

      socket.on('data', (data) => {
        const response = data.toString().trim();
        socket.end();
        resolve(response === 'PONG');
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * Update virus definitions
   */
  async updateDefinitions(): Promise<void> {
    return new Promise((resolve, reject) => {
      const freshclam = spawn('freshclam');

      freshclam.on('error', (error) => {
        reject(new Error(`Failed to update definitions: ${error.message}`));
      });

      freshclam.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Definition update failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Ensure quarantine directory exists
   */
  private async ensureQuarantineDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.quarantineDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      console.error('Failed to create quarantine directory:', error);
    }
  }

  /**
   * Get scanner statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    version?: string;
    definitions?: {
      version: number;
      date: string;
    };
  }> {
    const connected = await this.testConnection();
    
    if (!connected) {
      return { connected: false };
    }

    // Get version info via VERSIONCOMMANDS
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let response = '';

      socket.setTimeout(5000);

      socket.on('connect', () => {
        socket.write('zVERSION\0');
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        const parts = response.trim().split('/');
        resolve({
          connected: true,
          version: parts[0],
          definitions: parts[1] ? {
            version: parseInt(parts[1]),
            date: parts[2] || 'unknown',
          } : undefined,
        });
      });

      socket.on('error', () => {
        resolve({ connected: true });
      });

      socket.connect(this.config.port, this.config.host);
    });
  }
}

// Export singleton instance
export const clamAVScanner = ClamAVScanner.getInstance();