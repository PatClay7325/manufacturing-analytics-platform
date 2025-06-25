/**
 * Enterprise Deployment Types - Complete Type System
 */

export interface KubernetesConfig {
  namespace: string;
  manifest: any;
  updateStrategy: 'RollingUpdate' | 'Recreate';
  retryPolicy: RetryPolicy;
  rolloutTimeout: number;
  healthCheck: HealthCheckConfig;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface HealthCheckConfig {
  path: string;
  port: number;
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface ServiceMeshConfig {
  provider: 'istio' | 'linkerd' | 'consul-connect';
  trafficSplitting: TrafficSplittingConfig;
  circuitBreaker: CircuitBreakerConfig;
  retryPolicy: MeshRetryPolicy;
  fallbackStrategy: 'k8s-service' | 'nginx' | 'haproxy';
}

export interface TrafficSplittingConfig {
  host: string;
  namespace: string;
  stableSubset: string;
  canarySubset: string;
  trafficPercentages: number[];
  rampUpDuration: number;
  metricsThresholds: MetricsThreshold[];
}

export interface CircuitBreakerConfig {
  consecutiveErrors: number;
  interval: number;
  baseEjectionTime: number;
  maxEjectionPercent: number;
  minHealthyPercent: number;
}

export interface MeshRetryPolicy {
  attempts: number;
  perTryTimeout: string;
  retryOn: string[];
  retriableStatusCodes: number[];
}

export interface MetricsThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  action: 'continue' | 'rollback' | 'pause';
}

export interface MultiRegionConfig {
  regions: RegionConfig[];
  coordination: CoordinationStrategy;
  failover: FailoverConfig;
  dataReplication: DataReplicationConfig;
}

export interface RegionConfig {
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'on-premise';
  kubeconfig: string;
  manifest: any;
  namespace: string;
  priority: number;
  dependencies: string[];
}

export interface CoordinationStrategy {
  type: 'sequential' | 'parallel' | 'leader-follower';
  stateSync: StateSyncConfig;
  rollbackStrategy: 'all-or-nothing' | 'region-by-region' | 'continue-on-failure';
}

export interface StateSyncConfig {
  backend: 'etcd' | 'consul' | 'redis-cluster' | 's3';
  syncInterval: number;
  conflictResolution: 'last-write-wins' | 'vector-clock' | 'manual';
}

export interface FailoverConfig {
  automaticFailover: boolean;
  healthCheckInterval: number;
  failoverThreshold: number;
  trafficShiftDuration: number;
}

export interface DataReplicationConfig {
  strategy: 'active-active' | 'active-passive' | 'multi-master';
  consistencyLevel: 'strong' | 'eventual' | 'session';
  backupStrategy: BackupStrategy;
}

export interface BackupStrategy {
  frequency: string;
  retention: string;
  crossRegionBackup: boolean;
  encryptionEnabled: boolean;
}

export interface ComplianceConfig {
  frameworks: ComplianceFramework[];
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
  dataRetention: DataRetentionPolicy;
  encryption: EncryptionConfig;
}

export interface ComplianceFramework {
  name: 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'FedRAMP' | 'ISO27001';
  version: string;
  controls: ComplianceControl[];
  validationEnabled: boolean;
}

export interface ComplianceControl {
  id: string;
  description: string;
  mandatory: boolean;
  automatedCheck: boolean;
  validationScript?: string;
}

export interface DataRetentionPolicy {
  auditLogs: string;
  metrics: string;
  personalData: string;
  deploymentArtifacts: string;
}

export interface EncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  keyRotationDays: number;
  keyManagementService: 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault';
}

export interface MonitoringConfig {
  providers: MonitoringProvider[];
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  dashboards: DashboardConfig[];
  sla: SLAConfig;
}

export interface MonitoringProvider {
  name: 'prometheus' | 'datadog' | 'newrelic' | 'splunk' | 'elastic';
  config: any;
  enabled: boolean;
  fallback?: string;
}

export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
  description: string;
  thresholds: MetricsThreshold[];
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  channels: NotificationChannel[];
  escalation: EscalationPolicy;
  runbook: string;
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'pagerduty' | 'webhook' | 'sms';
  config: any;
  enabled: boolean;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  timeout: number;
  autoResolve: boolean;
}

export interface EscalationLevel {
  level: number;
  delay: number;
  targets: string[];
  actions: string[];
}

export interface DashboardConfig {
  name: string;
  provider: string;
  template: string;
  variables: any;
  autoRefresh: number;
}

export interface SLAConfig {
  availability: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  measurementWindow: string;
}

export interface ChaosEngineeringConfig {
  enabled: boolean;
  scenarios: ChaosScenario[];
  schedule: ChaosSchedule;
  safeguards: ChaosSafeguards;
}

export interface ChaosScenario {
  name: string;
  type: 'pod-failure' | 'network-partition' | 'resource-stress' | 'latency-injection';
  config: any;
  duration: number;
  probability: number;
  targets: ChaosTarget[];
}

export interface ChaosTarget {
  selector: any;
  namespace: string;
  percentage: number;
}

export interface ChaosSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  onDemand: boolean;
}

export interface ChaosSafeguards {
  maxConcurrentExperiments: number;
  businessHoursOnly: boolean;
  rollbackOnFailure: boolean;
  healthCheckRequired: boolean;
}

export interface DeploymentResult {
  id: string;
  status: 'success' | 'failed' | 'partial' | 'rollback';
  regions: RegionResult[];
  duration: number;
  metrics: DeploymentMetrics;
  compliance: ComplianceResult;
  artifacts: DeploymentArtifact[];
  rollbackPlan?: RollbackPlan;
}

export interface RegionResult {
  region: string;
  status: 'success' | 'failed' | 'pending' | 'rollback';
  startTime: string;
  endTime?: string;
  error?: string;
  logs: string[];
  healthChecks: HealthCheckResult[];
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  responseTime: number;
  details: any;
  timestamp: string;
}

export interface DeploymentMetrics {
  deploymentDuration: number;
  rolloutDuration: number;
  healthCheckDuration: number;
  resourceUtilization: ResourceUtilization;
  errorRate: number;
  successRate: number;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface ComplianceResult {
  framework: string;
  passed: boolean;
  controls: ControlResult[];
  score: number;
  recommendations: string[];
}

export interface ControlResult {
  id: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DeploymentArtifact {
  type: 'manifest' | 'image' | 'config' | 'logs';
  location: string;
  checksum: string;
  signature?: string;
  metadata: any;
}

export interface RollbackPlan {
  automatic: boolean;
  triggers: RollbackTrigger[];
  steps: RollbackStep[];
  validation: RollbackValidation;
}

export interface RollbackTrigger {
  metric: string;
  threshold: number;
  duration: number;
  action: 'immediate' | 'staged' | 'manual-confirm';
}

export interface RollbackStep {
  order: number;
  action: string;
  timeout: number;
  validation: string;
  rollbackOnFailure: boolean;
}

export interface RollbackValidation {
  healthChecks: string[];
  metricsValidation: string[];
  userAcceptanceTests: string[];
}