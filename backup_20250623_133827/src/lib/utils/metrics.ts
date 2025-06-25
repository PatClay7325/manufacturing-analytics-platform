/**
 * Metrics Utilities for Disaster Recovery
 * Provides standardized metrics emission for DR operations
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import { logger } from '@/lib/logger';

// CloudWatch client
let cloudWatchClient: CloudWatchClient | null = null;

// Prometheus metrics
const drOperationDuration = new Histogram({
  name: 'dr_operation_duration_seconds',
  help: 'Duration of disaster recovery operations',
  labelNames: ['operation', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
});

const drOperationTotal = new Counter({
  name: 'dr_operation_total',
  help: 'Total number of disaster recovery operations',
  labelNames: ['operation', 'status'],
});

const drBackupSize = new Gauge({
  name: 'dr_backup_size_gb',
  help: 'Size of backups in gigabytes',
  labelNames: ['type', 'region'],
});

const drReplicationLag = new Gauge({
  name: 'dr_replication_lag_seconds',
  help: 'Replication lag in seconds',
  labelNames: ['source', 'target', 'type'],
});

const drSystemHealth = new Gauge({
  name: 'dr_system_health',
  help: 'Disaster recovery system health (0=unhealthy, 1=healthy)',
  labelNames: ['component'],
});

const drErrorRate = new Counter({
  name: 'dr_errors_total',
  help: 'Total number of disaster recovery errors',
  labelNames: ['operation', 'error_code'],
});

// Register metrics
register.registerMetric(drOperationDuration);
register.registerMetric(drOperationTotal);
register.registerMetric(drBackupSize);
register.registerMetric(drReplicationLag);
register.registerMetric(drSystemHealth);
register.registerMetric(drErrorRate);

/**
 * Initialize CloudWatch client
 */
function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return cloudWatchClient;
}

/**
 * Emit metrics to both Prometheus and CloudWatch
 */
export async function emitDRMetrics(
  operation: string,
  status: 'success' | 'failure' | 'warning',
  duration?: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Emit to Prometheus
    drOperationTotal.inc({ operation, status });
    
    if (duration !== undefined) {
      drOperationDuration.observe({ operation, status }, duration / 1000); // Convert to seconds
    }

    // Emit specific metrics based on operation
    if (metadata) {
      if (metadata.sizeGB) {
        drBackupSize.set(
          { type: operation, region: metadata.region || 'unknown' },
          metadata.sizeGB
        );
      }
      
      if (metadata.replicationLag !== undefined) {
        drReplicationLag.set(
          {
            source: metadata.source || 'primary',
            target: metadata.target || 'replica',
            type: operation,
          },
          metadata.replicationLag
        );
      }
      
      if (metadata.health !== undefined) {
        drSystemHealth.set(
          { component: operation },
          metadata.health ? 1 : 0
        );
      }
      
      if (status === 'failure' && metadata.errorCode) {
        drErrorRate.inc({ operation, error_code: metadata.errorCode });
      }
    }

    // Emit to CloudWatch (if enabled)
    if (process.env.ENABLE_CLOUDWATCH_METRICS === 'true') {
      await emitToCloudWatch(operation, status, duration, metadata);
    }

    // Log metric emission
    logger.debug(
      {
        operation,
        status,
        duration,
        metadata,
      },
      'DR metrics emitted'
    );
  } catch (error) {
    logger.error(
      {
        error,
        operation,
        status,
      },
      'Failed to emit DR metrics'
    );
  }
}

/**
 * Emit metrics to CloudWatch
 */
async function emitToCloudWatch(
  operation: string,
  status: string,
  duration?: number,
  metadata?: Record<string, any>
): Promise<void> {
  const client = getCloudWatchClient();
  const namespace = 'DisasterRecovery';
  const timestamp = new Date();
  
  const metrics: MetricDatum[] = [
    {
      MetricName: 'OperationCount',
      Value: 1,
      Unit: StandardUnit.Count,
      Timestamp: timestamp,
      Dimensions: [
        { Name: 'Operation', Value: operation },
        { Name: 'Status', Value: status },
      ],
    },
  ];
  
  if (duration !== undefined) {
    metrics.push({
      MetricName: 'OperationDuration',
      Value: duration,
      Unit: StandardUnit.Milliseconds,
      Timestamp: timestamp,
      Dimensions: [
        { Name: 'Operation', Value: operation },
        { Name: 'Status', Value: status },
      ],
    });
  }
  
  // Add custom metrics from metadata
  if (metadata) {
    if (metadata.sizeGB) {
      metrics.push({
        MetricName: 'BackupSize',
        Value: metadata.sizeGB,
        Unit: StandardUnit.Gigabytes,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'Operation', Value: operation },
          { Name: 'Region', Value: metadata.region || 'unknown' },
        ],
      });
    }
    
    if (metadata.replicationLag !== undefined) {
      metrics.push({
        MetricName: 'ReplicationLag',
        Value: metadata.replicationLag,
        Unit: StandardUnit.Seconds,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'Source', Value: metadata.source || 'primary' },
          { Name: 'Target', Value: metadata.target || 'replica' },
        ],
      });
    }
    
    if (metadata.rpo !== undefined) {
      metrics.push({
        MetricName: 'RecoveryPointObjective',
        Value: metadata.rpo,
        Unit: StandardUnit.Minutes,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'Operation', Value: operation },
        ],
      });
    }
    
    if (metadata.rto !== undefined) {
      metrics.push({
        MetricName: 'RecoveryTimeObjective',
        Value: metadata.rto,
        Unit: StandardUnit.Minutes,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'Operation', Value: operation },
        ],
      });
    }
  }
  
  // Send metrics to CloudWatch
  await client.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metrics,
    })
  );
}

