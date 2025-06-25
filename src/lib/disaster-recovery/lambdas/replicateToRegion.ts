/**
 * Lambda function to replicate snapshot to another region
 */

import {
  RDSClient,
  CopyDBSnapshotCommand,
  waitUntilDBSnapshotAvailable,
} from '@aws-sdk/client-rds';
import { DRError } from '../../utils/errorHandling';
import { logger } from '@/lib/logger';
import { emitDRMetrics } from '../../utils/metrics';

export interface ReplicateToRegionEvent {
  sourceSnapshotId: string;
  sourceRegion: string;
  targetRegion: string;
  operationId: string;
  encryptionKeyId?: string;
}

export interface ReplicateToRegionResult {
  targetSnapshotId: string;
  targetRegion: string;
  replicationTime: number;
  operationId: string;
}

export const handler = async (
  event: ReplicateToRegionEvent
): Promise<ReplicateToRegionResult> => {
  const {
    sourceSnapshotId,
    sourceRegion,
    targetRegion,
    operationId,
    encryptionKeyId,
  } = event;
  
  const startTime = Date.now();
  const targetSnapshotId = `${sourceSnapshotId}-${targetRegion}`;
  
  logger.info({
    sourceSnapshotId,
    sourceRegion,
    targetRegion,
    targetSnapshotId,
    operationId,
  }, 'Starting cross-region snapshot replication');
  
  try {
    // Create RDS client for target region
    const targetRds = new RDSClient({ region: targetRegion });
    
    // Copy snapshot to target region
    await targetRds.send(
      new CopyDBSnapshotCommand({
        SourceDBSnapshotIdentifier: `arn:aws:rds:${sourceRegion}:${process.env.AWS_ACCOUNT_ID}:snapshot:${sourceSnapshotId}`,
        TargetDBSnapshotIdentifier: targetSnapshotId,
        CopyTags: true,
        KmsKeyId: encryptionKeyId || process.env.DR_KMS_KEY_ID,
      })
    );
    
    // Wait for snapshot to be available
    await waitUntilDBSnapshotAvailable(
      { client: targetRds, maxWaitTime: 3600 }, // 1 hour timeout
      { DBSnapshotIdentifier: targetSnapshotId }
    );
    
    const replicationTime = Date.now() - startTime;
    
    // Emit metrics
    await emitDRMetrics(
      'cross_region_replication',
      'success',
      replicationTime,
      {
        sourceSnapshotId,
        targetSnapshotId,
        sourceRegion,
        targetRegion,
      }
    );
    
    logger.info({
      targetSnapshotId,
      targetRegion,
      replicationTime,
      operationId,
    }, 'Cross-region replication completed');
    
    return {
      targetSnapshotId,
      targetRegion,
      replicationTime,
      operationId,
    };
    
  } catch (error) {
    logger.error({
      error,
      sourceSnapshotId,
      targetRegion,
      operationId,
    }, 'Cross-region replication failed');
    
    await emitDRMetrics(
      'cross_region_replication',
      'failure',
      Date.now() - startTime,
      {
        sourceSnapshotId,
        targetRegion,
        error: error.message,
      }
    );
    
    throw new DRError(
      'REPLICATION_FAILED',
      `Failed to replicate snapshot to ${targetRegion}: ${error}`,
      true,
      { sourceSnapshotId, targetRegion, operationId, error }
    );
  }
};