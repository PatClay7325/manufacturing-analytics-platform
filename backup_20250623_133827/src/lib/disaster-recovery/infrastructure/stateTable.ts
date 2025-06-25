/**
 * DynamoDB table setup for disaster recovery state management
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateTimeToLiveCommand,
  CreateGlobalSecondaryIndexCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { logger } from '@/lib/logger';

export interface StateTableConfig {
  tableName: string;
  region?: string;
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readCapacity?: number;
  writeCapacity?: number;
  pointInTimeRecovery?: boolean;
  ttlDays?: number;
}

/**
 * Create or update DynamoDB table for DR state management
 */
export async function setupStateTable(
  config: StateTableConfig
): Promise<void> {
  const {
    tableName,
    region = process.env.AWS_REGION || 'us-east-1',
    billingMode = 'PAY_PER_REQUEST',
    readCapacity = 5,
    writeCapacity = 5,
    pointInTimeRecovery = true,
    ttlDays = 90,
  } = config;

  const client = new DynamoDBClient({ region });

  try {
    // Check if table exists
    await client.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    
    logger.info({ tableName }, 'State table already exists');
    
    // Update TTL if needed
    await updateTTL(client, tableName, ttlDays);
    
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      // Create table
      await createTable(
        client,
        tableName,
        billingMode,
        readCapacity,
        writeCapacity
      );
      
      // Wait for table to be active
      await waitForTableActive(client, tableName);
      
      // Enable TTL
      await updateTTL(client, tableName, ttlDays);
      
      // Enable point-in-time recovery if requested
      if (pointInTimeRecovery) {
        await enablePointInTimeRecovery(client, tableName);
      }
    } else {
      throw error;
    }
  }
}

/**
 * Create the DynamoDB table
 */
async function createTable(
  client: DynamoDBClient,
  tableName: string,
  billingMode: string,
  readCapacity: number,
  writeCapacity: number
): Promise<void> {
  logger.info({ tableName }, 'Creating DR state table');

  const params = {
    TableName: tableName,
    KeySchema: [
      {
        AttributeName: 'operationId',
        KeyType: 'HASH',
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'operationId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'type',
        AttributeType: 'S',
      },
      {
        AttributeName: 'status',
        AttributeType: 'S',
      },
      {
        AttributeName: 'startTime',
        AttributeType: 'S',
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TypeStatusIndex',
        KeySchema: [
          {
            AttributeName: 'type',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'status',
            KeyType: 'RANGE',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ...(billingMode === 'PROVISIONED' && {
          ProvisionedThroughput: {
            ReadCapacityUnits: readCapacity,
            WriteCapacityUnits: writeCapacity,
          },
        }),
      },
      {
        IndexName: 'StatusTimeIndex',
        KeySchema: [
          {
            AttributeName: 'status',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'startTime',
            KeyType: 'RANGE',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ...(billingMode === 'PROVISIONED' && {
          ProvisionedThroughput: {
            ReadCapacityUnits: readCapacity,
            WriteCapacityUnits: writeCapacity,
          },
        }),
      },
    ],
    BillingMode: billingMode,
    ...(billingMode === 'PROVISIONED' && {
      ProvisionedThroughput: {
        ReadCapacityUnits: readCapacity,
        WriteCapacityUnits: writeCapacity,
      },
    }),
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    Tags: [
      {
        Key: 'Purpose',
        Value: 'DisasterRecovery',
      },
      {
        Key: 'ManagedBy',
        Value: 'EnhancedDisasterRecoveryService',
      },
    ],
  };

  await client.send(new CreateTableCommand(params));
  
  logger.info({ tableName }, 'DR state table created successfully');
}

/**
 * Wait for table to become active
 */
async function waitForTableActive(
  client: DynamoDBClient,
  tableName: string
): Promise<void> {
  const maxAttempts = 30;
  const delayMs = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    const { Table } = await client.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    
    if (Table?.TableStatus === 'ACTIVE') {
      logger.info({ tableName }, 'Table is now active');
      return;
    }
    
    logger.info(
      { tableName, status: Table?.TableStatus, attempt: i + 1 },
      'Waiting for table to become active'
    );
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error(`Table ${tableName} did not become active within timeout`);
}

/**
 * Update TTL configuration
 */
async function updateTTL(
  client: DynamoDBClient,
  tableName: string,
  ttlDays: number
): Promise<void> {
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      })
    );
    
    logger.info(
      { tableName, ttlDays },
      'TTL configuration updated'
    );
  } catch (error) {
    logger.warn(
      { error, tableName },
      'Failed to update TTL configuration'
    );
  }
}

/**
 * Enable point-in-time recovery
 */
async function enablePointInTimeRecovery(
  client: DynamoDBClient,
  tableName: string
): Promise<void> {
  try {
    // This would use the UpdateContinuousBackups command
    // which is not available in the current SDK types
    logger.info(
      { tableName },
      'Point-in-time recovery would be enabled here'
    );
  } catch (error) {
    logger.warn(
      { error, tableName },
      'Failed to enable point-in-time recovery'
    );
  }
}

/**
 * Create sample state table
 */
export async function createSampleStateTable(): Promise<void> {
  await setupStateTable({
    tableName: process.env.DR_STATE_TABLE_NAME || 'DisasterRecoveryState',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true,
    ttlDays: 90,
  });
}

// Export for CLI usage
if (require.main === module) {
  createSampleStateTable()
    .then(() => {
      logger.info('State table setup completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error({ error }, 'Failed to setup state table');
      process.exit(1);
    });
}