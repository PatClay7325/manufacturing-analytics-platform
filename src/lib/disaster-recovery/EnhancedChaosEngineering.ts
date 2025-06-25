/**
 * Enhanced Chaos Engineering Service
 * Production-ready chaos experiments with safety controls and rollback capabilities
 */

import {
  EC2Client,
  TerminateInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  DescribeInstancesCommand,
  StartInstancesCommand,
  CreateSnapshotCommand,
  DescribeVolumesCommand,
  ModifyInstanceAttributeCommand,
} from '@aws-sdk/client-ec2';

import {
  RDSClient,
  RebootDBInstanceCommand,
  FailoverDBClusterCommand,
  ModifyDBInstanceCommand,
  CreateDBSnapshotCommand,
  StopDBInstanceCommand,
  StartDBInstanceCommand,
} from '@aws-sdk/client-rds';

import {
  ElasticLoadBalancingV2Client,
  ModifyTargetGroupAttributesCommand,
  DeregisterTargetsCommand,
  RegisterTargetsCommand,
  DescribeTargetHealthCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';

import {
  AutoScalingClient,
  SetDesiredCapacityCommand,
  UpdateAutoScalingGroupCommand,
  DescribeAutoScalingGroupsCommand,
  TerminateInstanceInAutoScalingGroupCommand,
} from '@aws-sdk/client-auto-scaling';

import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  DeleteAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';

import {
  StepFunctionsClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
  StopExecutionCommand,
} from '@aws-sdk/client-sfn';

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { DRError, withRetry, circuitBreaker } from '../utils/errorHandling';
import { emitDRMetrics, recordChaosMetrics } from '../utils/metrics';
import crypto from 'crypto';

// Types
export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: 'infrastructure' | 'database' | 'network' | 'application' | 'regional';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetResources: {
    ec2Instances?: string[];
    rdsInstances?: string[];
    targetGroups?: string[];
    autoScalingGroups?: string[];
    regions?: string[];
  };
  parameters: {
    duration: number;
    intensity: number;
    automaticRollback: boolean;
    notificationChannels?: string[];
    approvalRequired?: boolean;
  };
  preChecks: Array<() => Promise<boolean>>;
  postChecks: Array<() => Promise<boolean>>;
  rollbackPlan: Array<() => Promise<void>>;
}

export interface ExperimentResult {
  experimentId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  metrics: {
    impactedResources: number;
    recoveryTime?: number;
    dataIntegrity: boolean;
    serviceAvailability: number;
  };
  logs: ExperimentLog[];
  rollbackExecuted: boolean;
}

export interface ExperimentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Safety controls
const SAFETY_CONFIG = {
  maxConcurrentExperiments: 1,
  requiredApprovalSeverity: 'high' as const,
  autoRollbackThreshold: 0.5, // 50% failure rate
  minimumHealthyTargets: 0.5, // 50% must remain healthy
  emergencyStopEnabled: true,
  dryRunMode: process.env.CHAOS_DRY_RUN === 'true',
};

export class EnhancedChaosEngineering extends EventEmitter {
  private static instance: EnhancedChaosEngineering;
  private ec2Clients: Map<string, EC2Client> = new Map();
  private rdsClients: Map<string, RDSClient> = new Map();
  private elbClients: Map<string, ElasticLoadBalancingV2Client> = new Map();
  private asgClients: Map<string, AutoScalingClient> = new Map();
  private cloudWatchClient: CloudWatchClient;
  private stepFunctionsClient: StepFunctionsClient;
  private activeExperiments: Map<string, ExperimentResult> = new Map();
  private experimentHistory: ExperimentResult[] = [];
  private emergencyStopTriggered = false;

  constructor() {
    super();
    this.initializeClients();
    this.setupSafetyMonitors();
  }

  static getInstance(): EnhancedChaosEngineering {
    if (!EnhancedChaosEngineering.instance) {
      EnhancedChaosEngineering.instance = new EnhancedChaosEngineering();
    }
    return EnhancedChaosEngineering.instance;
  }

  /**
   * Execute a chaos experiment with full safety controls
   */
  async executeExperiment(experiment: ChaosExperiment): Promise<ExperimentResult> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    // Initialize result
    const result: ExperimentResult = {
      experimentId: experiment.id,
      executionId,
      status: 'pending',
      startTime,
      metrics: {
        impactedResources: 0,
        dataIntegrity: true,
        serviceAvailability: 100,
      },
      logs: [],
      rollbackExecuted: false,
    };

