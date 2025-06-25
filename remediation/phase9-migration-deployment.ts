#!/usr/bin/env ts-node
/**
 * Phase 9: Migration and Deployment
 * Implements zero-downtime migration, blue-green deployment, and validation gates
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

// =====================================================
// MIGRATION ORCHESTRATOR
// =====================================================

interface MigrationStep {
  name: string;
  description: string;
  execute: () => Promise<void>;
  rollback: () => Promise<void>;
  validate: () => Promise<boolean>;
  estimatedDuration: number; // minutes
}

interface MigrationPlan {
  version: string;
  steps: MigrationStep[];
  preChecks: Array<() => Promise<boolean>>;
  postChecks: Array<() => Promise<boolean>>;
}

export class MigrationOrchestrator extends EventEmitter {
  private executedSteps: MigrationStep[] = [];
  private migrationState: 'idle' | 'running' | 'failed' | 'completed' = 'idle';
  private checkpoints: Map<string, any> = new Map();

  constructor(private plan: MigrationPlan) {
    super();
  }

  /**
   * Execute migration with automatic rollback on failure
   */
  async execute(): Promise<void> {
    console.log(`🚀 Starting migration to version ${this.plan.version}\n`);
    this.migrationState = 'running';
    
    try {
      // Run pre-checks
      console.log('📋 Running pre-migration checks...');
      await this.runPreChecks();
      
      // Create backup point
      console.log('\n💾 Creating backup...');
      await this.createBackup();
      
      // Execute migration steps
      for (let i = 0; i < this.plan.steps.length; i++) {
        const step = this.plan.steps[i];
        console.log(`\n🔄 Step ${i + 1}/${this.plan.steps.length}: ${step.name}`);
        console.log(`   ${step.description}`);
        
        const startTime = Date.now();
        
        try {
          // Execute step
          await step.execute();
          
          // Validate step
          console.log('   ✓ Validating...');
          const valid = await step.validate();
          
          if (!valid) {
            throw new Error(`Validation failed for step: ${step.name}`);
          }
          
          const duration = (Date.now() - startTime) / 1000 / 60;
          console.log(`   ✅ Completed in ${duration.toFixed(1)} minutes`);
          
          this.executedSteps.push(step);
          this.emit('stepCompleted', step, i + 1, this.plan.steps.length);
          
          // Save checkpoint
          await this.saveCheckpoint(step.name);
          
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          this.migrationState = 'failed';
          
          // Rollback
          await this.rollback();
          throw error;
        }
      }
      
      // Run post-checks
      console.log('\n📋 Running post-migration checks...');
      await this.runPostChecks();
      
      this.migrationState = 'completed';
      console.log('\n✅ Migration completed successfully!');
      
    } catch (error) {
      console.error(`\n❌ Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback migration
   */
  async rollback(): Promise<void> {
    console.log('\n⏪ Starting rollback...');
    
    // Rollback in reverse order
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const step = this.executedSteps[i];
      console.log(`   Rolling back: ${step.name}`);
      
      try {
        await step.rollback();
        console.log(`   ✅ Rolled back: ${step.name}`);
      } catch (error) {
        console.error(`   ❌ Rollback failed for ${step.name}: ${error.message}`);
        // Continue with other rollbacks
      }
    }
    
    // Restore from backup
    await this.restoreBackup();
    
    console.log('✅ Rollback completed');
  }

  private async runPreChecks(): Promise<void> {
    for (const check of this.plan.preChecks) {
      const result = await check();
      if (!result) {
        throw new Error('Pre-migration check failed');
      }
    }
    console.log('✅ All pre-checks passed');
  }

  private async runPostChecks(): Promise<void> {
    for (const check of this.plan.postChecks) {
      const result = await check();
      if (!result) {
        throw new Error('Post-migration check failed');
      }
    }
    console.log('✅ All post-checks passed');
  }

  private async createBackup(): Promise<void> {
    const backupName = `backup_${this.plan.version}_${Date.now()}`;
    
    // Database backup
    await execAsync(`pg_dump ${process.env.DATABASE_URL} > backups/${backupName}.sql`);
    
    // Application state backup
    const appState = {
      version: process.env.APP_VERSION,
      timestamp: new Date(),
      config: this.getAppConfig()
    };
    
    fs.writeFileSync(
      `backups/${backupName}_state.json`,
      JSON.stringify(appState, null, 2)
    );
    
    this.checkpoints.set('backup', backupName);
    console.log(`✅ Backup created: ${backupName}`);
  }

  private async restoreBackup(): Promise<void> {
    const backupName = this.checkpoints.get('backup');
    if (!backupName) {
      console.warn('No backup found to restore');
      return;
    }
    
    console.log(`Restoring from backup: ${backupName}`);
    
    // Restore database
    await execAsync(`psql ${process.env.DATABASE_URL} < backups/${backupName}.sql`);
    
    console.log('✅ Backup restored');
  }

  private async saveCheckpoint(stepName: string): Promise<void> {
    const checkpoint = {
      step: stepName,
      timestamp: new Date(),
      state: await this.captureSystemState()
    };
    
    this.checkpoints.set(stepName, checkpoint);
  }

  private async captureSystemState(): Promise<any> {
    // Capture current system state for rollback
    return {
      dbVersion: await this.getDatabaseVersion(),
      activeConnections: await this.getActiveConnections(),
      configHash: this.getConfigHash()
    };
  }

  private async getDatabaseVersion(): Promise<string> {
    const result = await prisma.$queryRaw<[{ version: string }]>`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
    `;
    return result[0]?.version || 'unknown';
  }

  private async getActiveConnections(): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
    return Number(result[0].count);
  }

  private getAppConfig(): any {
    return {
      nodeEnv: process.env.NODE_ENV,
      apiUrl: process.env.API_URL,
      features: {
        realtimeData: process.env.FEATURE_REALTIME === 'true',
        aiChat: process.env.FEATURE_AI_CHAT === 'true',
        advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
      }
    };
  }

  private getConfigHash(): string {
    const config = this.getAppConfig();
    return crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
  }
}

// =====================================================
// DATABASE MIGRATION
// =====================================================

export class DatabaseMigration {
  /**
   * Create migration plan for database schema changes
   */
  static createPlan(): MigrationPlan {
    const steps: MigrationStep[] = [
      {
        name: 'Add TimescaleDB Extensions',
        description: 'Enable TimescaleDB and required extensions',
        estimatedDuration: 1,
        execute: async () => {
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`;
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_cron`;
        },
        rollback: async () => {
          // Extensions are safe to leave
        },
        validate: async () => {
          const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM pg_extension 
            WHERE extname IN ('timescaledb', 'pg_stat_statements', 'pg_cron')
          `;
          return Number(result[0].count) >= 3;
        }
      },
      
      {
        name: 'Migrate to Hypertables',
        description: 'Convert time-series tables to hypertables',
        estimatedDuration: 10,
        execute: async () => {
          // Create new hypertables
          await prisma.$executeRaw`
            CREATE TABLE production_metrics_new (LIKE production_metrics INCLUDING ALL)
          `;
          
          await prisma.$executeRaw`
            SELECT create_hypertable('production_metrics_new', 'time', 
              chunk_time_interval => INTERVAL '1 day',
              if_not_exists => TRUE)
          `;
          
          // Copy data in batches
          await this.copyDataInBatches('production_metrics', 'production_metrics_new');
          
          // Swap tables
          await prisma.$executeRaw`ALTER TABLE production_metrics RENAME TO production_metrics_old`;
          await prisma.$executeRaw`ALTER TABLE production_metrics_new RENAME TO production_metrics`;
        },
        rollback: async () => {
          await prisma.$executeRaw`ALTER TABLE production_metrics RENAME TO production_metrics_new`;
          await prisma.$executeRaw`ALTER TABLE production_metrics_old RENAME TO production_metrics`;
          await prisma.$executeRaw`DROP TABLE production_metrics_new`;
        },
        validate: async () => {
          const result = await prisma.$queryRaw<[{ is_hypertable: boolean }]>`
            SELECT COUNT(*) > 0 as is_hypertable
            FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'production_metrics'
          `;
          return result[0].is_hypertable;
        }
      },
      
      {
        name: 'Create Continuous Aggregates',
        description: 'Set up pre-calculated aggregates for performance',
        estimatedDuration: 5,
        execute: async () => {
          await prisma.$executeRaw`
            CREATE MATERIALIZED VIEW production_hourly
            WITH (timescaledb.continuous) AS
            SELECT 
              time_bucket('1 hour', time) AS hour,
              equipment_id,
              equipment_code,
              site_code,
              AVG(oee) as avg_oee,
              SUM(units_produced) as total_units,
              SUM(units_good) as good_units
            FROM production_metrics
            GROUP BY hour, equipment_id, equipment_code, site_code
            WITH NO DATA
          `;
          
          await prisma.$executeRaw`
            SELECT add_continuous_aggregate_policy('production_hourly',
              start_offset => INTERVAL '3 hours',
              end_offset => INTERVAL '1 hour',
              schedule_interval => INTERVAL '30 minutes')
          `;
        },
        rollback: async () => {
          await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS production_hourly CASCADE`;
        },
        validate: async () => {
          const result = await prisma.$queryRaw<[{ exists: boolean }]>`
            SELECT EXISTS (
              SELECT 1 FROM timescaledb_information.continuous_aggregates
              WHERE view_name = 'production_hourly'
            ) as exists
          `;
          return result[0].exists;
        }
      },
      
      {
        name: 'Add Compression Policies',
        description: 'Enable automatic data compression',
        estimatedDuration: 2,
        execute: async () => {
          await prisma.$executeRaw`
            ALTER TABLE production_metrics SET (
              timescaledb.compress,
              timescaledb.compress_segmentby = 'equipment_id',
              timescaledb.compress_orderby = 'time DESC'
            )
          `;
          
          await prisma.$executeRaw`
            SELECT add_compression_policy('production_metrics', INTERVAL '7 days')
          `;
        },
        rollback: async () => {
          await prisma.$executeRaw`
            SELECT remove_compression_policy('production_metrics')
          `;
        },
        validate: async () => {
          const result = await prisma.$queryRaw<[{ has_policy: boolean }]>`
            SELECT COUNT(*) > 0 as has_policy
            FROM timescaledb_information.compression_settings
            WHERE hypertable_name = 'production_metrics'
          `;
          return result[0].has_policy;
        }
      },
      
      {
        name: 'Migrate Indexes',
        description: 'Create optimized indexes for new schema',
        estimatedDuration: 3,
        execute: async () => {
          // Drop old indexes
          await prisma.$executeRaw`DROP INDEX IF EXISTS idx_old_production_metrics`;
          
          // Create new optimized indexes
          await prisma.$executeRaw`
            CREATE INDEX idx_production_metrics_equipment_time 
            ON production_metrics (equipment_id, time DESC)
          `;
          
          await prisma.$executeRaw`
            CREATE INDEX idx_production_metrics_site_time 
            ON production_metrics (site_code, time DESC)
          `;
          
          await prisma.$executeRaw`
            CREATE INDEX idx_production_metrics_oee 
            ON production_metrics (time DESC, oee) 
            WHERE oee IS NOT NULL
          `;
        },
        rollback: async () => {
          // Indexes can be safely left in place
        },
        validate: async () => {
          const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM pg_indexes
            WHERE tablename = 'production_metrics'
            AND indexname LIKE 'idx_production_metrics_%'
          `;
          return Number(result[0].count) >= 3;
        }
      }
    ];

    return {
      version: '2.0.0',
      steps,
      preChecks: [
        async () => {
          // Check database size
          const result = await prisma.$queryRaw<[{ size_gb: number }]>`
            SELECT pg_database_size(current_database()) / 1024 / 1024 / 1024 as size_gb
          `;
          const sizeGB = result[0].size_gb;
          console.log(`   Database size: ${sizeGB.toFixed(2)} GB`);
          return sizeGB < 500; // Ensure we have space
        },
        async () => {
          // Check active connections
          const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'
          `;
          const activeConnections = Number(result[0].count);
          console.log(`   Active connections: ${activeConnections}`);
          return activeConnections < 50;
        },
        async () => {
          // Check replication lag if applicable
          try {
            const result = await prisma.$queryRaw<[{ lag_seconds: number }]>`
              SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag_seconds
            `;
            const lag = result[0].lag_seconds || 0;
            console.log(`   Replication lag: ${lag.toFixed(1)} seconds`);
            return lag < 10;
          } catch {
            // Not a replica
            return true;
          }
        }
      ],
      postChecks: [
        async () => {
          // Verify data integrity
          const result = await prisma.$queryRaw<[{ matches: boolean }]>`
            SELECT 
              (SELECT COUNT(*) FROM production_metrics) = 
              (SELECT COUNT(*) FROM production_metrics_old) as matches
          `;
          return result[0].matches;
        },
        async () => {
          // Check query performance
          const start = Date.now();
          await prisma.$queryRaw`
            SELECT equipment_id, AVG(oee) 
            FROM production_metrics 
            WHERE time >= NOW() - INTERVAL '1 day'
            GROUP BY equipment_id
          `;
          const duration = Date.now() - start;
          console.log(`   Query performance: ${duration}ms`);
          return duration < 1000;
        }
      ]
    };
  }

  private static async copyDataInBatches(
    sourceTable: string,
    targetTable: string,
    batchSize: number = 10000
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const result = await prisma.$executeRaw`
        INSERT INTO ${targetTable}
        SELECT * FROM ${sourceTable}
        ORDER BY time
        LIMIT ${batchSize}
        OFFSET ${offset}
      `;
      
      hasMore = result > 0;
      offset += batchSize;
      
      if (offset % 100000 === 0) {
        console.log(`      Copied ${offset} rows...`);
      }
    }
  }
}

// =====================================================
// BLUE-GREEN DEPLOYMENT
// =====================================================

interface DeploymentConfig {
  blueEnvironment: string;
  greenEnvironment: string;
  loadBalancer: string;
  healthCheckUrl: string;
  warmupDuration: number; // seconds
  validationDuration: number; // seconds
}

export class BlueGreenDeployment {
  constructor(private config: DeploymentConfig) {}

  /**
   * Deploy new version using blue-green strategy
   */
  async deploy(version: string): Promise<void> {
    console.log(`🚀 Starting blue-green deployment of version ${version}\n`);
    
    try {
      // 1. Identify current active environment
      const currentActive = await this.getActiveEnvironment();
      const targetEnvironment = currentActive === 'blue' ? 'green' : 'blue';
      
      console.log(`📍 Current active: ${currentActive}`);
      console.log(`🎯 Deploy target: ${targetEnvironment}\n`);
      
      // 2. Deploy to inactive environment
      console.log(`📦 Deploying to ${targetEnvironment}...`);
      await this.deployToEnvironment(targetEnvironment, version);
      
      // 3. Run health checks
      console.log('\n🏥 Running health checks...');
      await this.waitForHealthy(targetEnvironment);
      
      // 4. Warm up new environment
      console.log('\n🔥 Warming up new environment...');
      await this.warmupEnvironment(targetEnvironment);
      
      // 5. Run smoke tests
      console.log('\n🧪 Running smoke tests...');
      await this.runSmokeTests(targetEnvironment);
      
      // 6. Switch traffic gradually
      console.log('\n🔄 Switching traffic...');
      await this.switchTraffic(currentActive, targetEnvironment);
      
      // 7. Monitor new environment
      console.log('\n📊 Monitoring new environment...');
      await this.monitorEnvironment(targetEnvironment);
      
      // 8. Decommission old environment
      console.log('\n🗑️ Decommissioning old environment...');
      await this.decommissionEnvironment(currentActive);
      
      console.log(`\n✅ Deployment completed successfully!`);
      console.log(`   New active environment: ${targetEnvironment}`);
      console.log(`   Version: ${version}`);
      
    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error.message}`);
      await this.rollbackDeployment();
      throw error;
    }
  }

  private async getActiveEnvironment(): Promise<string> {
    // Check load balancer configuration
    const { stdout } = await execAsync(
      `aws elb describe-load-balancers --load-balancer-names ${this.config.loadBalancer}`
    );
    
    const config = JSON.parse(stdout);
    const activeTargets = config.LoadBalancerDescriptions[0].Instances;
    
    // Determine which environment based on instance tags
    // Simplified for demonstration
    return activeTargets.length > 0 ? 'blue' : 'green';
  }

  private async deployToEnvironment(environment: string, version: string): Promise<void> {
    const envConfig = environment === 'blue' 
      ? this.config.blueEnvironment 
      : this.config.greenEnvironment;
    
    // Deploy using Kubernetes
    await execAsync(`
      kubectl set image deployment/manufacturing-app \
        app=manufacturing-app:${version} \
        --namespace=${environment}
    `);
    
    // Wait for rollout
    await execAsync(`
      kubectl rollout status deployment/manufacturing-app \
        --namespace=${environment} \
        --timeout=10m
    `);
  }

  private async waitForHealthy(environment: string): Promise<void> {
    const maxAttempts = 60;
    const delayMs = 5000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const healthy = await this.checkHealth(environment);
        if (healthy) {
          console.log('   ✅ Health check passed');
          return;
        }
      } catch (error) {
        console.log(`   Attempt ${attempt}/${maxAttempts}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Health checks failed after maximum attempts');
  }

  private async checkHealth(environment: string): Promise<boolean> {
    const envUrl = environment === 'blue' 
      ? this.config.blueEnvironment 
      : this.config.greenEnvironment;
    
    const response = await fetch(`${envUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check returned ${response.status}`);
    }
    
    const health = await response.json();
    return health.status === 'healthy';
  }

  private async warmupEnvironment(environment: string): Promise<void> {
    const envUrl = environment === 'blue' 
      ? this.config.blueEnvironment 
      : this.config.greenEnvironment;
    
    // Send warmup requests
    const warmupEndpoints = [
      '/api/equipment/status',
      '/api/oee/summary',
      '/api/alerts?status=active',
      '/api/metrics/production?range=1h'
    ];
    
    for (const endpoint of warmupEndpoints) {
      try {
        await fetch(`${envUrl}${endpoint}`);
        console.log(`   ✓ Warmed up ${endpoint}`);
      } catch (error) {
        console.warn(`   ⚠️ Failed to warm up ${endpoint}`);
      }
    }
    
    // Wait for cache population
    await new Promise(resolve => setTimeout(resolve, this.config.warmupDuration * 1000));
  }

  private async runSmokeTests(environment: string): Promise<void> {
    const envUrl = environment === 'blue' 
      ? this.config.blueEnvironment 
      : this.config.greenEnvironment;
    
    const tests = [
      {
        name: 'API Response',
        test: async () => {
          const response = await fetch(`${envUrl}/api/health`);
          return response.ok;
        }
      },
      {
        name: 'Database Connectivity',
        test: async () => {
          const response = await fetch(`${envUrl}/api/health/db`);
          const data = await response.json();
          return data.connected;
        }
      },
      {
        name: 'Authentication',
        test: async () => {
          const response = await fetch(`${envUrl}/api/auth/verify`, {
            headers: { 'Authorization': 'Bearer test-token' }
          });
          return response.status === 401; // Should reject test token
        }
      },
      {
        name: 'Real-time Data',
        test: async () => {
          const response = await fetch(`${envUrl}/api/metrics/realtime`);
          return response.ok;
        }
      }
    ];
    
    for (const { name, test } of tests) {
      const passed = await test();
      console.log(`   ${passed ? '✅' : '❌'} ${name}`);
      if (!passed) {
        throw new Error(`Smoke test failed: ${name}`);
      }
    }
  }

  private async switchTraffic(
    fromEnvironment: string,
    toEnvironment: string
  ): Promise<void> {
    // Gradual traffic switch using weighted routing
    const steps = [
      { weight: 10, duration: 60 },   // 10% for 1 minute
      { weight: 25, duration: 120 },  // 25% for 2 minutes
      { weight: 50, duration: 180 },  // 50% for 3 minutes
      { weight: 75, duration: 120 },  // 75% for 2 minutes
      { weight: 100, duration: 0 }    // 100% (complete)
    ];
    
    for (const { weight, duration } of steps) {
      console.log(`   Routing ${weight}% traffic to ${toEnvironment}`);
      
      // Update load balancer weights
      await this.updateLoadBalancerWeights(
        fromEnvironment,
        toEnvironment,
        100 - weight,
        weight
      );
      
      if (duration > 0) {
        // Monitor during transition
        await this.monitorTrafficSwitch(toEnvironment, duration);
      }
    }
  }

  private async updateLoadBalancerWeights(
    blueEnv: string,
    greenEnv: string,
    blueWeight: number,
    greenWeight: number
  ): Promise<void> {
    // Update AWS ALB target group weights
    await execAsync(`
      aws elbv2 modify-rule \
        --rule-arn ${this.config.loadBalancer} \
        --actions Type=forward,ForwardConfig={TargetGroups=[\
          {TargetGroupArn=${blueEnv},Weight=${blueWeight}},\
          {TargetGroupArn=${greenEnv},Weight=${greenWeight}}\
        ]}
    `);
  }

  private async monitorTrafficSwitch(
    environment: string,
    durationSeconds: number
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    
    while (Date.now() < endTime) {
      const metrics = await this.getEnvironmentMetrics(environment);
      
      // Check error rate
      if (metrics.errorRate > 0.01) { // 1% threshold
        throw new Error(`High error rate detected: ${metrics.errorRate * 100}%`);
      }
      
      // Check response time
      if (metrics.p95ResponseTime > 1000) { // 1 second threshold
        throw new Error(`High response time detected: ${metrics.p95ResponseTime}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10s
    }
  }

  private async monitorEnvironment(environment: string): Promise<void> {
    console.log(`   Monitoring for ${this.config.validationDuration} seconds...`);
    
    const startTime = Date.now();
    const endTime = startTime + this.config.validationDuration * 1000;
    
    while (Date.now() < endTime) {
      const metrics = await this.getEnvironmentMetrics(environment);
      
      console.log(`   📊 Metrics: Error rate: ${(metrics.errorRate * 100).toFixed(2)}%, ` +
                  `P95: ${metrics.p95ResponseTime}ms, ` +
                  `RPS: ${metrics.requestsPerSecond}`);
      
      // Validate metrics
      if (metrics.errorRate > 0.05) { // 5% threshold for rollback
        throw new Error('Error rate exceeded threshold');
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30s
    }
  }

  private async getEnvironmentMetrics(environment: string): Promise<any> {
    // Query Prometheus or CloudWatch for metrics
    const envUrl = environment === 'blue' 
      ? this.config.blueEnvironment 
      : this.config.greenEnvironment;
    
    const response = await fetch(`${envUrl}/metrics`);
    const metrics = await response.json();
    
    return {
      errorRate: metrics.http_requests_errors_total / metrics.http_requests_total,
      p95ResponseTime: metrics.http_request_duration_seconds_p95 * 1000,
      requestsPerSecond: metrics.http_requests_rate
    };
  }

  private async decommissionEnvironment(environment: string): Promise<void> {
    // Scale down old environment
    await execAsync(`
      kubectl scale deployment/manufacturing-app \
        --replicas=0 \
        --namespace=${environment}
    `);
    
    console.log(`   ✅ ${environment} environment scaled down`);
  }

  private async rollbackDeployment(): Promise<void> {
    console.log('\n⏪ Rolling back deployment...');
    
    // Switch traffic back to original environment
    const currentActive = await this.getActiveEnvironment();
    const originalActive = currentActive === 'blue' ? 'green' : 'blue';
    
    await this.updateLoadBalancerWeights(
      originalActive === 'blue' ? originalActive : currentActive,
      originalActive === 'green' ? originalActive : currentActive,
      originalActive === 'blue' ? 100 : 0,
      originalActive === 'green' ? 100 : 0
    );
    
    console.log('✅ Rollback completed');
  }
}

// =====================================================
// KUBERNETES DEPLOYMENT
// =====================================================

export class KubernetesDeployment {
  /**
   * Generate Kubernetes manifests for production deployment
   */
  static generateManifests(version: string): void {
    const manifests = {
      'namespace.yaml': `
apiVersion: v1
kind: Namespace
metadata:
  name: manufacturing-analytics
---
apiVersion: v1
kind: Namespace
metadata:
  name: manufacturing-analytics-staging
`,

      'configmap.yaml': `
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: manufacturing-analytics
data:
  NODE_ENV: "production"
  API_PORT: "3000"
  ENABLE_METRICS: "true"
  ENABLE_TRACING: "true"
`,

      'secret.yaml': `
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: manufacturing-analytics
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@timescaledb:5432/manufacturing"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "\${JWT_SECRET}"
  ENCRYPTION_KEY: "\${ENCRYPTION_KEY}"
`,

      'deployment.yaml': `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
  labels:
    app: manufacturing-analytics
    version: "${version}"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: manufacturing-analytics
  template:
    metadata:
      labels:
        app: manufacturing-analytics
        version: "${version}"
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - manufacturing-analytics
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: manufacturing-analytics:${version}
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
        envFrom:
        - configMapRef:
            name: app-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: app-data
      - name: logs
        emptyDir: {}
`,

      'service.yaml': `
apiVersion: v1
kind: Service
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
  labels:
    app: manufacturing-analytics
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
  selector:
    app: manufacturing-analytics
`,

      'ingress.yaml': `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - analytics.manufacturing.com
    secretName: manufacturing-tls
  rules:
  - host: analytics.manufacturing.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: manufacturing-app
            port:
              number: 80
`,

      'hpa.yaml': `
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: manufacturing-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
`,

      'pdb.yaml': `
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: manufacturing-analytics
`,

      'networkpolicy.yaml': `
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: manufacturing-app
  namespace: manufacturing-analytics
spec:
  podSelector:
    matchLabels:
      app: manufacturing-analytics
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: cache
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
`
    };

    // Save manifests
    const deployDir = 'k8s/production';
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }

    for (const [filename, content] of Object.entries(manifests)) {
      fs.writeFileSync(path.join(deployDir, filename), content.trim());
      console.log(`📄 Generated ${filename}`);
    }

    // Generate kustomization file
    const kustomization = `
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: manufacturing-analytics

resources:
  - namespace.yaml
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - hpa.yaml
  - pdb.yaml
  - networkpolicy.yaml

images:
  - name: manufacturing-analytics
    newTag: ${version}

replicas:
  - name: manufacturing-app
    count: 3

configMapGenerator:
  - name: app-version
    literals:
      - VERSION=${version}
      - DEPLOY_TIME=${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(deployDir, 'kustomization.yaml'), kustomization.trim());
    console.log(`\n✅ Kubernetes manifests generated in ${deployDir}/`);
  }
}

// =====================================================
// DEPLOYMENT PIPELINE
// =====================================================

export class DeploymentPipeline {
  /**
   * Execute complete deployment pipeline
   */
  static async deploy(version: string, environment: 'staging' | 'production'): Promise<void> {
    console.log(`🚀 Starting deployment pipeline for version ${version} to ${environment}\n`);

    try {
      // 1. Run tests
      console.log('🧪 Running tests...');
      await this.runTests();
      
      // 2. Build application
      console.log('\n🔨 Building application...');
      await this.buildApplication(version);
      
      // 3. Build and push Docker image
      console.log('\n🐳 Building Docker image...');
      await this.buildDockerImage(version);
      
      // 4. Run security scan
      console.log('\n🔒 Running security scan...');
      await this.runSecurityScan(version);
      
      // 5. Deploy to environment
      console.log(`\n📦 Deploying to ${environment}...`);
      
      if (environment === 'staging') {
        await this.deployToStaging(version);
      } else {
        // Run database migration
        console.log('\n🗄️ Running database migration...');
        const migrationPlan = DatabaseMigration.createPlan();
        const migrator = new MigrationOrchestrator(migrationPlan);
        await migrator.execute();
        
        // Blue-green deployment
        console.log('\n🔄 Starting blue-green deployment...');
        const blueGreen = new BlueGreenDeployment({
          blueEnvironment: 'https://blue.analytics.manufacturing.com',
          greenEnvironment: 'https://green.analytics.manufacturing.com',
          loadBalancer: 'manufacturing-alb',
          healthCheckUrl: '/health',
          warmupDuration: 60,
          validationDuration: 300
        });
        await blueGreen.deploy(version);
      }
      
      // 6. Run post-deployment tests
      console.log('\n✅ Running post-deployment tests...');
      await this.runPostDeploymentTests(environment);
      
      // 7. Update monitoring
      console.log('\n📊 Updating monitoring dashboards...');
      await this.updateMonitoring(version, environment);
      
      console.log(`\n🎉 Deployment completed successfully!`);
      console.log(`   Version: ${version}`);
      console.log(`   Environment: ${environment}`);
      console.log(`   Time: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error.message}`);
      throw error;
    }
  }

  private static async runTests(): Promise<void> {
    await execAsync('npm run test:unit');
    await execAsync('npm run test:integration');
    await execAsync('npm run test:e2e');
    console.log('   ✅ All tests passed');
  }

  private static async buildApplication(version: string): Promise<void> {
    process.env.APP_VERSION = version;
    await execAsync('npm run build');
    console.log('   ✅ Build completed');
  }

  private static async buildDockerImage(version: string): Promise<void> {
    await execAsync(`docker build -t manufacturing-analytics:${version} .`);
    await execAsync(`docker tag manufacturing-analytics:${version} registry.manufacturing.com/analytics:${version}`);
    await execAsync(`docker push registry.manufacturing.com/analytics:${version}`);
    console.log('   ✅ Docker image pushed');
  }

  private static async runSecurityScan(version: string): Promise<void> {
    // Run Trivy security scan
    const { stdout } = await execAsync(`trivy image manufacturing-analytics:${version}`);
    
    if (stdout.includes('CRITICAL')) {
      throw new Error('Critical vulnerabilities found');
    }
    
    console.log('   ✅ Security scan passed');
  }

  private static async deployToStaging(version: string): Promise<void> {
    await execAsync(`
      kubectl set image deployment/manufacturing-app \
        app=manufacturing-analytics:${version} \
        --namespace=manufacturing-analytics-staging
    `);
    
    await execAsync(`
      kubectl rollout status deployment/manufacturing-app \
        --namespace=manufacturing-analytics-staging
    `);
    
    console.log('   ✅ Deployed to staging');
  }

  private static async runPostDeploymentTests(environment: string): Promise<void> {
    const baseUrl = environment === 'staging' 
      ? 'https://staging.analytics.manufacturing.com'
      : 'https://analytics.manufacturing.com';
    
    // Run smoke tests
    const endpoints = ['/health', '/api/status', '/api/metrics'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error(`Health check failed for ${endpoint}`);
      }
    }
    
    console.log('   ✅ Post-deployment tests passed');
  }

  private static async updateMonitoring(version: string, environment: string): Promise<void> {
    // Update Grafana annotations
    await fetch('http://grafana.monitoring.com/api/annotations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `Deployed version ${version} to ${environment}`,
        tags: ['deployment', environment],
        time: Date.now()
      })
    });
    
    console.log('   ✅ Monitoring updated');
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  const command = process.argv[2];
  const version = process.argv[3] || '2.0.0';
  const environment = (process.argv[4] || 'staging') as 'staging' | 'production';

  switch (command) {
    case 'generate-k8s':
      KubernetesDeployment.generateManifests(version);
      break;
      
    case 'migrate':
      const migrationPlan = DatabaseMigration.createPlan();
      const migrator = new MigrationOrchestrator(migrationPlan);
      await migrator.execute();
      break;
      
    case 'deploy':
      await DeploymentPipeline.deploy(version, environment);
      break;
      
    default:
      console.log(`
Usage:
  npm run deploy generate-k8s [version]     Generate Kubernetes manifests
  npm run deploy migrate                    Run database migration
  npm run deploy deploy [version] [env]     Deploy application

Examples:
  npm run deploy generate-k8s 2.0.0
  npm run deploy migrate
  npm run deploy deploy 2.0.0 staging
  npm run deploy deploy 2.0.0 production
      `);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  MigrationOrchestrator,
  DatabaseMigration,
  BlueGreenDeployment,
  KubernetesDeployment,
  DeploymentPipeline
};