# Enhanced Disaster Recovery Implementation Guide

## Overview

This guide documents the production-ready, zero-compromise disaster recovery implementation for the Manufacturing Analytics Platform. The system provides comprehensive backup, replication, validation, and failover capabilities using AWS services with full automation and safety controls.

## Architecture

### Core Components

#### 1. EnhancedDisasterRecoveryService (`src/lib/disaster-recovery/EnhancedDisasterRecoveryService.ts`)

The enterprise-grade service providing:
- **Automated Backups**: Scheduled RDS snapshots with validation and cross-region replication
- **Backup Validation**: Comprehensive integrity checks including schema, row counts, and checksums
- **Multi-AZ Support**: High availability within regions
- **Global Clusters**: Aurora global database for active-active replication
- **S3 Replication**: Cross-region backup file replication with lifecycle management
- **State Management**: DynamoDB-based operation tracking
- **Monitoring**: Real-time metrics via CloudWatch and Prometheus

Key Features:
- Circuit breaker pattern for resilience
- Automatic retry with exponential backoff
- Comprehensive error handling
- Audit trail for compliance
- Cost optimization through lifecycle policies

#### 2. EnhancedChaosEngineering (`src/lib/disaster-recovery/EnhancedChaosEngineering.ts`)

Production-ready chaos engineering with safety controls:
- **Database Chaos**: RDS failover, reboot, and stop scenarios
- **Infrastructure Chaos**: EC2 instance lifecycle testing
- **Network Chaos**: Load balancer and target group manipulation
- **Regional Chaos**: Full regional failure simulation
- **Safety Features**:
  - Approval workflows for critical experiments
  - Automatic rollback on failure
  - Emergency stop capability
  - Pre/post validation checks
  - Minimum healthy target enforcement

#### 3. Error Handling System (`src/lib/utils/errorHandling.ts`)

Comprehensive error management:
- **DRError**: Custom error type with retry metadata
- **Circuit Breaker**: Prevents cascading failures
- **Retry Logic**: Exponential backoff with jitter
- **Timeout Handling**: Configurable operation timeouts
- **Error Aggregation**: Multiple failure tracking

#### 4. Metrics System (`src/lib/utils/metrics.ts`)

Unified metrics collection:
- **Prometheus Integration**: Local metrics collection
- **CloudWatch Integration**: AWS metrics emission
- **Custom Metrics**: DR-specific measurements
- **Real-time Dashboards**: Operational visibility

### Lambda Functions

#### Backup Validation (`lambdas/validateBackup.ts`)
- Validates snapshot integrity
- Performs schema comparison
- Checks data consistency
- Returns comprehensive validation report

#### Cross-Region Replication (`lambdas/replicateToRegion.ts`)
- Handles snapshot copying to target regions
- Manages encryption keys
- Tracks replication progress
- Implements retry logic

#### Health Checks (`lambdas/performHealthCheck.ts`)
- Monitors database health
- Checks replication status
- Validates backup currency
- Tracks system metrics

#### State Management (`lambdas/updateState.ts`)
- Updates DynamoDB state table
- Tracks operation progress
- Manages checkpoints
- Records errors and results

### Step Functions Orchestration

The backup process is orchestrated through AWS Step Functions (`stepfunctions/backupOrchestration.json`):

```
InitializeBackup → CreateSnapshot → WaitForSnapshot → ValidateBackup → ReplicateToRegions → UpdateSuccessState
                                                   ↓
                                          HandleValidationFailure
```

Features:
- Parallel cross-region replication
- Automatic retry with backoff
- Error handling and recovery
- State persistence
- Progress tracking

## Prerequisites

### AWS SDK Installation

```bash
npm install @aws-sdk/client-rds @aws-sdk/client-ec2 @aws-sdk/client-s3 \
  @aws-sdk/client-elastic-load-balancing-v2 @aws-sdk/client-auto-scaling \
  @aws-sdk/client-cloudwatch @aws-sdk/client-dynamodb \
  @aws-sdk/client-secretsmanager @aws-sdk/client-kms \
  @aws-sdk/client-stepfunctions @aws-sdk/util-dynamodb \
  @aws-sdk/node-http-handler
```

