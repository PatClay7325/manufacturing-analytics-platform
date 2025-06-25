/**
 * Manufacturing Data Import API - Production Ready
 * Secure, scalable implementation with proper auth, validation, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { RateLimiter } from '@/lib/rate-limiter';
import { FileScanner } from '@/lib/security/file-scanner';
import { JobQueue } from '@/lib/jobs/queue';
import { AuditLogger } from '@/lib/audit/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();
const rateLimiter = new RateLimiter();
const fileScanner = new FileScanner();
const jobQueue = new JobQueue();
const auditLogger = new AuditLogger();
const metrics = new MetricsCollector();

// Validation schemas
const uploadParamsSchema = z.object({
  workUnitId: z.string().min(1).max(100),
  importType: z.enum(['csv', 'json']),
  deduplicate: z.boolean().optional().default(true),
  validateData: z.boolean().optional().default(true),
  dryRun: z.boolean().optional().default(false),
});

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
const CHUNK_SIZE = 1000; // Process in chunks for better performance

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tempFilePath: string | null = null;
  let uploadId: string | null = null;

  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user permissions (optional - comment out if not using RBAC)
    // if (!session.user.permissions?.includes('data:import')) {
    //   return NextResponse.json(
    //     { error: 'Insufficient permissions' },
    //     { status: 403 }
    //   );
    // }

    // 2. Rate Limiting
    const rateLimitResult = await rateLimiter.check(
      `import:${session.user.id}`,
      { max: 10, window: '1h' }
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate parameters
    const params = uploadParamsSchema.parse({
      workUnitId: formData.get('workUnitId'),
      importType: formData.get('importType'),
      deduplicate: formData.get('deduplicate') === 'true',
      validateData: formData.get('validateData') === 'true',
      dryRun: formData.get('dryRun') === 'true',
    });

    // 4. File validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: CSV, JSON' },
        { status: 400 }
      );
    }

    // 5. Secure file handling
    const fileId = crypto.randomUUID();
    const sanitizedFileName = path.basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
    tempFilePath = path.join(os.tmpdir(), `upload_${fileId}_${sanitizedFileName}`);

    // Stream file to disk with virus scanning
    const fileStream = file.stream();
    const writeStream = require('fs').createWriteStream(tempFilePath);
    
    // Scan file for malware while streaming
    const scanResult = await fileScanner.scanStream(fileStream, writeStream);
    
    if (!scanResult.clean) {
      await fs.unlink(tempFilePath).catch(() => {});
      return NextResponse.json(
        { error: 'File failed security scan', threats: scanResult.threats },
        { status: 400 }
      );
    }

    // 6. Create upload record
    uploadId = crypto.randomUUID();
    const upload = await prisma.dataUpload.create({
      data: {
        id: uploadId,
        userId: session.user.id,
        workUnitId: params.workUnitId,
        fileName: sanitizedFileName,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        importType: params.importType,
        options: {
          deduplicate: params.deduplicate,
          validateData: params.validateData,
          dryRun: params.dryRun,
        },
        startedAt: new Date(),
      },
    });

    // 7. Queue background job for processing
    const jobId = await jobQueue.enqueue('import:manufacturing-data', {
      uploadId,
      filePath: tempFilePath,
      userId: session.user.id,
      workUnitId: params.workUnitId,
      importType: params.importType,
      options: {
        deduplicate: params.deduplicate,
        validateData: params.validateData,
        dryRun: params.dryRun,
        chunkSize: CHUNK_SIZE,
      },
    }, {
      priority: 'normal',
      retries: 3,
      backoff: 'exponential',
    });

    // 8. Audit logging
    await auditLogger.log({
      action: 'data.import.initiated',
      userId: session.user.id,
      resourceType: 'manufacturing_data',
      resourceId: uploadId,
      metadata: {
        fileName: sanitizedFileName,
        fileSize: file.size,
        workUnitId: params.workUnitId,
        jobId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // 9. Metrics
    metrics.increment('data_import.initiated', {
      importType: params.importType,
      userId: session.user.id,
    });

    // Return immediate response with job tracking info
    return NextResponse.json({
      success: true,
      uploadId,
      jobId,
      status: 'processing',
      message: 'File uploaded successfully. Processing in background.',
      tracking: {
        statusUrl: `/api/import/status/${uploadId}`,
        websocketUrl: `/ws/import/${uploadId}`,
      },
      estimatedTime: estimateProcessingTime(file.size, params.importType),
    });

  } catch (error) {
    // Log error with context
    console.error('Import error:', {
      error,
      userId: (await getServerSession(authOptions))?.user?.id,
      uploadId,
    });

    // Cleanup temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    // Update upload record if exists
    if (uploadId) {
      await prisma.dataUpload.update({
        where: { id: uploadId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Metrics
    metrics.increment('data_import.error', {
      errorType: error instanceof Error ? error.constructor.name : 'unknown',
    });

    // Return user-friendly error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Import failed', 
        message: 'An error occurred while processing your file. Please try again.',
        supportId: crypto.randomUUID(), // For tracking with support
      },
      { status: 500 }
    );
  } finally {
    // Record timing metrics
    metrics.timing('data_import.duration', Date.now() - startTime);
  }
}

// Get import status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (uploadId) {
      // Get specific upload status
      const upload = await prisma.dataUpload.findFirst({
        where: {
          id: uploadId,
          userId: session.user.id, // Ensure user owns this upload
        },
        include: {
          _count: {
            select: {
              importedRecords: true,
              errors: true,
            },
          },
        },
      });

      if (!upload) {
        return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
      }

      return NextResponse.json({
        upload,
        progress: calculateProgress(upload),
      });
    }

    // Get upload history
    const [uploads, total] = await Promise.all([
      prisma.dataUpload.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              importedRecords: true,
              errors: true,
            },
          },
        },
      }),
      prisma.dataUpload.count({
        where: { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({
      uploads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

// Cancel import
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
    }

    // Verify ownership
    const upload = await prisma.dataUpload.findFirst({
      where: {
        id: uploadId,
        userId: session.user.id,
        status: 'processing',
      },
    });

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found or cannot be cancelled' },
        { status: 404 }
      );
    }

    // Cancel job
    await jobQueue.cancel(`import:${uploadId}`);

    // Update status
    await prisma.dataUpload.update({
      where: { id: uploadId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    // Audit log
    await auditLogger.log({
      action: 'data.import.cancelled',
      userId: session.user.id,
      resourceType: 'data_upload',
      resourceId: uploadId,
    });

    return NextResponse.json({
      success: true,
      message: 'Import cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel import' },
      { status: 500 }
    );
  }
}

// Helper functions
function estimateProcessingTime(fileSize: number, importType: string): number {
  // Rough estimates based on file size and type
  const bytesPerSecond = importType === 'csv' ? 500000 : 1000000; // CSV is slower
  const seconds = Math.ceil(fileSize / bytesPerSecond);
  return Math.max(5, seconds); // Minimum 5 seconds
}

function calculateProgress(upload: any): any {
  if (upload.status === 'completed') return { percentage: 100, phase: 'complete' };
  if (upload.status === 'failed') return { percentage: 0, phase: 'failed' };
  if (upload.status === 'cancelled') return { percentage: 0, phase: 'cancelled' };

  const processed = upload._count.importedRecords + upload._count.errors;
  const total = upload.totalRecords || 1;
  const percentage = Math.round((processed / total) * 100);

  return {
    percentage,
    phase: upload.currentPhase || 'processing',
    recordsProcessed: processed,
    totalRecords: total,
  };
}