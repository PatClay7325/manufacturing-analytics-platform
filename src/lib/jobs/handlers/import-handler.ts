/**
 * Import Job Handler
 * Processes manufacturing data import jobs
 */

import { Job } from '../queue';
import { ManufacturingDataImportService } from '@/services/manufacturingDataImportService';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const importService = ManufacturingDataImportService.getInstance();

interface ImportJobPayload {
  uploadId: string;
  filePath: string;
  userId: string;
  workUnitId: string;
  importType: 'csv' | 'json';
  options: {
    deduplicate?: boolean;
    validateData?: boolean;
    dryRun?: boolean;
    chunkSize?: number;
  };
}

export async function handleImportJob(job: Job): Promise<any> {
  const payload = job.payload as ImportJobPayload;
  let tempFilePath = payload.filePath;

  try {
    console.log(`Starting import job for upload ${payload.uploadId}`);

    // Update upload status
    await prisma.dataUpload.update({
      where: { id: payload.uploadId },
      data: {
        status: 'processing',
        currentPhase: 'Starting import process',
      },
    });

    // Import based on file type
    let result;
    if (payload.importType === 'csv') {
      result = await importService.importFromCSV(tempFilePath, {
        workUnitId: payload.workUnitId,
        userId: payload.userId,
        uploadId: payload.uploadId,
        chunkSize: payload.options.chunkSize || 1000,
        deduplicate: payload.options.deduplicate,
        validateData: payload.options.validateData,
        dryRun: payload.options.dryRun,
        onProgress: async (progress) => {
          // Update progress in database
          await prisma.dataUpload.update({
            where: { id: payload.uploadId },
            data: {
              processedRecords: progress.processedRecords,
              successfulRecords: progress.successfulRecords,
              failedRecords: progress.failedRecords,
              currentPhase: progress.currentPhase,
            },
          }).catch(err => console.error('Progress update error:', err));
        },
      });
    } else if (payload.importType === 'json') {
      // Read JSON file
      const jsonData = JSON.parse(await fs.readFile(tempFilePath, 'utf8'));
      result = await importService.importFromJSON(jsonData, {
        workUnitId: payload.workUnitId,
        userId: payload.userId,
        uploadId: payload.uploadId,
        chunkSize: payload.options.chunkSize || 1000,
        deduplicate: payload.options.deduplicate,
        validateData: payload.options.validateData,
        dryRun: payload.options.dryRun,
        onProgress: async (progress) => {
          await prisma.dataUpload.update({
            where: { id: payload.uploadId },
            data: {
              processedRecords: progress.processedRecords,
              successfulRecords: progress.successfulRecords,
              failedRecords: progress.failedRecords,
              currentPhase: progress.currentPhase,
            },
          }).catch(err => console.error('Progress update error:', err));
        },
      });
    } else {
      throw new Error(`Unsupported import type: ${payload.importType}`);
    }

    // Update final status
    await prisma.dataUpload.update({
      where: { id: payload.uploadId },
      data: {
        status: result.success ? 'completed' : 'completed_with_errors',
        totalRecords: result.imported + result.failed + result.skipped,
        successfulRecords: result.imported,
        failedRecords: result.failed,
        processingTime: result.processingTime,
        memoryUsed: result.memoryUsed,
        completedAt: new Date(),
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        metadata: {
          duplicates: result.duplicates,
          skipped: result.skipped,
        },
      },
    });

    // Cleanup temp file
    await fs.unlink(tempFilePath).catch(() => {});

    console.log(`Import job completed for upload ${payload.uploadId}`);
    return result;

  } catch (error) {
    console.error(`Import job failed for upload ${payload.uploadId}:`, error);

    // Update error status
    await prisma.dataUpload.update({
      where: { id: payload.uploadId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    // Cleanup temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    throw error;
  }
}