### Environment Variables

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_SECONDARY_REGION=us-west-2
AWS_ACCOUNT_ID=123456789012

# RDS Configuration
RDS_INSTANCE_IDENTIFIER=prod-manufacturing-db
RDS_CLUSTER_IDENTIFIER=prod-manufacturing-cluster
GLOBAL_CLUSTER_IDENTIFIER=manufacturing-global-cluster

# Database Credentials
DB_USERNAME=admin
DB_PASSWORD=secure-password-here

# Disaster Recovery Configuration
DR_BACKUP_INTERVAL_HOURS=6
DR_TARGET_REGIONS=us-west-2,eu-west-1
DR_METADATA_BUCKET=manufacturing-dr-metadata
DR_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
DR_STATE_TABLE_NAME=DisasterRecoveryState

# S3 Replication
S3_REPLICATION_ROLE_ARN=arn:aws:iam::123456789012:role/s3-replication-role

# Chaos Engineering
CHAOS_EC2_IDS=i-0123456789abcdef0,i-0fedcba9876543210
CHAOS_ASG_NAMES=manufacturing-api-asg,manufacturing-worker-asg
CHAOS_APPROVAL_KEY=your-approval-key-for-critical-experiments
CHAOS_DRY_RUN=false

# Metrics and Monitoring
ENABLE_CLOUDWATCH_METRICS=true
METRICS_NAMESPACE=DisasterRecovery
```

### DynamoDB State Table Setup

```bash
# Create state table
tsx src/lib/disaster-recovery/infrastructure/stateTable.ts
```

This creates a DynamoDB table with:
- Primary key: operationId
- Global secondary indexes for querying by type/status
- TTL for automatic cleanup
- Point-in-time recovery
- Stream for change tracking

## Usage

### Backup Operations

#### Create Manual Snapshot with Validation

```typescript
import { enhancedDisasterRecoveryService } from '@/lib/disaster-recovery/EnhancedDisasterRecoveryService';

// Create snapshot with full validation and cross-region replication
const snapshotId = await enhancedDisasterRecoveryService.createSnapshot(
  'prod-db',
  {
    crossRegionBackup: true,
    targetRegions: ['us-west-2', 'eu-west-1'],
    encryptionKeyId: 'arn:aws:kms:us-east-1:123456789012:key/...',
    compressionEnabled: true,
    tags: {
      Environment: 'production',
      Purpose: 'scheduled-backup',
      Owner: 'devops-team'
    },
    lifecycle: {
      transitionToGlacierDays: 30,
      deleteAfterDays: 365
    }
  }
);

// Validate the backup
const validationResult = await enhancedDisasterRecoveryService.validateBackup(
  snapshotId,
  'us-east-1'
);

console.log({
  valid: validationResult.valid,
  schemaHash: validationResult.schemaHash,
  rowCounts: validationResult.rowCounts,
  issues: validationResult.issues
});
```

#### Restore with Validation

```typescript
const restoredInstanceId = await enhancedDisasterRecoveryService.restoreFromSnapshot(
  snapshotId,
  {
    targetInstanceId: 'restored-prod-db',
    instanceClass: 'db.r5.2xlarge',
    multiAz: true,
    publiclyAccessible: false,
    vpcSecurityGroupIds: ['sg-12345678'],
    dbSubnetGroupName: 'prod-subnet-group',
    performanceInsightsEnabled: true,
    deletionProtection: true
  }
);
```

#### Enable Multi-AZ

```typescript
await enhancedDisasterRecoveryService.enableMultiAz('prod-db');
```

#### Create Global Cluster

```typescript
await enhancedDisasterRecoveryService.createGlobalCluster(
  'manufacturing-global',
  'primary-cluster-id'
);
```

#### Setup S3 Cross-Region Replication

```typescript
await enhancedDisasterRecoveryService.setupS3CrossRegionReplication(
  'manufacturing-backups',
  'manufacturing-backups-dr',
  'us-west-2'
);
```

### Chaos Engineering

#### Execute Database Failover Test

```typescript
import { enhancedChaosEngineering } from '@/lib/disaster-recovery/EnhancedChaosEngineering';

