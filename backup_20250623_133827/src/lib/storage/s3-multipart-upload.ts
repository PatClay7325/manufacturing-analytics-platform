/**
 * S3 Multipart Upload Service
 * Production-ready resumable uploads with chunk tracking
 */

import { 
  S3Client, 
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

interface UploadChunk {
  partNumber: number;
  size: number;
  etag?: string;
  checksum: string;
  uploaded: boolean;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

interface MultipartUpload {
  uploadId: string;
  key: string;
  bucket: string;
  originalFilename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  chunks: UploadChunk[];
  status: 'initialized' | 'uploading' | 'completed' | 'failed' | 'aborted';
  createdAt: Date;
  completedAt?: Date;
  metadata: {
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    contentType?: string;
    checksumAlgorithm: string;
    [key: string]: any;
  };
  resumeToken: string;
}

interface UploadProgress {
  uploadId: string;
  totalSize: number;
  uploadedSize: number;
  percentage: number;
  chunksCompleted: number;
  totalChunks: number;
  currentChunk?: number;
  estimatedTimeRemaining?: number;
  transferRate?: number; // bytes per second
}

interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3MultipartUploadService extends EventEmitter {
  private static instance: S3MultipartUploadService;
  private s3Client: S3Client;
  private redis: Redis;
  private config: S3Config;
  private activeUploads: Map<string, MultipartUpload> = new Map();
  private defaultChunkSize = 5 * 1024 * 1024; // 5MB minimum for S3
  private maxChunkSize = 5 * 1024 * 1024 * 1024; // 5GB maximum
  private maxConcurrentUploads = 10;

  constructor() {
    super();
    
    this.config = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      bucket: process.env.S3_BUCKET!,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
    });

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_S3_UPLOAD_DB || '8'),
      keyPrefix: 's3upload:',
    });

    // Periodic cleanup of stale uploads
    setInterval(() => this.cleanupStaleUploads(), 60000); // Every minute
  }

  static getInstance(): S3MultipartUploadService {
    if (!S3MultipartUploadService.instance) {
      S3MultipartUploadService.instance = new S3MultipartUploadService();
    }
    return S3MultipartUploadService.instance;
  }

  /**
   * Initialize multipart upload
   */
  async initializeUpload(
    filePath: string,
    key: string,
    options: {
      chunkSize?: number;
      metadata?: Record<string, any>;
      contentType?: string;
      checksumAlgorithm?: 'SHA256' | 'CRC32';
    } = {}
  ): Promise<string> {
    // Validate file
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Cannot upload empty file');
    }

    // Calculate optimal chunk size
    const chunkSize = this.calculateOptimalChunkSize(
      stats.size,
      options.chunkSize
    );

    const totalChunks = Math.ceil(stats.size / chunkSize);
    
    // Create multipart upload in S3
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: {
        'original-filename': options.metadata?.originalFilename || '',
        'tenant-id': options.metadata?.tenantId || '',
        'user-id': options.metadata?.userId || '',
        'correlation-id': options.metadata?.correlationId || '',
        'total-size': stats.size.toString(),
        'chunk-size': chunkSize.toString(),
        'total-chunks': totalChunks.toString(),
        ...options.metadata,
      },
      ChecksumAlgorithm: options.checksumAlgorithm || 'SHA256',
    });

    const response = await this.s3Client.send(createCommand);
    const uploadId = response.UploadId!;

    // Generate resume token
    const resumeToken = this.generateResumeToken(uploadId, key, stats.size);

    // Initialize chunks
    const chunks: UploadChunk[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, stats.size);
      
      chunks.push({
        partNumber: i + 1,
        size: end - start,
        uploaded: false,
        attempts: 0,
        checksum: '', // Will be calculated during upload
      });
    }

    // Create upload record
    const upload: MultipartUpload = {
      uploadId,
      key,
      bucket: this.config.bucket,
      originalFilename: options.metadata?.originalFilename || key,
      totalSize: stats.size,
      chunkSize,
      totalChunks,
      uploadedChunks: 0,
      chunks,
      status: 'initialized',
      createdAt: new Date(),
      metadata: {
        tenantId: options.metadata?.tenantId,
        userId: options.metadata?.userId,
        correlationId: options.metadata?.correlationId,
        contentType: options.contentType,
        checksumAlgorithm: options.checksumAlgorithm || 'SHA256',
        ...options.metadata,
      },
      resumeToken,
    };

    // Store upload state
    this.activeUploads.set(uploadId, upload);
    await this.persistUploadState(upload);

    this.emit('upload_initialized', {
      uploadId,
      key,
      totalSize: stats.size,
      totalChunks,
      resumeToken,
    });

    return uploadId;
  }

  /**
   * Upload file in chunks
   */
  async uploadFile(
    uploadId: string,
    filePath: string,
    options: {
      concurrency?: number;
      onProgress?: (progress: UploadProgress) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<string> {
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    if (upload.status === 'completed') {
      throw new Error('Upload already completed');
    }

    upload.status = 'uploading';
    await this.persistUploadState(upload);

    const concurrency = Math.min(
      options.concurrency || 3,
      this.maxConcurrentUploads
    );

    const startTime = Date.now();
    let lastProgressUpdate = startTime;
    let lastUploadedBytes = upload.uploadedChunks * upload.chunkSize;

    try {
      // Upload chunks with controlled concurrency
      const pendingChunks = upload.chunks.filter(chunk => !chunk.uploaded);
      
      for (let i = 0; i < pendingChunks.length; i += concurrency) {
        if (options.signal?.aborted) {
          throw new Error('Upload aborted');
        }

        const batch = pendingChunks.slice(i, i + concurrency);
        
        await Promise.all(
          batch.map(chunk => this.uploadChunk(upload, filePath, chunk))
        );

        // Update progress
        if (options.onProgress) {
          const now = Date.now();
          const uploadedBytes = upload.uploadedChunks * upload.chunkSize;
          const timeDiff = now - lastProgressUpdate;
          
          if (timeDiff > 1000) { // Update every second
            const bytesDiff = uploadedBytes - lastUploadedBytes;
            const transferRate = bytesDiff / (timeDiff / 1000);
            const remainingBytes = upload.totalSize - uploadedBytes;
            const estimatedTimeRemaining = remainingBytes / transferRate;

            const progress: UploadProgress = {
              uploadId,
              totalSize: upload.totalSize,
              uploadedSize: uploadedBytes,
              percentage: (uploadedBytes / upload.totalSize) * 100,
              chunksCompleted: upload.uploadedChunks,
              totalChunks: upload.totalChunks,
              transferRate,
              estimatedTimeRemaining,
            };

            options.onProgress(progress);
            lastProgressUpdate = now;
            lastUploadedBytes = uploadedBytes;
          }
        }
      }

      // Complete multipart upload
      const location = await this.completeUpload(uploadId);
      
      this.emit('upload_completed', {
        uploadId,
        key: upload.key,
        location,
        totalSize: upload.totalSize,
        duration: Date.now() - startTime,
      });

      return location;
    } catch (error) {
      upload.status = 'failed';
      await this.persistUploadState(upload);
      
      this.emit('upload_failed', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }

  /**
   * Upload individual chunk
   */
  private async uploadChunk(
    upload: MultipartUpload,
    filePath: string,
    chunk: UploadChunk
  ): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        chunk.attempts = attempt;
        chunk.lastAttempt = new Date();

        // Read chunk data
        const start = (chunk.partNumber - 1) * upload.chunkSize;
        const end = start + chunk.size;
        
        const stream = createReadStream(filePath, { start, end: end - 1 });
        const buffer = await this.streamToBuffer(stream);

        // Calculate checksum
        const hash = crypto.createHash(upload.metadata.checksumAlgorithm.toLowerCase());
        hash.update(buffer);
        chunk.checksum = hash.digest('hex');

        // Upload part
        const uploadCommand = new UploadPartCommand({
          Bucket: upload.bucket,
          Key: upload.key,
          PartNumber: chunk.partNumber,
          UploadId: upload.uploadId,
          Body: buffer,
          ContentLength: buffer.length,
        });

        const response = await this.s3Client.send(uploadCommand);
        chunk.etag = response.ETag!;
        chunk.uploaded = true;
        chunk.error = undefined;

        upload.uploadedChunks++;
        await this.persistUploadState(upload);

        this.emit('chunk_uploaded', {
          uploadId: upload.uploadId,
          partNumber: chunk.partNumber,
          size: chunk.size,
          etag: chunk.etag,
          attempt,
        });

        return;
      } catch (error) {
        lastError = error as Error;
        chunk.error = lastError.message;
        
        this.emit('chunk_failed', {
          uploadId: upload.uploadId,
          partNumber: chunk.partNumber,
          attempt,
          error: lastError.message,
        });

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Complete multipart upload
   */
  private async completeUpload(uploadId: string): Promise<string> {
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    // Verify all chunks are uploaded
    const unuploadedChunks = upload.chunks.filter(chunk => !chunk.uploaded);
    if (unuploadedChunks.length > 0) {
      throw new Error(`${unuploadedChunks.length} chunks still pending`);
    }

    // Prepare parts list
    const parts = upload.chunks
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(chunk => ({
        ETag: chunk.etag!,
        PartNumber: chunk.partNumber,
      }));

    // Complete upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: upload.bucket,
      Key: upload.key,
      UploadId: upload.uploadId,
      MultipartUpload: { Parts: parts },
    });

    const response = await this.s3Client.send(completeCommand);
    
    upload.status = 'completed';
    upload.completedAt = new Date();
    await this.persistUploadState(upload);

    // Remove from active uploads after delay
    setTimeout(() => {
      this.activeUploads.delete(uploadId);
    }, 60000);

    return response.Location!;
  }

  /**
   * Resume upload from checkpoint
   */
  async resumeUpload(
    resumeToken: string,
    filePath: string,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<string> {
    // Decode resume token
    const { uploadId } = this.decodeResumeToken(resumeToken);
    
    // Get upload state
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      throw new Error('Upload session not found or expired');
    }

    if (upload.status === 'completed') {
      throw new Error('Upload already completed');
    }

    // Verify file hasn't changed
    const stats = await fs.stat(filePath);
    if (stats.size !== upload.totalSize) {
      throw new Error('File size mismatch - file may have been modified');
    }

    // Check which parts are already uploaded
    const listPartsCommand = new ListPartsCommand({
      Bucket: upload.bucket,
      Key: upload.key,
      UploadId: upload.uploadId,
    });

    try {
      const partsResponse = await this.s3Client.send(listPartsCommand);
      const uploadedParts = partsResponse.Parts || [];

      // Update chunk status based on S3 state
      for (const part of uploadedParts) {
        const chunk = upload.chunks.find(c => c.partNumber === part.PartNumber);
        if (chunk) {
          chunk.uploaded = true;
          chunk.etag = part.ETag;
          upload.uploadedChunks = uploadedParts.length;
        }
      }

      await this.persistUploadState(upload);
    } catch (error) {
      // If list parts fails, the upload may have been cleaned up
      throw new Error('Upload session invalid or expired');
    }

    // Continue upload
    return this.uploadFile(uploadId, filePath, options);
  }

  /**
   * Abort multipart upload
   */
  async abortUpload(uploadId: string): Promise<void> {
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    // Abort in S3
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: upload.bucket,
      Key: upload.key,
      UploadId: upload.uploadId,
    });

    await this.s3Client.send(abortCommand);

    // Update state
    upload.status = 'aborted';
    await this.persistUploadState(upload);
    this.activeUploads.delete(uploadId);

    this.emit('upload_aborted', { uploadId });
  }

  /**
   * Get upload progress
   */
  async getUploadProgress(uploadId: string): Promise<UploadProgress | null> {
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      return null;
    }

    const uploadedSize = upload.chunks
      .filter(chunk => chunk.uploaded)
      .reduce((sum, chunk) => sum + chunk.size, 0);

    return {
      uploadId,
      totalSize: upload.totalSize,
      uploadedSize,
      percentage: (uploadedSize / upload.totalSize) * 100,
      chunksCompleted: upload.uploadedChunks,
      totalChunks: upload.totalChunks,
    };
  }

  /**
   * Generate presigned URLs for client-side upload
   */
  async generatePresignedUrls(
    uploadId: string,
    chunkNumbers?: number[]
  ): Promise<Array<{ partNumber: number; url: string; expiresIn: number }>> {
    const upload = await this.getUpload(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    const chunks = chunkNumbers 
      ? upload.chunks.filter(c => chunkNumbers.includes(c.partNumber))
      : upload.chunks.filter(c => !c.uploaded);

    const urls = await Promise.all(
      chunks.map(async (chunk) => {
        const command = new UploadPartCommand({
          Bucket: upload.bucket,
          Key: upload.key,
          PartNumber: chunk.partNumber,
          UploadId: upload.uploadId,
        });

        const url = await getSignedUrl(this.s3Client, command, {
          expiresIn: 3600, // 1 hour
        });

        return {
          partNumber: chunk.partNumber,
          url,
          expiresIn: 3600,
        };
      })
    );

    return urls;
  }

  /**
   * Calculate optimal chunk size
   */
  private calculateOptimalChunkSize(
    fileSize: number,
    requestedChunkSize?: number
  ): number {
    if (requestedChunkSize) {
      // Validate requested chunk size
      if (requestedChunkSize < this.defaultChunkSize) {
        throw new Error(`Chunk size must be at least ${this.defaultChunkSize} bytes`);
      }
      if (requestedChunkSize > this.maxChunkSize) {
        throw new Error(`Chunk size cannot exceed ${this.maxChunkSize} bytes`);
      }
      return requestedChunkSize;
    }

    // Auto-calculate based on file size
    if (fileSize <= 100 * 1024 * 1024) { // <= 100MB
      return this.defaultChunkSize;
    } else if (fileSize <= 1024 * 1024 * 1024) { // <= 1GB
      return 10 * 1024 * 1024; // 10MB
    } else if (fileSize <= 10 * 1024 * 1024 * 1024) { // <= 10GB
      return 50 * 1024 * 1024; // 50MB
    } else {
      return 100 * 1024 * 1024; // 100MB
    }
  }

  /**
   * Generate resume token
   */
  private generateResumeToken(uploadId: string, key: string, size: number): string {
    const data = JSON.stringify({ uploadId, key, size, timestamp: Date.now() });
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decode resume token
   */
  private decodeResumeToken(token: string): { uploadId: string; key: string; size: number } {
    try {
      const data = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check token age (max 7 days)
      const age = Date.now() - data.timestamp;
      if (age > 7 * 24 * 60 * 60 * 1000) {
        throw new Error('Resume token expired');
      }
      
      return data;
    } catch (error) {
      throw new Error('Invalid resume token');
    }
  }

  /**
   * Get upload state
   */
  private async getUpload(uploadId: string): Promise<MultipartUpload | null> {
    // Check memory first
    let upload = this.activeUploads.get(uploadId);
    
    if (!upload) {
      // Check Redis
      const stored = await this.redis.get(`upload:${uploadId}`);
      if (stored) {
        upload = JSON.parse(stored);
        this.activeUploads.set(uploadId, upload!);
      }
    }

    return upload || null;
  }

  /**
   * Persist upload state
   */
  private async persistUploadState(upload: MultipartUpload): Promise<void> {
    const key = `upload:${upload.uploadId}`;
    const ttl = 7 * 24 * 60 * 60; // 7 days

    await this.redis.setex(key, ttl, JSON.stringify(upload));
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Cleanup stale uploads
   */
  private async cleanupStaleUploads(): Promise<void> {
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const [uploadId, upload] of this.activeUploads.entries()) {
      const age = now - upload.createdAt.getTime();
      
      if (age > staleThreshold && upload.status !== 'completed') {
        try {
          await this.abortUpload(uploadId);
        } catch (error) {
          console.error(`Failed to cleanup stale upload ${uploadId}:`, error);
        }
      }
    }
  }
}

// Export singleton instance
export const s3MultipartUpload = S3MultipartUploadService.getInstance();