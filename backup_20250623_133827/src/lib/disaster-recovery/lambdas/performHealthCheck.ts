/**
 * Lambda function to perform comprehensive health checks
 */

import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from '@aws-sdk/client-rds';
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '@/lib/logger';
import { recordHealthMetrics } from '../../utils/metrics';

export interface HealthCheckEvent {
  instanceId: string;
  region: string;
  operationId: string;
  checkType: 'basic' | 'comprehensive';
}

export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    replication: boolean;
    backups: boolean;
    metrics: boolean;
  };
  details: {
    replicationLag?: number;
    lastBackupAge?: number;
    cpuUtilization?: number;
    storageUsed?: number;
    connections?: number;
  };
  issues: string[];
  operationId: string;
}

export const handler = async (
  event: HealthCheckEvent
): Promise<HealthCheckResult> => {
  const { instanceId, region, operationId, checkType } = event;
  const startTime = Date.now();
  const issues: string[] = [];
  
  logger.info({
    instanceId,
    region,
    operationId,
    checkType,
  }, 'Starting health check');
  
  const result: HealthCheckResult = {
    healthy: true,
    status: 'healthy',
    checks: {
      database: false,
      replication: false,
      backups: false,
      metrics: false,
    },
    details: {},
    issues,
    operationId,
  };
  
  try {
    const rds = new RDSClient({ region });
    const cloudWatch = new CloudWatchClient({ region });
    
    // Check database status
    const { DBInstances } = await rds.send(
      new DescribeDBInstancesCommand({
        DBInstanceIdentifier: instanceId,
      })
    );
    
    const instance = DBInstances?.[0];
    if (!instance) {
      issues.push('Database instance not found');
      result.healthy = false;
      result.status = 'unhealthy';
      return result;
    }
    
    // Database health
    if (instance.DBInstanceStatus === 'available') {
      result.checks.database = true;
    } else {
      issues.push(`Database status: ${instance.DBInstanceStatus}`);
      result.healthy = false;
    }
    
    // Check Multi-AZ status
    if (!instance.MultiAZ) {
      issues.push('Multi-AZ not enabled');
    }
    
    // Check read replicas
    const replicaCount = instance.ReadReplicaDBInstanceIdentifiers?.length || 0;
    if (replicaCount === 0) {
      issues.push('No read replicas configured');
    }
    
    // Check CloudWatch metrics if comprehensive
    if (checkType === 'comprehensive') {
      // CPU Utilization
      const cpuMetrics = await getMetric(
        cloudWatch,
        'AWS/RDS',
        'CPUUtilization',
        instanceId,
        'DBInstanceIdentifier'
      );
      result.details.cpuUtilization = cpuMetrics;
      if (cpuMetrics > 80) {
        issues.push(`High CPU utilization: ${cpuMetrics.toFixed(1)}%`);
      }
      
      // Storage
      const storageMetrics = await getMetric(
        cloudWatch,
        'AWS/RDS',
        'FreeStorageSpace',
        instanceId,
        'DBInstanceIdentifier'
      );
      const totalStorage = instance.AllocatedStorage || 0;
      const usedStorage = totalStorage - (storageMetrics / 1024 / 1024 / 1024); // Convert to GB
      result.details.storageUsed = (usedStorage / totalStorage) * 100;
      
      if (result.details.storageUsed > 85) {
        issues.push(`High storage usage: ${result.details.storageUsed.toFixed(1)}%`);
      }
      
      // Database connections
      const connectionMetrics = await getMetric(
        cloudWatch,
        'AWS/RDS',
        'DatabaseConnections',
        instanceId,
        'DBInstanceIdentifier'
      );
      result.details.connections = connectionMetrics;
      
      // Replication lag (if read replica)
      if (instance.ReadReplicaSourceDBInstanceIdentifier) {
        const lagMetrics = await getMetric(
          cloudWatch,
          'AWS/RDS',
          'ReplicaLag',
          instanceId,
          'DBInstanceIdentifier'
        );
        result.details.replicationLag = lagMetrics;
        result.checks.replication = lagMetrics < 300; // 5 minutes
        
        if (lagMetrics >= 300) {
          issues.push(`High replication lag: ${lagMetrics} seconds`);
          result.healthy = false;
        }
      } else {
        result.checks.replication = true; // Not applicable for primary
      }
    }
    
    // Check recent backups
    const lastBackup = instance.LatestRestorableTime;
    if (lastBackup) {
      const backupAge = Date.now() - new Date(lastBackup).getTime();
      result.details.lastBackupAge = backupAge / 1000 / 60; // Minutes
      result.checks.backups = result.details.lastBackupAge < 1440; // 24 hours
      
      if (result.details.lastBackupAge > 1440) {
        issues.push(`No recent backups: last backup ${Math.floor(result.details.lastBackupAge / 60)} hours ago`);
      }
    }
    
    // Overall metrics check
    result.checks.metrics = issues.length === 0;
    
    // Determine overall health status
    if (!result.healthy) {
      result.status = 'unhealthy';
    } else if (issues.length > 0) {
      result.status = 'degraded';
    }
    
    // Record metrics
    await recordHealthMetrics(
      'database',
      result.healthy,
      Date.now() - startTime,
      {
        instanceId,
        region,
        status: result.status,
        issueCount: issues.length,
      }
    );
    
    logger.info({
      instanceId,
      operationId,
      healthy: result.healthy,
      status: result.status,
      issueCount: issues.length,
    }, 'Health check completed');
    
    return result;
    
  } catch (error) {
    logger.error({
      error,
      instanceId,
      region,
      operationId,
    }, 'Health check failed');
    
    result.healthy = false;
    result.status = 'unhealthy';
    issues.push(`Health check error: ${error.message}`);
    
    await recordHealthMetrics(
      'database',
      false,
      Date.now() - startTime,
      {
        instanceId,
        region,
        error: error.message,
      }
    );
    
    return result;
  }
};

/**
 * Get CloudWatch metric value
 */
async function getMetric(
  cloudWatch: CloudWatchClient,
  namespace: string,
  metricName: string,
  dimensionValue: string,
  dimensionName: string
): Promise<number> {
  try {
    const response = await cloudWatch.send(
      new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: [
          {
            Name: dimensionName,
            Value: dimensionValue,
          },
        ],
        StartTime: new Date(Date.now() - 300000), // 5 minutes ago
        EndTime: new Date(),
        Period: 60,
        Statistics: ['Average'],
      })
    );
    
    const datapoints = response.Datapoints || [];
    if (datapoints.length === 0) {
      return 0;
    }
    
    // Get most recent value
    const sorted = datapoints.sort(
      (a, b) => new Date(b.Timestamp!).getTime() - new Date(a.Timestamp!).getTime()
    );
    
    return sorted[0].Average || 0;
    
  } catch (error) {
    logger.warn({
      error,
      namespace,
      metricName,
      dimensionValue,
    }, 'Failed to get CloudWatch metric');
    return 0;
  }
}