const result = await enhancedChaosEngineering.executeExperiment({
  id: 'db-failover-test-001',
  name: 'RDS Multi-AZ Failover Test',
  description: 'Test database failover capabilities',
  type: 'database',
  severity: 'medium',
  targetResources: {
    rdsInstances: ['prod-db']
  },
  parameters: {
    duration: 300000, // 5 minutes
    intensity: 50,
    automaticRollback: true,
    notificationChannels: ['slack-critical'],
    approvalRequired: false
  },
  preChecks: [
    async () => {
      // Verify backups exist
      const status = await enhancedDisasterRecoveryService.getDisasterRecoveryStatus();
      return status.backups.recent > 0;
    },
    async () => {
      // Verify replication is healthy
      const status = await enhancedDisasterRecoveryService.getDisasterRecoveryStatus();
      return status.replication.lagSeconds < 60;
    }
  ],
  postChecks: [
    async () => {
      // Verify data integrity
      const validation = await enhancedDisasterRecoveryService.validateBackup(
        'latest-snapshot',
        'us-east-1'
      );
      return validation.valid;
    },
    async () => {
      // Verify all services recovered
      const health = await checkSystemHealth();
      return health.status === 'healthy';
    }
  ],
  rollbackPlan: [
    async () => {
      // Restore from latest snapshot if needed
      await enhancedDisasterRecoveryService.restoreFromSnapshot(
        'latest-snapshot',
        { targetInstanceId: 'recovery-instance' }
      );
    }
  ]
});

console.log({
  status: result.status,
  recoveryTime: result.metrics.recoveryTime,
  dataIntegrity: result.metrics.dataIntegrity,
  rollbackExecuted: result.rollbackExecuted
});
```

#### Execute Regional Disaster Simulation

```typescript
const regionalResult = await enhancedChaosEngineering.executeExperiment({
  id: 'regional-failure-001',
  name: 'US-East-1 Regional Failure',
  description: 'Simulate complete regional failure',
  type: 'regional',
  severity: 'critical',
  targetResources: {
    regions: ['us-east-1']
  },
  parameters: {
    duration: 600000, // 10 minutes
    intensity: 100,
    automaticRollback: true,
    approvalRequired: true
  },
  preChecks: [
    async () => verifySecondaryRegionReady(),
    async () => verifyGlobalClusterHealthy()
  ],
  postChecks: [
    async () => verifyTrafficFailedOver(),
    async () => verifyDataConsistency()
  ],
  rollbackPlan: [
    async () => restorePrimaryRegion()
  ]
});
```

#### Emergency Stop

```typescript
// Stop all active experiments immediately
await enhancedChaosEngineering.emergencyStop();
```

### Monitoring and Alerts

#### Get Comprehensive DR Status

```typescript
const status = await enhancedDisasterRecoveryService.getDisasterRecoveryStatus();

console.log({
  backups: {
    total: status.backups.total,
    last24Hours: status.backups.recent24h,
    crossRegion: status.backups.crossRegion,
    encrypted: status.backups.encrypted,
    oldestSnapshot: status.backups.oldestSnapshot,
    newestSnapshot: status.backups.newestSnapshot
  },
  replication: {
    multiAzEnabled: status.replication.multiAzEnabled,
    readReplicas: status.replication.readReplicas,
    replicationLagSeconds: status.replication.replicationLagSeconds,
    crossRegionReplicas: status.replication.crossRegionReplicas
  },
  recovery: {
    rpo: status.recovery.rpo, // Recovery Point Objective (minutes)
    rto: status.recovery.rto, // Recovery Time Objective (minutes)
    lastSuccessfulBackup: status.recovery.lastSuccessfulBackup,
    lastValidation: status.recovery.lastValidation
  },
  compliance: {
    backupRetentionMet: status.compliance.backupRetentionMet,
    encryptionEnabled: status.compliance.encryptionEnabled,
    multiRegionEnabled: status.compliance.multiRegionEnabled,
    complianceScore: status.compliance.complianceScore
  }
});
```

#### Get Metrics Summary

```typescript
import { getDRMetricsSummary } from '@/lib/utils/metrics';