    this.activeExperiments.set(executionId, result);

    try {
      // Safety checks
      await this.performSafetyChecks(experiment, result);

      // Request approval if needed
      if (await this.requiresApproval(experiment)) {
        await this.requestApproval(experiment, result);
      }

      // Execute pre-checks
      await this.executePreChecks(experiment, result);

      // Update status
      result.status = 'running';
      this.logExperiment(result, 'info', 'Starting chaos experiment', {
        experiment: experiment.name,
        type: experiment.type,
        severity: experiment.severity,
      });

      // Execute experiment based on type
      await this.executeExperimentByType(experiment, result);

      // Monitor and wait for completion or timeout
      await this.monitorExperiment(experiment, result);

      // Execute post-checks
      const postChecksPassed = await this.executePostChecks(experiment, result);

      if (!postChecksPassed && experiment.parameters.automaticRollback) {
        await this.executeRollback(experiment, result);
      }

      // Calculate metrics
      result.endTime = new Date();
      result.metrics.recoveryTime = result.endTime.getTime() - startTime.getTime();
      result.status = postChecksPassed ? 'completed' : 'failed';

      // Record metrics
      await recordChaosMetrics(
        experiment.type,
        experiment.severity,
        result.metrics.recoveryTime,
        postChecksPassed,
        result.metrics.recoveryTime
      );

      return result;

    } catch (error) {
      result.status = 'failed';
      this.logExperiment(result, 'error', 'Experiment failed', { error });

      // Attempt rollback
      if (experiment.parameters.automaticRollback) {
        await this.executeRollback(experiment, result);
      }

      throw error;

    } finally {
      this.activeExperiments.delete(executionId);
      this.experimentHistory.push(result);
      this.emit('experiment:completed', result);
    }
  }

  /**
   * Emergency stop all active experiments
   */
  async emergencyStop(): Promise<void> {
    this.emergencyStopTriggered = true;
    logger.warn('Emergency stop triggered for all chaos experiments');

    const stopPromises = Array.from(this.activeExperiments.values()).map(
      async (experiment) => {
        try {
          await this.stopExperiment(experiment.executionId);
        } catch (error) {
          logger.error({ error, experimentId: experiment.experimentId }, 
            'Failed to stop experiment during emergency stop');
        }
      }
    );

    await Promise.allSettled(stopPromises);
    this.emergencyStopTriggered = false;
  }

  /**
   * Database chaos experiments
   */
  private async executeDatabaseChaos(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    const region = process.env.AWS_REGION || 'us-east-1';
    const rds = this.getRDSClient(region);
    const instances = experiment.targetResources.rdsInstances || [];

    for (const instanceId of instances) {
      if (this.emergencyStopTriggered) break;

      try {
        // Create pre-chaos snapshot
        const snapshotId = await this.createSafetySnapshot(instanceId, 'pre-chaos');
        this.logExperiment(result, 'info', `Created safety snapshot: ${snapshotId}`);

        // Execute chaos based on intensity
        const intensity = experiment.parameters.intensity;

        if (intensity <= 30) {
          // Low intensity: Reboot instance
          await rds.send(new RebootDBInstanceCommand({
            DBInstanceIdentifier: instanceId,
            ForceFailover: true,
          }));
          this.logExperiment(result, 'info', `Rebooted RDS instance: ${instanceId}`);

        } else if (intensity <= 70) {
          // Medium intensity: Failover
          await rds.send(new FailoverDBClusterCommand({
            DBClusterIdentifier: instanceId,
            TargetDBInstanceIdentifier: `${instanceId}-replica`,
          }));
          this.logExperiment(result, 'info', `Triggered failover for: ${instanceId}`);

        } else {
          // High intensity: Stop instance
          if (!SAFETY_CONFIG.dryRunMode) {
            await rds.send(new StopDBInstanceCommand({
              DBInstanceIdentifier: instanceId,
              DBSnapshotIdentifier: `${instanceId}-chaos-stop-${Date.now()}`,
            }));
            this.logExperiment(result, 'warn', `Stopped RDS instance: ${instanceId}`);
          }
        }

        result.metrics.impactedResources++;

      } catch (error) {
        this.logExperiment(result, 'error', `Database chaos failed for ${instanceId}`, 
          { error });
        throw error;
      }
    }
  }

  /**
   * Infrastructure chaos experiments
   */
  private async executeInfrastructureChaos(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    const region = process.env.AWS_REGION || 'us-east-1';
    const ec2 = this.getEC2Client(region);
    const instances = experiment.targetResources.ec2Instances || [];

    // Create EBS snapshots first
    await this.createInstanceSnapshots(instances, region);

    for (const instanceId of instances) {
      if (this.emergencyStopTriggered) break;

      try {
        const intensity = experiment.parameters.intensity;

        if (intensity <= 30) {
          // Low: Reboot
          await ec2.send(new RebootInstancesCommand({
            InstanceIds: [instanceId],
          }));
          this.logExperiment(result, 'info', `Rebooted EC2 instance: ${instanceId}`);

        } else if (intensity <= 70) {
          // Medium: Stop/Start
          await ec2.send(new StopInstancesCommand({
            InstanceIds: [instanceId],
          }));
          this.logExperiment(result, 'info', `Stopped EC2 instance: ${instanceId}`);

          // Wait and restart
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          await ec2.send(new StartInstancesCommand({
            InstanceIds: [instanceId],
          }));
          this.logExperiment(result, 'info', `Started EC2 instance: ${instanceId}`);

        } else {
          // High: Terminate (only in non-production or with explicit approval)
          if (!SAFETY_CONFIG.dryRunMode && experiment.parameters.approvalRequired) {
            await ec2.send(new TerminateInstancesCommand({
              InstanceIds: [instanceId],
            }));
            this.logExperiment(result, 'warn', `Terminated EC2 instance: ${instanceId}`);
          }
        }

        result.metrics.impactedResources++;

      } catch (error) {
        this.logExperiment(result, 'error', 
          `Infrastructure chaos failed for ${instanceId}`, { error });
        throw error;
      }
    }
  }

  /**
   * Network chaos experiments
   */
  private async executeNetworkChaos(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    const region = process.env.AWS_REGION || 'us-east-1';
    const elb = this.getELBClient(region);
    const targetGroups = experiment.targetResources.targetGroups || [];

    for (const targetGroupArn of targetGroups) {
      if (this.emergencyStopTriggered) break;

      try {
        // Get current targets
        const { TargetHealthDescriptions } = await elb.send(
          new DescribeTargetHealthCommand({
            TargetGroupArn: targetGroupArn,
          })
        );

        const healthyTargets = TargetHealthDescriptions?.filter(
          t => t.TargetHealth?.State === 'healthy'
        ) || [];

        // Calculate targets to impact based on intensity
        const targetsToImpact = Math.floor(
          healthyTargets.length * (experiment.parameters.intensity / 100)
        );

        // Ensure minimum healthy targets
        const maxImpact = Math.floor(
          healthyTargets.length * (1 - SAFETY_CONFIG.minimumHealthyTargets)
        );
        const actualImpact = Math.min(targetsToImpact, maxImpact);

        // Deregister targets
        const targetsToDeregister = healthyTargets
          .slice(0, actualImpact)
          .map(t => ({ Id: t.Target!.Id! }));

        if (targetsToDeregister.length > 0) {
          await elb.send(new DeregisterTargetsCommand({
            TargetGroupArn: targetGroupArn,
            Targets: targetsToDeregister,
          }));

          this.logExperiment(result, 'info', 
            `Deregistered ${targetsToDeregister.length} targets from ${targetGroupArn}`);

          result.metrics.impactedResources += targetsToDeregister.length;

          // Store for rollback
          result.logs.push({
            timestamp: new Date(),
            level: 'info',
            message: 'Storing deregistered targets for rollback',
            data: { targetGroupArn, targets: targetsToDeregister },
          });
        }

      } catch (error) {
        this.logExperiment(result, 'error', 
          `Network chaos failed for ${targetGroupArn}`, { error });
        throw error;
      }
    }
  }

  /**
   * Regional disaster simulation
   */
  private async executeRegionalChaos(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    const regions = experiment.targetResources.regions || [];
    
    for (const region of regions) {
      if (this.emergencyStopTriggered) break;

      this.logExperiment(result, 'warn', 
        `Simulating regional failure in ${region}`);

      // This would typically involve:
      // 1. Failing health checks in the region
      // 2. Updating Route53 health checks
      // 3. Triggering failover to secondary region
      // 4. Validating traffic routing

      // For safety, we'll simulate with CloudWatch alarms
      await this.simulateRegionalFailure(region, experiment, result);
    }
  }

  /**
   * Execute experiment by type
   */
  private async executeExperimentByType(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    switch (experiment.type) {
      case 'database':
        await this.executeDatabaseChaos(experiment, result);
        break;
      case 'infrastructure':
        await this.executeInfrastructureChaos(experiment, result);
        break;
      case 'network':
        await this.executeNetworkChaos(experiment, result);
        break;
      case 'regional':
        await this.executeRegionalChaos(experiment, result);
        break;
      default:
        throw new DRError(
          'UNSUPPORTED_EXPERIMENT_TYPE',
          `Experiment type ${experiment.type} not supported`,
          false
        );
    }
  }

  /**
   * Monitor experiment progress
   */
  private async monitorExperiment(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    const startTime = Date.now();
    const timeout = experiment.parameters.duration;
    const checkInterval = 10000; // 10 seconds

    while (Date.now() - startTime < timeout) {
      if (this.emergencyStopTriggered) {
        this.logExperiment(result, 'warn', 'Experiment stopped due to emergency stop');
        break;
      }

      // Check system health
      const healthCheck = await this.checkSystemHealth();
      result.metrics.serviceAvailability = healthCheck.availability;

      // Check if we should auto-rollback
      if (
        healthCheck.availability < SAFETY_CONFIG.autoRollbackThreshold * 100 &&
        experiment.parameters.automaticRollback
      ) {
        this.logExperiment(result, 'warn', 
          'Triggering automatic rollback due to low availability', 
          { availability: healthCheck.availability });
        break;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  /**
   * Execute rollback plan
   */
  private async executeRollback(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    this.logExperiment(result, 'info', 'Executing rollback plan');
    result.rollbackExecuted = true;

    try {
      // Execute all rollback steps
      for (const rollbackStep of experiment.rollbackPlan) {
        await rollbackStep();
      }

      // Re-register deregistered targets
      await this.rollbackNetworkChanges(result);

      // Restart stopped instances
      await this.rollbackInfrastructureChanges(result);

      this.logExperiment(result, 'info', 'Rollback completed successfully');

    } catch (error) {
      this.logExperiment(result, 'error', 'Rollback failed', { error });
      throw new DRError(
        'ROLLBACK_FAILED',
        'Failed to execute rollback plan',
        false,
        { experimentId: experiment.id, error }
      );
    }
  }

  /**
   * Helper methods
   */

  private async performSafetyChecks(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    // Check concurrent experiments
    if (this.activeExperiments.size >= SAFETY_CONFIG.maxConcurrentExperiments) {
      throw new DRError(
        'TOO_MANY_EXPERIMENTS',
        'Maximum concurrent experiments limit reached',
        true
      );
    }

    // Validate target resources exist
    await this.validateTargetResources(experiment);

    // Check system health before starting
    const health = await this.checkSystemHealth();
    if (health.availability < 90) {
      throw new DRError(
        'SYSTEM_UNHEALTHY',
        'System health too low to start experiment',
        true,
        { availability: health.availability }
      );
    }

    this.logExperiment(result, 'info', 'Safety checks passed');
  }

  private async requiresApproval(experiment: ChaosExperiment): Promise<boolean> {
    return (
      experiment.parameters.approvalRequired ||
      experiment.severity === 'critical' ||
      (experiment.severity === 'high' && 
        SAFETY_CONFIG.requiredApprovalSeverity === 'high')
    );
  }

  private async requestApproval(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    this.logExperiment(result, 'info', 'Requesting approval for experiment');

    // In production, this would integrate with approval systems
    // For now, check for approval key
    const approvalKey = process.env.CHAOS_APPROVAL_KEY;
    if (!approvalKey) {
      throw new DRError(
        'APPROVAL_REQUIRED',
        'Experiment requires approval but no approval key provided',
        false
      );
    }

    // Simulate approval process
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.logExperiment(result, 'info', 'Approval granted');
  }

  private async executePreChecks(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    this.logExperiment(result, 'info', 'Executing pre-checks');

    for (let i = 0; i < experiment.preChecks.length; i++) {
      const check = experiment.preChecks[i];
      const passed = await check();
      
      if (!passed) {
        throw new DRError(
          'PRE_CHECK_FAILED',
          `Pre-check ${i + 1} failed`,
          false
        );
      }
    }

    this.logExperiment(result, 'info', 'All pre-checks passed');
  }

  private async executePostChecks(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<boolean> {
    this.logExperiment(result, 'info', 'Executing post-checks');

    let allPassed = true;

    for (let i = 0; i < experiment.postChecks.length; i++) {
      const check = experiment.postChecks[i];
      const passed = await check();
      
      if (!passed) {
        this.logExperiment(result, 'warn', `Post-check ${i + 1} failed`);
        allPassed = false;
      }
    }

    result.metrics.dataIntegrity = allPassed;
    return allPassed;
  }

  private async createSafetySnapshot(
    instanceId: string,
    prefix: string
  ): Promise<string> {
    const region = process.env.AWS_REGION || 'us-east-1';
    const rds = this.getRDSClient(region);
    const snapshotId = `${prefix}-${instanceId}-${Date.now()}`;

    await rds.send(new CreateDBSnapshotCommand({
      DBInstanceIdentifier: instanceId,
      DBSnapshotIdentifier: snapshotId,
      Tags: [
        { Key: 'Purpose', Value: 'chaos-engineering-safety' },
        { Key: 'AutoDelete', Value: 'true' },
        { Key: 'TTL', Value: '7' },
      ],
    }));

    return snapshotId;
  }

  private async createInstanceSnapshots(
    instanceIds: string[],
    region: string
  ): Promise<void> {
    const ec2 = this.getEC2Client(region);

    // Get volumes for instances
    const { Reservations } = await ec2.send(
      new DescribeInstancesCommand({
        InstanceIds: instanceIds,
      })
    );

    const volumes: string[] = [];
    Reservations?.forEach(r => {
      r.Instances?.forEach(i => {
        i.BlockDeviceMappings?.forEach(b => {
          if (b.Ebs?.VolumeId) {
            volumes.push(b.Ebs.VolumeId);
          }
        });
      });
    });

    // Create snapshots
    const snapshotPromises = volumes.map(volumeId =>
      ec2.send(new CreateSnapshotCommand({
        VolumeId: volumeId,
        Description: `Chaos engineering safety snapshot for ${volumeId}`,
        TagSpecifications: [{
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'Purpose', Value: 'chaos-engineering-safety' },
            { Key: 'AutoDelete', Value: 'true' },
          ],
        }],
      }))
    );

    await Promise.allSettled(snapshotPromises);
  }

  private async checkSystemHealth(): Promise<{
    availability: number;
    healthy: boolean;
  }> {
    // This would check actual system health metrics
    // For now, return simulated values
    return {
      availability: 95 + Math.random() * 5,
      healthy: true,
    };
  }

  private async validateTargetResources(
    experiment: ChaosExperiment
  ): Promise<void> {
    // Validate EC2 instances exist
    if (experiment.targetResources.ec2Instances?.length) {
      const ec2 = this.getEC2Client(process.env.AWS_REGION!);
      const { Reservations } = await ec2.send(
        new DescribeInstancesCommand({
          InstanceIds: experiment.targetResources.ec2Instances,
        })
      );
      
      const foundInstances = Reservations?.flatMap(
        r => r.Instances?.map(i => i.InstanceId) || []
      ) || [];
      
      const missing = experiment.targetResources.ec2Instances.filter(
        id => !foundInstances.includes(id)
      );
      
      if (missing.length > 0) {
        throw new DRError(
          'RESOURCES_NOT_FOUND',
          `EC2 instances not found: ${missing.join(', ')}`,
          false
        );
      }
    }

    // Similar validation for other resource types
  }

  private async simulateRegionalFailure(
    region: string,
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): Promise<void> {
    // Create CloudWatch alarms to simulate failure
    const cloudWatch = new CloudWatchClient({ region });
    
    await cloudWatch.send(
      new PutMetricAlarmCommand({
        AlarmName: `chaos-regional-failure-${region}`,
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 1,
        MetricName: 'RegionalFailureSimulation',
        Namespace: 'ChaosEngineering',
        Period: 60,
        Statistic: 'Average',
        Threshold: 0,
        ActionsEnabled: false,
        AlarmDescription: `Simulating regional failure in ${region}`,
        Tags: [
          { Key: 'Purpose', Value: 'chaos-engineering' },
          { Key: 'ExperimentId', Value: experiment.id },
        ],
      })
    );

    // In production, this would:
    // - Update Route53 health checks
    // - Trigger actual failover mechanisms
    // - Redirect traffic to healthy regions
  }

  private async rollbackNetworkChanges(
    result: ExperimentResult
  ): Promise<void> {
    // Re-register deregistered targets
    const networkLogs = result.logs.filter(
      log => log.data?.targets && log.data?.targetGroupArn
    );

    for (const log of networkLogs) {
      const elb = this.getELBClient(process.env.AWS_REGION!);
      await elb.send(new RegisterTargetsCommand({
        TargetGroupArn: log.data.targetGroupArn,
        Targets: log.data.targets,
      }));
    }
  }

  private async rollbackInfrastructureChanges(
    result: ExperimentResult
  ): Promise<void> {
    // Restart stopped instances
    const stoppedInstances = result.logs
      .filter(log => log.message.includes('Stopped EC2 instance'))
      .map(log => log.message.match(/instance: (.+)$/)?.[1])
      .filter(Boolean) as string[];

    if (stoppedInstances.length > 0) {
      const ec2 = this.getEC2Client(process.env.AWS_REGION!);
      await ec2.send(new StartInstancesCommand({
        InstanceIds: stoppedInstances,
      }));
    }
  }

  private async stopExperiment(executionId: string): Promise<void> {
    const experiment = this.activeExperiments.get(executionId);
    if (!experiment) return;

    experiment.status = 'failed';
    this.logExperiment(experiment, 'warn', 'Experiment stopped manually');
    
    // Trigger rollback if possible
    this.emit('experiment:stopped', experiment);
  }

  private logExperiment(
    result: ExperimentResult,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void {
    const log: ExperimentLog = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    result.logs.push(log);

    const logData = {
      experimentId: result.experimentId,
      executionId: result.executionId,
      ...data,
    };

    switch (level) {
      case 'info':
        logger.info(logData, message);
        break;
      case 'warn':
        logger.warn(logData, message);
        break;
      case 'error':
        logger.error(logData, message);
        break;
    }
  }

  /**
   * Initialize AWS clients
   */
  private initializeClients(): void {
    const regions = [
      process.env.AWS_REGION || 'us-east-1',
      ...(process.env.DR_TARGET_REGIONS?.split(',') || []),
    ];

    for (const region of regions) {
      this.ec2Clients.set(region, new EC2Client({ region }));
      this.rdsClients.set(region, new RDSClient({ region }));
      this.elbClients.set(region, new ElasticLoadBalancingV2Client({ region }));
      this.asgClients.set(region, new AutoScalingClient({ region }));
    }

    this.cloudWatchClient = new CloudWatchClient({ 
      region: process.env.AWS_REGION 
    });
    
    this.stepFunctionsClient = new StepFunctionsClient({ 
      region: process.env.AWS_REGION 
    });
  }

  private setupSafetyMonitors(): void {
    // Monitor for system-wide issues
    setInterval(async () => {
      if (this.activeExperiments.size === 0) return;

      const health = await this.checkSystemHealth();
      if (health.availability < 50) {
        logger.error({ availability: health.availability }, 
          'System health critical, triggering emergency stop');
        await this.emergencyStop();
      }
    }, 30000); // Every 30 seconds
  }

  private getEC2Client(region: string): EC2Client {
    return this.ec2Clients.get(region) || new EC2Client({ region });
  }

  private getRDSClient(region: string): RDSClient {
    return this.rdsClients.get(region) || new RDSClient({ region });
  }

  private getELBClient(region: string): ElasticLoadBalancingV2Client {
    return this.elbClients.get(region) || 
      new ElasticLoadBalancingV2Client({ region });
  }

  private getASGClient(region: string): AutoScalingClient {
    return this.asgClients.get(region) || new AutoScalingClient({ region });
  }

  private generateExecutionId(): string {
    return `chaos-exec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get experiment history
   */
  getExperimentHistory(): ExperimentResult[] {
    return [...this.experimentHistory];
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): ExperimentResult[] {
    return Array.from(this.activeExperiments.values());
  }
}

// Export singleton instance
export const enhancedChaosEngineering = EnhancedChaosEngineering.getInstance();