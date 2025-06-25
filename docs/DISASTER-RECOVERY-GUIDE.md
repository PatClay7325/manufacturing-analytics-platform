# Disaster Recovery Implementation Guide

## Overview

This guide documents the production-ready disaster recovery implementation for the Manufacturing Analytics Platform. The system provides comprehensive backup, replication, and failover capabilities using AWS services.

## Components

### 1. DisasterRecoveryService (`src/lib/disaster-recovery/DisasterRecoveryService.ts`)

The main service providing:
- **Automated Backups**: Scheduled RDS snapshots with cross-region replication
- **Multi-AZ Support**: Enable high availability within a region
- **Global Clusters**: Aurora global database for active-active replication
- **S3 Replication**: Cross-region backup file replication
- **Monitoring**: Real-time metrics and health status

### 2. RealChaosEngineering (`src/lib/testing/RealChaosEngineering.ts`)

Production chaos engineering for:
- **Database Failover**: Test RDS Multi-AZ failover
- **Infrastructure Chaos**: EC2 instance termination and recovery
- **Regional Failover**: Complete regional disaster simulation
- **Network Chaos**: Load balancer and network failure injection
- **Application Chaos**: Application-level fault injection

### 3. HealthCheckManager (`src/lib/health/HealthCheckManager.ts`)

Unified health monitoring for:
- Database connectivity
- Redis availability
- API responsiveness
- Memory and disk usage
- External service dependencies

## Prerequisites

### AWS SDK Installation

```bash
npm install @aws-sdk/client-rds @aws-sdk/client-ec2 @aws-sdk/client-s3 \
  @aws-sdk/client-elastic-load-balancing-v2 @aws-sdk/client-auto-scaling
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

# Backup Configuration
DR_BACKUP_INTERVAL_HOURS=6
DR_TARGET_REGIONS=us-west-2,eu-west-1
DR_METADATA_BUCKET=manufacturing-dr-metadata
DR_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# S3 Replication
S3_REPLICATION_ROLE_ARN=arn:aws:iam::123456789012:role/s3-replication-role

# Chaos Engineering
CHAOS_EC2_IDS=i-0123456789abcdef0,i-0fedcba9876543210
CHAOS_ASG_NAMES=manufacturing-api-asg,manufacturing-worker-asg
CHAOS_APPROVAL_KEY=your-approval-key-for-critical-experiments

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
API_URL=https://api.manufacturing.example.com
OLLAMA_BASE_URL=http://ollama.manufacturing.internal:11434
```

## Usage

### Backup Operations

#### Create Manual Snapshot
```bash
npm run dr:backup
```

#### Programmatic Backup
```typescript
import { disasterRecoveryService } from '@/lib/disaster-recovery/DisasterRecoveryService';

// Create snapshot with cross-region replication
const snapshotId = await disasterRecoveryService.createSnapshot('prod-db', {
  crossRegionBackup: true,
  targetRegions: ['us-west-2', 'eu-west-1'],
  encryptionKey: 'arn:aws:kms:us-east-1:123456789012:key/...',
  tags: {
    Environment: 'production',
    Purpose: 'scheduled-backup'
  }
});
```

#### Enable Multi-AZ
```typescript
await disasterRecoveryService.enableMultiAz('prod-db');
```

#### Create Global Cluster
```typescript
await disasterRecoveryService.createGlobalCluster(
  'manufacturing-global',
  'primary-cluster-id'
);
```

### Disaster Recovery Testing

#### Run Database Failover Test
```bash
npm run dr:chaos:database
```

#### Run Full Disaster Simulation
```bash
npm run dr:chaos:disaster
```

#### Programmatic Chaos Experiments
```typescript
import { realChaosEngineering } from '@/lib/testing/RealChaosEngineering';

// Database failover test
await realChaosEngineering.executeExperiment({
  id: 'db-failover-test',
  name: 'RDS Multi-AZ Failover',
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
    notificationChannels: ['slack-critical']
  },
  preChecks: [
    async () => verifyBackupsExist(),
    async () => verifyReplicationHealthy()
  ],
  postChecks: [
    async () => verifyDataIntegrity(),
    async () => verifyAllServicesRecovered()
  ],
  rollbackPlan: [
    async () => restoreFromSnapshot()
  ]
});
```

### Monitoring and Alerts