const metrics = await getDRMetricsSummary();
console.log({
  totalOperations: metrics.operations.total,
  systemHealth: metrics.health,
  replicationStatus: metrics.replication,
  errorCount: metrics.errors.total
});
```

#### Circuit Breaker Status

```typescript
import { getCircuitBreakerStats } from '@/lib/utils/errorHandling';

const stats = getCircuitBreakerStats();
console.log(stats);
// {
//   'createSnapshot': { state: 'CLOSED', failures: 0, successes: 150 },
//   'restoreFromSnapshot': { state: 'OPEN', failures: 5, lastFailureTime: '...' }
// }
```

### Maintenance Operations

#### Cleanup Old Snapshots

```typescript
const deletedCount = await enhancedDisasterRecoveryService.cleanupOldSnapshots(
  30 // Retention days
);
console.log(`Deleted ${deletedCount} old snapshots`);
```

#### Validate All Recent Backups

```typescript
const backups = await enhancedDisasterRecoveryService.getDisasterRecoveryStatus();
const recentSnapshots = backups.backups.recent24h;

for (const snapshot of recentSnapshots) {
  const validation = await enhancedDisasterRecoveryService.validateBackup(
    snapshot.snapshotId,
    snapshot.region
  );
  
  if (!validation.valid) {
    console.error(`Invalid backup: ${snapshot.snapshotId}`, validation.issues);
  }
}
```

## Recovery Procedures

### 1. Database Recovery

#### From Latest Snapshot

```typescript
// Get latest valid snapshot
const status = await enhancedDisasterRecoveryService.getDisasterRecoveryStatus();
const latestSnapshot = status.backups.newestSnapshot;

// Restore with validation
const restoredId = await enhancedDisasterRecoveryService.restoreFromSnapshot(
  latestSnapshot.snapshotId,
  {
    targetInstanceId: 'prod-db-restored',
    instanceClass: 'db.r5.4xlarge',
    multiAz: true,
    performanceInsightsEnabled: true,
    deletionProtection: true
  }
);

// Validate restored instance
const validation = await enhancedDisasterRecoveryService.validateBackup(
  latestSnapshot.snapshotId,
  'us-east-1'
);

if (validation.valid) {
  // Update DNS/application configuration
  await updateDNSRecords(restoredId);
}
```

### 2. Regional Failover

```typescript
// 1. Verify secondary region health
const secondaryHealth = await checkRegionHealth('us-west-2');
if (secondaryHealth.status !== 'healthy') {
  throw new Error('Secondary region not ready for failover');
}

// 2. Promote read replica in secondary region
const rds = new RDSClient({ region: 'us-west-2' });
await rds.send(new PromoteReadReplicaCommand({
  DBInstanceIdentifier: 'prod-db-replica-west'
}));

// 3. Update global cluster primary
await enhancedDisasterRecoveryService.updateGlobalClusterPrimary(
  'manufacturing-global',
  'us-west-2'
);

// 4. Update Route53 health checks and DNS
await updateRoute53HealthChecks('us-west-2');
await updateDNSFailover('us-west-2');

// 5. Verify application connectivity
const appHealth = await verifyApplicationHealth();
assert(appHealth.allServicesHealthy === true);
```

### 3. Point-in-Time Recovery

```typescript
// Restore to specific point in time
const targetTime = new Date('2024-01-15T10:30:00Z');

