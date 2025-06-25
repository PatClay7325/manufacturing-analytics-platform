/**
 * Infrastructure Setup & Validation
 * Ensures all required AWS resources exist for production deployment
 */

import {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import {
  ELBv2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  ECSClient,
  DescribeClustersCommand,
} from '@aws-sdk/client-ecs';
import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import {
  S3Client,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const elbClient = new ELBv2Client({ region: process.env.AWS_REGION || 'us-east-1' });
const ecsClient = new ECSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const rdsClient = new RDSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

interface TableDefinition {
  name: string;
  attributes: Array<{ name: string; type: 'S' | 'N' | 'B' }>;
  keySchema: Array<{ name: string; type: 'HASH' | 'RANGE' }>;
  globalSecondaryIndexes?: Array<{
    name: string;
    keys: Array<{ name: string; type: 'HASH' | 'RANGE' }>;
  }>;
}

const REQUIRED_TABLES: TableDefinition[] = [
  {
    name: process.env.DEPLOYMENT_LOCK_TABLE || 'deployment-locks',
    attributes: [
      { name: 'service', type: 'S' },
      { name: 'lockId', type: 'S' },
    ],
    keySchema: [
      { name: 'service', type: 'HASH' },
    ],
  },
  {
    name: process.env.DEPLOYMENT_STATE_TABLE || 'deployment-states',
    attributes: [
      { name: 'id', type: 'S' },
      { name: 'service', type: 'S' },
      { name: 'status', type: 'S' },
    ],
    keySchema: [
      { name: 'id', type: 'HASH' },
    ],
    globalSecondaryIndexes: [
      {
        name: 'ServiceStatusIndex',
        keys: [
          { name: 'service', type: 'HASH' },
          { name: 'status', type: 'RANGE' },
        ],
      },
    ],
  },
  {
    name: process.env.ALERT_TABLE || 'alerts',
    attributes: [
      { name: 'id', type: 'S' },
      { name: 'fingerprint', type: 'S' },
      { name: 'severity', type: 'S' },
      { name: 'service', type: 'S' },
    ],
    keySchema: [
      { name: 'id', type: 'HASH' },
    ],
    globalSecondaryIndexes: [
      {
        name: 'FingerprintIndex',
        keys: [
          { name: 'fingerprint', type: 'HASH' },
        ],
      },
      {
        name: 'ServiceSeverityIndex',
        keys: [
          { name: 'service', type: 'HASH' },
          { name: 'severity', type: 'RANGE' },
        ],
      },
    ],
  },
  {
    name: process.env.NOTIFICATION_TABLE || 'notifications',
    attributes: [
      { name: 'id', type: 'S' },
      { name: 'alertId', type: 'S' },
      { name: 'channel', type: 'S' },
    ],
    keySchema: [
      { name: 'id', type: 'HASH' },
    ],
    globalSecondaryIndexes: [
      {
        name: 'AlertChannelIndex',
        keys: [
          { name: 'alertId', type: 'HASH' },
          { name: 'channel', type: 'RANGE' },
        ],
      },
    ],
  },
];

/**
 * Ensure all required DynamoDB tables exist
 */
export async function ensureDynamoDBTables(): Promise<void> {
  logger.info('Validating DynamoDB tables...');
  
  for (const tableDefinition of REQUIRED_TABLES) {
    try {
      await dynamoClient.send(new DescribeTableCommand({
        TableName: tableDefinition.name,
      }));
      
      logger.info({ tableName: tableDefinition.name }, 'DynamoDB table exists');
      
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        logger.info({ tableName: tableDefinition.name }, 'Creating DynamoDB table...');
        
        await createDynamoDBTable(tableDefinition);
        
        logger.info({ tableName: tableDefinition.name }, 'DynamoDB table created');
      } else {
        logger.error({ error, tableName: tableDefinition.name }, 'Failed to check DynamoDB table');
        throw error;
      }
    }
  }
}

/**
 * Create DynamoDB table with proper configuration
 */
async function createDynamoDBTable(definition: TableDefinition): Promise<void> {
  const attributeDefinitions = definition.attributes.map(attr => ({
    AttributeName: attr.name,
    AttributeType: attr.type,
  }));
  
  const keySchema = definition.keySchema.map(key => ({
    AttributeName: key.name,
    KeyType: key.type,
  }));
  
  const globalSecondaryIndexes = definition.globalSecondaryIndexes?.map(gsi => ({
    IndexName: gsi.name,
    KeySchema: gsi.keys.map(key => ({
      AttributeName: key.name,
      KeyType: key.type,
    })),
    Projection: { ProjectionType: 'ALL' },
  }));
  
  await dynamoClient.send(new CreateTableCommand({
    TableName: definition.name,
    AttributeDefinitions: attributeDefinitions,
    KeySchema: keySchema,
    GlobalSecondaryIndexes: globalSecondaryIndexes,
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
    Tags: [
      { Key: 'Project', Value: 'ManufacturingAnalytics' },
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'ManagedBy', Value: 'InfrastructureSetup' },
    ],
  }));
  
  // Wait for table to be active
  await waitForTableActive(definition.name);
}