#### Get DR Status
```typescript
const status = await disasterRecoveryService.getDisasterRecoveryStatus();
console.log({
  backups: status.backups,
  replication: status.replication,
  recovery: {
    rpo: status.recovery.rpo, // Recovery Point Objective
    rto: status.recovery.rto  // Recovery Time Objective
  }
});
```

#### Health Checks
```typescript
const health = await healthCheckManager.getHealth();
if (health.status !== 'healthy') {
  console.error('System unhealthy:', health.checks);
}
```

## Recovery Procedures

### 1. Database Recovery

#### From Snapshot
```typescript
await disasterRecoveryService.restoreFromSnapshot(snapshotId, {
  targetInstanceId: 'restored-db',
  instanceClass: 'db.r5.2xlarge',
  multiAz: true,
  vpcSecurityGroupIds: ['sg-12345678'],
  dbSubnetGroupName: 'prod-subnet-group'
});
```

### 2. Regional Failover

1. **Verify Secondary Region Health**
   ```typescript
   const health = await captureSystemState('us-west-2');
   if (health.status !== 'healthy') {
     throw new Error('Secondary region not ready');
   }
   ```

2. **Promote Read Replica**
   ```typescript
   await rds.send(new PromoteReadReplicaCommand({
     DBInstanceIdentifier: 'prod-db-replica-west'
   }));
   ```

3. **Update DNS/Route53**
   - Update CNAME records to point to new primary
   - Update application configuration

4. **Verify Application Connectivity**
   ```typescript
   const appHealth = await healthCheckManager.getHealth();
   assert(appHealth.status === 'healthy');
   ```

### 3. Emergency Stop

If chaos experiments need to be stopped immediately:
```typescript
await realChaosEngineering.emergencyStop();
```

## Best Practices

### 1. Backup Strategy
- **Frequency**: Every 6 hours for production
- **Retention**: 7 days for daily, 4 weeks for weekly, 12 months for monthly
- **Cross-Region**: Always replicate to at least one other region
- **Encryption**: Use KMS keys for all backups

### 2. Testing Schedule
- **Weekly**: Database failover tests (maintenance window)
- **Monthly**: Infrastructure chaos experiments
- **Quarterly**: Full regional failover simulation
- **Annually**: Complete disaster recovery drill

### 3. Monitoring
- Set up CloudWatch alarms for:
  - Backup failures
  - Replication lag > 5 minutes
  - Recovery time > RTO
  - Failed health checks

### 4. Documentation
- Keep runbooks updated
- Document all custom recovery procedures
- Maintain contact lists for escalation
- Review and update quarterly

## Compliance

### SOX Compliance
- All backups are encrypted and immutable
- Audit trails for all DR operations
- Automated testing with documented results

### ISO 27001
- Regular DR testing schedule
- Documented recovery procedures
- Continuous improvement process

### GDPR
- Data residency controls
- Right to erasure implementation
- Cross-border transfer compliance

## Troubleshooting

### Common Issues

1. **Snapshot Creation Fails**
   ```
   Error: InsufficientDBInstanceCapacity
   Solution: Ensure instance has sufficient storage
   ```

2. **Cross-Region Copy Fails**
   ```
   Error: KMSKeyNotAccessible
   Solution: Grant cross-region KMS access
   ```

3. **Health Check Timeouts**
   ```
   Error: Health check timeout
   Solution: Increase timeout or check network connectivity
   ```

### Debug Commands

```bash
# Check AWS credentials
aws sts get-caller-identity

# List RDS snapshots
aws rds describe-db-snapshots --region us-east-1

# Check replication status
aws rds describe-db-instances --db-instance-identifier prod-db

# View chaos experiment logs
npm run dr:chaos:database 2>&1 | tee chaos.log
```

## Metrics and KPIs

### Key Metrics
- **Backup Success Rate**: Target > 99.9%
- **RTO Achievement**: Target < 30 minutes
- **RPO Achievement**: Target < 15 minutes
- **Chaos Experiment Success**: Target > 95%
- **Automatic Recovery Rate**: Target > 90%

### Prometheus Metrics
```
# Backup metrics
dr_backup_operations_total{operation="snapshot",status="success"}
dr_backup_size_bytes{type="snapshot",region="us-east-1"}

# Recovery metrics
dr_recovery_time_seconds{operation="restore"}
dr_replication_lag_seconds{source="primary",target="replica"}

# Chaos metrics
chaos_experiments_real_total{type="database",severity="medium",status="success"}
system_recovery_time_real_seconds{experiment_type="database",severity="medium"}
```

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Contact the DevOps team
4. Escalate to AWS Support if needed