const restoredInstance = await enhancedDisasterRecoveryService.restoreToPointInTime(
  'prod-db',
  targetTime,
  {
    targetInstanceId: 'prod-db-pitr',
    useLatestRestorableTime: false
  }
);
```

## Best Practices

### 1. Backup Strategy

- **Frequency**: 
  - Production: Every 6 hours
  - Staging: Every 12 hours
  - Development: Daily

- **Retention**:
  - Daily backups: 7 days
  - Weekly backups: 4 weeks
  - Monthly backups: 12 months
  - Yearly backups: 7 years (compliance)

- **Validation**:
  - Validate all backups within 1 hour of creation
  - Weekly validation of random historical backups
  - Monthly full restore test

- **Cross-Region**:
  - All production backups replicated to 2+ regions
  - Use different availability zones
  - Implement S3 lifecycle policies

### 2. Testing Schedule

- **Daily**:
  - Automated backup validation
  - Health check monitoring

- **Weekly**:
  - Database failover test (maintenance window)
  - Read replica promotion test

- **Monthly**:
  - Infrastructure chaos experiments
  - Network failure simulations
  - Application-level chaos

- **Quarterly**:
  - Full regional failover simulation
  - Complete disaster recovery drill
  - Runbook validation

- **Annually**:
  - Multi-region disaster simulation
  - Compliance audit
  - Recovery time validation

### 3. Monitoring and Alerting

Set up CloudWatch alarms for:

```typescript
// Critical alerts
- Backup failure (immediate)
- Validation failure (immediate)
- Replication lag > 5 minutes (immediate)
- Recovery time > RTO (immediate)
- Circuit breaker open (immediate)

// Warning alerts
- Backup age > 12 hours (warning)
- Storage usage > 85% (warning)
- High error rate (warning)
- Compliance score < 80% (warning)

// Info alerts
- Successful chaos experiments
- Backup lifecycle transitions
- Maintenance operations
```

### 4. Security Best Practices

- **Encryption**:
  - All snapshots encrypted with KMS
  - Use separate KMS keys per region
  - Rotate encryption keys annually

- **Access Control**:
  - IAM roles with least privilege
  - MFA for critical operations
  - Audit trail for all DR operations

- **Network Security**:
  - Private subnets for restored instances
  - Security group restrictions
  - VPC endpoint for S3 access

### 5. Cost Optimization

- **Lifecycle Management**:
  ```typescript
  {
    hot: 0-30 days (STANDARD),
    warm: 31-90 days (STANDARD_IA),
    cold: 91-180 days (GLACIER),
    archive: 181+ days (DEEP_ARCHIVE)
  }
  ```

- **Snapshot Optimization**:
  - Incremental snapshots
  - Compression enabled
  - Deduplicated storage

- **Resource Tagging**:
  - Cost allocation tags
  - Automated cleanup policies
  - Budget alerts

## Compliance

### SOX Compliance

- **Controls**:
  - Automated backup verification
  - Immutable audit logs
  - Separation of duties
  - Change management process

- **Documentation**:
  - All DR operations logged
  - Quarterly compliance reports
  - Annual audit preparation

### ISO 27001

- **Requirements**:
  - Business continuity planning
  - Regular testing schedule
  - Documented procedures
  - Continuous improvement

- **Implementation**:
  - Automated DR testing
  - Metrics-driven improvement
  - Regular risk assessments

### GDPR

- **Data Protection**:
  - Encrypted backups
  - Data residency controls
  - Right to erasure implementation
  - Cross-border transfer compliance

- **Implementation**:
  ```typescript
  // Delete user data from all backups
  await enhancedDisasterRecoveryService.deleteUserDataFromBackups(
    userId,
    ['us-east-1', 'us-west-2', 'eu-west-1']
  );
  ```

## Troubleshooting

### Common Issues

1. **Snapshot Creation Fails**
   ```
   Error: InsufficientDBInstanceCapacity
   Solution: Increase instance storage or clean up old data
   ```

2. **Cross-Region Copy Fails**
   ```
   Error: KMSKeyNotAccessible
   Solution: Grant cross-region KMS access in key policy
   ```

3. **Validation Timeout**
   ```
   Error: Validation instance timeout
   Solution: Increase validation timeout or use larger instance class
   ```

4. **Circuit Breaker Open**
   ```
   Error: CIRCUIT_BREAKER_OPEN
   Solution: Check recent failures, wait for reset timeout
   ```

5. **Chaos Experiment Approval Required**
   ```
   Error: APPROVAL_REQUIRED
   Solution: Set CHAOS_APPROVAL_KEY environment variable
   ```

### Debug Commands

```bash
# Check AWS credentials
aws sts get-caller-identity

