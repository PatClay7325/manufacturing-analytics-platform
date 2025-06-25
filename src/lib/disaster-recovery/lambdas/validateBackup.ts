/**
 * Lambda function to validate backup integrity
 */

import { enhancedDisasterRecoveryService } from '../EnhancedDisasterRecoveryService';
import { DRError } from '../../utils/errorHandling';
import { logger } from '@/lib/logger';

export interface ValidateBackupEvent {
  snapshotId: string;
  region: string;
  operationId: string;
}

export interface ValidateBackupResult {
  valid: boolean;
  schemaHash: string;
  rowCounts: Record<string, number>;
  checksums: Record<string, string>;
  validationDuration: number;
  issues: string[];
  operationId: string;
}

export const handler = async (event: ValidateBackupEvent): Promise<ValidateBackupResult> => {
  const { snapshotId, region, operationId } = event;
  
  logger.info({
    snapshotId,
    region,
    operationId,
  }, 'Starting backup validation');
  
  try {
    // Perform validation
    const result = await enhancedDisasterRecoveryService.validateBackup(
      snapshotId,
      region
    );
    
    // Return result with operation ID
    return {
      ...result,
      operationId,
    };
    
  } catch (error) {
    logger.error({
      error,
      snapshotId,
      region,
      operationId,
    }, 'Backup validation failed');
    
    throw new DRError(
      'VALIDATION_FAILED',
      `Failed to validate backup ${snapshotId}: ${error}`,
      false,
      { snapshotId, region, operationId, error }
    );
  }
};