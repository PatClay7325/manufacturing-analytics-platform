/**
 * Lambda function to update disaster recovery operation state
 */

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { logger } from '@/lib/logger';
import { DRError } from '../../utils/errorHandling';

export interface UpdateStateEvent {
  operationId: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  checkpoint?: {
    name: string;
    data: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  result?: any;
}

export interface UpdateStateResult {
  operationId: string;
  updated: boolean;
  newVersion: number;
}

export const handler = async (
  event: UpdateStateEvent
): Promise<UpdateStateResult> => {
  const { operationId, status, checkpoint, error, result } = event;
  const tableName = process.env.DR_STATE_TABLE_NAME || 'DisasterRecoveryState';
  
  logger.info({
    operationId,
    status,
    checkpoint: checkpoint?.name,
    hasError: !!error,
  }, 'Updating DR operation state');
  
  try {
    const dynamodb = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    // Build update expression
    const updateParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {
      '#version': 'version',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':inc': 1,
    };
    
    // Always increment version
    updateParts.push('#version = #version + :inc');
    
    // Update status if provided
    if (status) {
      updateParts.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
      
      // Set end time if terminal status
      if (['completed', 'failed', 'rolled_back'].includes(status)) {
        updateParts.push('endTime = :endTime');
        expressionAttributeValues[':endTime'] = new Date().toISOString();
      }
    }
    
    // Update checkpoint if provided
    if (checkpoint) {
      updateParts.push('checkpoints.#checkpoint = :checkpointData');
      expressionAttributeNames['#checkpoint'] = checkpoint.name;
      expressionAttributeValues[':checkpointData'] = {
        ...checkpoint.data,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Update error if provided
    if (error) {
      updateParts.push('#error = :error');
      expressionAttributeNames['#error'] = 'error';
      expressionAttributeValues[':error'] = {
        ...error,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Update result if provided
    if (result !== undefined) {
      updateParts.push('#result = :result');
      expressionAttributeNames['#result'] = 'result';
      expressionAttributeValues[':result'] = result;
    }
    
    // Update modified timestamp
    updateParts.push('lastModified = :lastModified');
    expressionAttributeValues[':lastModified'] = new Date().toISOString();
    
    // Execute update
    const response = await dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({ operationId }),
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW',
      })
    );
    
    const newVersion = response.Attributes?.version?.N 
      ? parseInt(response.Attributes.version.N) 
      : 0;
    
    logger.info({
      operationId,
      newVersion,
      status,
    }, 'DR operation state updated successfully');
    
    return {
      operationId,
      updated: true,
      newVersion,
    };
    
  } catch (error) {
    logger.error({
      error,
      operationId,
      event,
    }, 'Failed to update DR operation state');
    
    throw new DRError(
      'STATE_UPDATE_FAILED',
      `Failed to update state for operation ${operationId}: ${error}`,
      true,
      { operationId, error }
    );
  }
};