# List recent snapshots
aws rds describe-db-snapshots --region us-east-1 \
  --query 'DBSnapshots[?SnapshotCreateTime>=`2024-01-15`]'

# Check replication status
aws rds describe-db-instances --db-instance-identifier prod-db \
  --query 'DBInstances[0].StatusInfos'

# View DynamoDB state table
aws dynamodb scan --table-name DisasterRecoveryState \
  --filter-expression "attribute_exists(operationId)"

# Check circuit breaker status
curl http://localhost:3000/api/dr/circuit-breakers

# View chaos experiment history
aws dynamodb query --table-name DisasterRecoveryState \
  --index-name TypeStatusIndex \
  --key-condition-expression "#type = :type" \
  --expression-attribute-names '{"#type": "type"}' \
  --expression-attribute-values '{":type": {"S": "chaos"}}'
```

## Metrics and KPIs

### Key Performance Indicators

- **Backup Success Rate**: Target > 99.9%
- **Validation Success Rate**: Target > 99.5%
- **RTO Achievement**: Target < 30 minutes
- **RPO Achievement**: Target < 15 minutes
- **Chaos Experiment Success**: Target > 95%
- **Automatic Recovery Rate**: Target > 90%
- **Cross-Region Replication Lag**: Target < 5 minutes
- **Compliance Score**: Target > 95%

### Prometheus Metrics

```
# Backup metrics
dr_operation_total{operation="backup",status="success"}
dr_operation_duration_seconds{operation="backup",quantile="0.99"}
dr_backup_size_gb{type="snapshot",region="us-east-1"}

# Validation metrics
dr_operation_total{operation="validation",status="success"}
dr_operation_duration_seconds{operation="validation",quantile="0.99"}

# Recovery metrics
dr_operation_total{operation="restore",status="success"}
dr_operation_duration_seconds{operation="restore",quantile="0.99"}

# Replication metrics
dr_replication_lag_seconds{source="primary",target="replica"}

# Chaos metrics
dr_operation_total{operation="chaos_database",status="success"}
dr_custom_recovery_time{experiment_type="database"}

# Health metrics
dr_system_health{component="database"}
dr_errors_total{operation="backup",error_code="TIMEOUT"}
```

### CloudWatch Dashboards

Create custom dashboards with:
- Backup operation trends
- Validation success rates
- Recovery time histograms
- Replication lag graphs
- Chaos experiment results
- System health overview
- Cost tracking

## Support

For issues or questions:

1. **Check Logs**:
   ```bash
   # Application logs
   kubectl logs -f deployment/dr-service

   # CloudWatch logs
   aws logs tail /aws/lambda/dr-validate-backup --follow

   # DynamoDB streams
   aws dynamodbstreams describe-stream --stream-arn <stream-arn>
   ```

2. **Review Documentation**:
   - This guide
   - AWS service documentation
   - Runbook procedures

3. **Contact Teams**:
   - DevOps: For infrastructure issues
   - Security: For access/encryption issues
   - Architecture: For design questions

4. **Escalation**:
   - AWS Support (Enterprise)
   - On-call engineer
   - Incident commander