/**
 * Wait for DynamoDB table to become active
 */
async function waitForTableActive(tableName: string): Promise<void> {
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 5000; // 5 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await dynamoClient.send(new DescribeTableCommand({
        TableName: tableName,
      }));
      
      if (response.Table?.TableStatus === 'ACTIVE') {
        return;
      }
      
      logger.info({ tableName, status: response.Table?.TableStatus }, 'Waiting for table to become active...');
      
    } catch (error) {
      logger.warn({ error, tableName }, 'Error checking table status');
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Table ${tableName} did not become active within ${maxWaitTime}ms`);
}

/**
 * Validate ECS cluster exists
 */
export async function validateECSCluster(clusterName: string): Promise<boolean> {
  try {
    const response = await ecsClient.send(new DescribeClustersCommand({
      clusters: [clusterName],
    }));
    
    const cluster = response.clusters?.find(c => c.clusterName === clusterName);
    if (!cluster || cluster.status !== 'ACTIVE') {
      logger.error({ clusterName }, 'ECS cluster not found or not active');
      return false;
    }
    
    logger.info({ clusterName }, 'ECS cluster validated');
    return true;
    
  } catch (error) {
    logger.error({ error, clusterName }, 'Failed to validate ECS cluster');
    return false;
  }
}

/**
 * Validate load balancer exists
 */
export async function validateLoadBalancer(loadBalancerName: string): Promise<string | null> {
  try {
    const response = await elbClient.send(new DescribeLoadBalancersCommand({
      Names: [loadBalancerName],
    }));
    
    const loadBalancer = response.LoadBalancers?.[0];
    if (!loadBalancer) {
      logger.error({ loadBalancerName }, 'Load balancer not found');
      return null;
    }
    
    logger.info({ loadBalancerName, arn: loadBalancer.LoadBalancerArn }, 'Load balancer validated');
    return loadBalancer.LoadBalancerArn!;
    
  } catch (error) {
    logger.error({ error, loadBalancerName }, 'Failed to validate load balancer');
    return null;
  }
}

/**
 * Validate target group exists
 */
export async function validateTargetGroup(targetGroupName: string): Promise<string | null> {
  try {
    const response = await elbClient.send(new DescribeTargetGroupsCommand({
      Names: [targetGroupName],
    }));
    
    const targetGroup = response.TargetGroups?.[0];
    if (!targetGroup) {
      logger.error({ targetGroupName }, 'Target group not found');
      return null;
    }
    
    logger.info({ targetGroupName, arn: targetGroup.TargetGroupArn }, 'Target group validated');
    return targetGroup.TargetGroupArn!;
    
  } catch (error) {
    logger.error({ error, targetGroupName }, 'Failed to validate target group');
    return null;
  }
}

/**
 * Validate RDS instance exists
 */
export async function validateRDSInstance(instanceId: string): Promise<boolean> {
  try {
    const response = await rdsClient.send(new DescribeDBInstancesCommand({
      DBInstanceIdentifier: instanceId,
    }));
    
    const instance = response.DBInstances?.[0];
    if (!instance || instance.DBInstanceStatus !== 'available') {
      logger.error({ instanceId }, 'RDS instance not found or not available');
      return false;
    }
    
    logger.info({ instanceId }, 'RDS instance validated');
    return true;
    
  } catch (error) {
    logger.error({ error, instanceId }, 'Failed to validate RDS instance');
    return false;
  }
}

/**
 * Validate S3 bucket exists
 */
export async function validateS3Bucket(bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({
      Bucket: bucketName,
    }));
    
    logger.info({ bucketName }, 'S3 bucket validated');
    return true;
    
  } catch (error: any) {
    if (error.name === 'NoSuchBucket') {
      logger.error({ bucketName }, 'S3 bucket not found');
    } else if (error.name === 'Forbidden') {
      logger.error({ bucketName }, 'No access to S3 bucket');
    } else {
      logger.error({ error, bucketName }, 'Failed to validate S3 bucket');
    }
    return false;
  }
}

/**
 * Complete infrastructure validation
 */
export async function validateInfrastructure(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Validate DynamoDB tables
    await ensureDynamoDBTables();
    
    // Validate ECS cluster if configured
    if (process.env.ECS_CLUSTER) {
      const clusterValid = await validateECSCluster(process.env.ECS_CLUSTER);
      if (!clusterValid) {
        errors.push(`ECS cluster ${process.env.ECS_CLUSTER} not found or not active`);
      }
    }
    
    // Validate load balancer if configured
    if (process.env.LOAD_BALANCER_NAME) {
      const lbArn = await validateLoadBalancer(process.env.LOAD_BALANCER_NAME);
      if (!lbArn) {
        errors.push(`Load balancer ${process.env.LOAD_BALANCER_NAME} not found`);
      }
    }
    
    // Validate RDS instance if configured
    if (process.env.RDS_INSTANCE_IDENTIFIER) {
      const rdsValid = await validateRDSInstance(process.env.RDS_INSTANCE_IDENTIFIER);
      if (!rdsValid) {
        errors.push(`RDS instance ${process.env.RDS_INSTANCE_IDENTIFIER} not found or not available`);
      }
    }
    
    // Validate S3 buckets if configured
    const buckets = [
      process.env.DEPLOYMENT_ARTIFACTS_BUCKET,
      process.env.BACKUP_BUCKET,
      process.env.LOGS_BUCKET,
    ].filter(Boolean);
    
    for (const bucket of buckets) {
      const bucketValid = await validateS3Bucket(bucket!);
      if (!bucketValid) {
        errors.push(`S3 bucket ${bucket} not found or not accessible`);
      }
    }
    
    logger.info({
      tablesCreated: REQUIRED_TABLES.length,
      validationErrors: errors.length,
    }, 'Infrastructure validation completed');
    
    return {
      valid: errors.length === 0,
      errors,
    };
    
  } catch (error) {
    logger.error({ error }, 'Infrastructure validation failed');
    return {
      valid: false,
      errors: [`Infrastructure validation failed: ${(error as Error).message}`],
    };
  }
}

/**
 * Get infrastructure status for monitoring
 */
export async function getInfrastructureStatus(): Promise<{
  dynamodb: { status: string; tables: string[] };
  ecs: { status: string; cluster?: string };
  elb: { status: string; loadBalancers: string[] };
  rds: { status: string; instances: string[] };
  s3: { status: string; buckets: string[] };
}> {
  const status = {
    dynamodb: { status: 'unknown', tables: [] as string[] },
    ecs: { status: 'unknown', cluster: undefined as string | undefined },
    elb: { status: 'unknown', loadBalancers: [] as string[] },
    rds: { status: 'unknown', instances: [] as string[] },
    s3: { status: 'unknown', buckets: [] as string[] },
  };
  
  // Check DynamoDB
  try {
    const tableNames = REQUIRED_TABLES.map(t => t.name);
    for (const tableName of tableNames) {
      await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      status.dynamodb.tables.push(tableName);
    }
    status.dynamodb.status = 'healthy';
  } catch (error) {
    status.dynamodb.status = 'error';
  }
  
  // Check other services similarly...
  // (Implementation would check each service)
  
  return status;
}