/**
 * Record backup metrics
 */
export async function recordBackupMetrics(
  snapshotId: string,
  sizeGB: number,
  duration: number,
  region: string,
  crossRegion: boolean = false
): Promise<void> {
  await emitDRMetrics(
    crossRegion ? 'cross_region_backup' : 'backup',
    'success',
    duration,
    {
      snapshotId,
      sizeGB,
      region,
      crossRegion,
    }
  );
}

/**
 * Record restore metrics
 */
export async function recordRestoreMetrics(
  snapshotId: string,
  instanceId: string,
  duration: number,
  success: boolean
): Promise<void> {
  await emitDRMetrics(
    'restore',
    success ? 'success' : 'failure',
    duration,
    {
      snapshotId,
      instanceId,
    }
  );
}

/**
 * Record replication metrics
 */
export async function recordReplicationMetrics(
  source: string,
  target: string,
  lagSeconds: number,
  type: 'database' | 's3' | 'cross-region'
): Promise<void> {
  drReplicationLag.set(
    { source, target, type },
    lagSeconds
  );
  
  // Alert if lag is too high
  const threshold = type === 'database' ? 300 : 900; // 5 min for DB, 15 min for others
  
  if (lagSeconds > threshold) {
    await emitDRMetrics(
      'replication_lag_high',
      'warning',
      undefined,
      {
        source,
        target,
        replicationLag: lagSeconds,
        threshold,
        type,
      }
    );
  }
}

/**
 * Record chaos experiment metrics
 */
export async function recordChaosMetrics(
  experimentType: string,
  severity: string,
  duration: number,
  success: boolean,
  recoveryTime?: number
): Promise<void> {
  await emitDRMetrics(
    `chaos_${experimentType}`,
    success ? 'success' : 'failure',
    duration,
    {
      severity,
      recoveryTime,
      experimentType,
    }
  );
}

/**
 * Record health check metrics
 */
export async function recordHealthMetrics(
  component: string,
  healthy: boolean,
  responseTime?: number,
  details?: Record<string, any>
): Promise<void> {
  drSystemHealth.set({ component }, healthy ? 1 : 0);
  
  await emitDRMetrics(
    'health_check',
    healthy ? 'success' : 'failure',
    responseTime,
    {
      component,
      health: healthy,
      ...details,
    }
  );
}

/**
 * Record compliance metrics
 */
export async function recordComplianceMetrics(
  standard: string,
  score: number,
  issues: string[]
): Promise<void> {
  await emitDRMetrics(
    'compliance_check',
    score >= 80 ? 'success' : 'warning',
    undefined,
    {
      standard,
      score,
      issueCount: issues.length,
      issues: issues.slice(0, 5), // Limit to 5 issues
    }
  );
}

/**
 * Get current metrics summary
 */
export async function getDRMetricsSummary(): Promise<Record<string, any>> {
  const metrics = await register.getMetricsAsJSON();
  
  const summary: Record<string, any> = {
    operations: {},
    health: {},
    replication: {},
    errors: {},
  };
  
  // Process metrics
  for (const metric of metrics) {
    if (metric.name === 'dr_operation_total') {
      summary.operations.total = metric.values.reduce(
        (sum, v) => sum + (v.value || 0),
        0
      );
    } else if (metric.name === 'dr_system_health') {
      for (const value of metric.values) {
        const component = value.labels?.component;
        if (component) {
          summary.health[component] = value.value === 1;
        }
      }
    } else if (metric.name === 'dr_replication_lag_seconds') {
      for (const value of metric.values) {
        const key = `${value.labels?.source}_to_${value.labels?.target}`;
        summary.replication[key] = value.value;
      }
    } else if (metric.name === 'dr_errors_total') {
      summary.errors.total = metric.values.reduce(
        (sum, v) => sum + (v.value || 0),
        0
      );
    }
  }
  
  return summary;
}

/**
 * Create custom metric
 */
export function createDRMetric(
  name: string,
  type: 'counter' | 'gauge' | 'histogram',
  help: string,
  labelNames?: string[]
): Counter | Gauge | Histogram {
  const metricName = `dr_custom_${name}`;
  
  let metric;
  
  switch (type) {
    case 'counter':
      metric = new Counter({
        name: metricName,
        help,
        labelNames: labelNames || [],
      });
      break;
    case 'gauge':
      metric = new Gauge({
        name: metricName,
        help,
        labelNames: labelNames || [],
      });
      break;
    case 'histogram':
      metric = new Histogram({
        name: metricName,
        help,
        labelNames: labelNames || [],
        buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
      });
      break;
  }
  
  register.registerMetric(metric);
  return metric;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetDRMetrics(): void {
  register.clear();
}

/**
 * Export metrics in Prometheus format
 */
export async function exportMetrics(): Promise<string> {
  return register.metrics();
}