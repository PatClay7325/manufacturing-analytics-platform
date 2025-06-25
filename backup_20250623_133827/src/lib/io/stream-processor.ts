/**
 * Stream-based File Processor
 * Production-ready streaming with backpressure handling
 */

import { Transform, Readable, Writable, pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

const pipelineAsync = promisify(pipeline);

interface StreamOptions {
  highWaterMark?: number;
  encoding?: BufferEncoding;
  objectMode?: boolean;
}

interface ProcessingMetrics {
  bytesProcessed: number;
  chunksProcessed: number;
  processingTime: number;
  throughput: number;
  peakMemory: number;
}

export class StreamProcessor {
  private static instance: StreamProcessor;
  private activeStreams: Map<string, AbortController> = new Map();
  private metrics: Map<string, ProcessingMetrics> = new Map();
  
  static getInstance(): StreamProcessor {
    if (!StreamProcessor.instance) {
      StreamProcessor.instance = new StreamProcessor();
    }
    return StreamProcessor.instance;
  }

  /**
   * Process file with streaming
   */
  async processFile(
    inputPath: string,
    outputPath: string,
    transforms: Transform[],
    options?: {
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<ProcessingMetrics> {
    const startTime = performance.now();
    const streamId = crypto.randomBytes(16).toString('hex');
    const abortController = new AbortController();
    
    // Track active stream
    this.activeStreams.set(streamId, abortController);
    
    const metrics: ProcessingMetrics = {
      bytesProcessed: 0,
      chunksProcessed: 0,
      processingTime: 0,
      throughput: 0,
      peakMemory: 0,
    };

    try {
      // Create read stream with backpressure handling
      const readStream = createReadStream(inputPath, {
        highWaterMark: 64 * 1024, // 64KB chunks
        signal: options?.signal || abortController.signal,
      });

      // Create write stream
      const writeStream = createWriteStream(outputPath, {
        highWaterMark: 64 * 1024,
      });

      // Add progress tracking
      const progressTransform = new Transform({
        transform(chunk, encoding, callback) {
          metrics.bytesProcessed += chunk.length;
          metrics.chunksProcessed++;
          
          // Track memory usage
          const memUsage = process.memoryUsage();
          metrics.peakMemory = Math.max(metrics.peakMemory, memUsage.heapUsed);
          
          // Report progress
          if (options?.onProgress) {
            options.onProgress(metrics.bytesProcessed);
          }
          
          callback(null, chunk);
        },
      });

      // Build pipeline with all transforms
      const allTransforms = [
        readStream,
        progressTransform,
        ...transforms,
        writeStream,
      ];

      // Execute pipeline
      await pipelineAsync(...allTransforms);

      // Calculate final metrics
      metrics.processingTime = performance.now() - startTime;
      metrics.throughput = metrics.bytesProcessed / (metrics.processingTime / 1000);
      
      // Store metrics
      this.metrics.set(streamId, metrics);
      
      return metrics;
    } finally {
      // Cleanup
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Create transform stream for CSV processing
   */
  createCSVTransform(
    onRow: (row: string[], index: number) => string[] | null,
    options?: {
      delimiter?: string;
      hasHeaders?: boolean;
    }
  ): Transform {
    let buffer = '';
    let rowIndex = 0;
    let headers: string[] | null = null;
    const delimiter = options?.delimiter || ',';

    return new Transform({
      transform(chunk, encoding, callback) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          const row = parseCSVLine(line, delimiter);
          
          // Handle headers
          if (options?.hasHeaders && rowIndex === 0) {
            headers = row;
            rowIndex++;
            continue;
          }

          // Process row
          const processedRow = onRow(row, rowIndex);
          if (processedRow) {
            this.push(processedRow.join(delimiter) + '\n');
          }
          
          rowIndex++;
        }
        
        callback();
      },
      
      flush(callback) {
        // Process any remaining data
        if (buffer.trim()) {
          const row = parseCSVLine(buffer, delimiter);
          const processedRow = onRow(row, rowIndex);
          if (processedRow) {
            this.push(processedRow.join(delimiter) + '\n');
          }
        }
        callback();
      },
    });
  }

  /**
   * Create transform stream for JSON processing
   */
  createJSONTransform(
    onObject: (obj: any, index: number) => any | null
  ): Transform {
    let buffer = '';
    let depth = 0;
    let inString = false;
    let escape = false;
    let objectStart = -1;
    let objectIndex = 0;

    return new Transform({
      objectMode: true,
      
      transform(chunk, encoding, callback) {
        buffer += chunk.toString();
        
        // Parse JSON objects from stream
        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          
          // Handle string escaping
          if (inString) {
            if (escape) {
              escape = false;
            } else if (char === '\\') {
              escape = true;
            } else if (char === '"') {
              inString = false;
            }
            continue;
          }
          
          // Track depth
          if (char === '"') {
            inString = true;
          } else if (char === '{') {
            if (depth === 0) {
              objectStart = i;
            }
            depth++;
          } else if (char === '}') {
            depth--;
            
            if (depth === 0 && objectStart !== -1) {
              // Extract complete object
              const jsonStr = buffer.substring(objectStart, i + 1);
              
              try {
                const obj = JSON.parse(jsonStr);
                const processed = onObject(obj, objectIndex);
                
                if (processed) {
                  this.push(JSON.stringify(processed) + '\n');
                }
                
                objectIndex++;
              } catch (error) {
                // Invalid JSON, skip
              }
              
              // Remove processed data from buffer
              buffer = buffer.substring(i + 1);
              i = -1; // Reset position
              objectStart = -1;
            }
          }
        }
        
        // Prevent buffer from growing too large
        if (buffer.length > 1024 * 1024) { // 1MB limit
          callback(new Error('JSON object too large'));
          return;
        }
        
        callback();
      },
      
      flush(callback) {
        if (buffer.trim() && objectStart !== -1) {
          callback(new Error('Incomplete JSON object in stream'));
        } else {
          callback();
        }
      },
    });
  }

  /**
   * Create compression transform
   */
  createCompressionTransform(algorithm: 'gzip' | 'deflate' | 'brotli' = 'gzip'): Transform {
    const zlib = require('zlib');
    
    switch (algorithm) {
      case 'gzip':
        return zlib.createGzip({ level: 6 });
      case 'deflate':
        return zlib.createDeflate({ level: 6 });
      case 'brotli':
        return zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
          },
        });
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
  }

  /**
   * Create decompression transform
   */
  createDecompressionTransform(algorithm: 'gzip' | 'deflate' | 'brotli' = 'gzip'): Transform {
    const zlib = require('zlib');
    
    switch (algorithm) {
      case 'gzip':
        return zlib.createGunzip();
      case 'deflate':
        return zlib.createInflate();
      case 'brotli':
        return zlib.createBrotliDecompress();
      default:
        throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
    }
  }

  /**
   * Create encryption transform
   */
  createEncryptionTransform(algorithm: string, key: Buffer, iv: Buffer): Transform {
    return crypto.createCipheriv(algorithm, key, iv);
  }

  /**
   * Create decryption transform
   */
  createDecryptionTransform(algorithm: string, key: Buffer, iv: Buffer): Transform {
    return crypto.createDecipheriv(algorithm, key, iv);
  }

  /**
   * Create hash transform
   */
  createHashTransform(algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'): {
    transform: Transform;
    getHash: () => string;
  } {
    const hash = crypto.createHash(algorithm);
    
    const transform = new Transform({
      transform(chunk, encoding, callback) {
        hash.update(chunk);
        callback(null, chunk); // Pass through
      },
    });

    return {
      transform,
      getHash: () => hash.digest('hex'),
    };
  }

  /**
   * Create rate limiting transform
   */
  createRateLimitTransform(bytesPerSecond: number): Transform {
    let lastTime = Date.now();
    let bytesProcessed = 0;

    return new Transform({
      async transform(chunk, encoding, callback) {
        const now = Date.now();
        const elapsed = now - lastTime;
        
        if (elapsed < 1000) {
          bytesProcessed += chunk.length;
          
          if (bytesProcessed > bytesPerSecond) {
            // Calculate delay needed
            const delay = (bytesProcessed / bytesPerSecond * 1000) - elapsed;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          // Reset counter
          lastTime = now;
          bytesProcessed = chunk.length;
        }
        
        callback(null, chunk);
      },
    });
  }

  /**
   * Create backpressure-aware transform
   */
  createBackpressureTransform(
    onBackpressure?: (pressure: number) => void
  ): Transform {
    return new Transform({
      transform(chunk, encoding, callback) {
        const pressure = this.writableLength / this.writableHighWaterMark;
        
        if (onBackpressure && pressure > 0.8) {
          onBackpressure(pressure);
        }
        
        // Implement adaptive processing based on pressure
        if (pressure > 0.9) {
          // Slow down processing
          setTimeout(() => callback(null, chunk), 10);
        } else {
          callback(null, chunk);
        }
      },
    });
  }

  /**
   * Abort active stream
   */
  abortStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      return true;
    }
    return false;
  }

  /**
   * Get stream metrics
   */
  getMetrics(streamId: string): ProcessingMetrics | undefined {
    return this.metrics.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Cleanup old metrics
   */
  cleanupMetrics(olderThan: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - olderThan;
    
    for (const [id, metrics] of this.metrics.entries()) {
      if (metrics.processingTime < cutoff) {
        this.metrics.delete(id);
      }
    }
  }
}

/**
 * Parse CSV line handling quotes and escapes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let escape = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escape) {
      current += char;
      escape = false;
    } else if (char === '\\') {
      escape = true;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Export singleton instance
export const streamProcessor = StreamProcessor.getInstance();