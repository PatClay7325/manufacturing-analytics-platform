/**
 * Type definitions for Enterprise Deployment Manager
 * Following strict TypeScript patterns with discriminated unions
 */

// Deployment Status using discriminated unions for type safety
export type DeploymentStatus = 
  | { type: 'pending'; queuePosition: number }
  | { type: 'validating'; progress: number }
  | { type: 'deploying'; progress: number; stage: DeploymentStage }
  | { type: 'completed'; completedAt: Date; duration: number }
  | { type: 'failed'; error: string; failedAt: Date; canRetry: boolean }
  | { type: 'rollingback'; progress: number }
  | { type: 'cancelled'; cancelledAt: Date; reason: string }

export type DeploymentStage = 
  | 'preparing'
  | 'pulling-images'
  | 'creating-resources'
  | 'configuring-mesh'
  | 'running-tests'
  | 'switching-traffic'
  | 'cleaning-up'

export interface DeploymentStats {
  totalDeployments: number
  successfulDeployments: number
  failedDeployments: number
  pendingDeployments: number
  averageDeploymentTime: number
  deploymentSuccessRate: number
  lastDeploymentAt: Date | null
  complianceScore: number
  securityScore: number
}

export interface ActiveDeployment {
  id: string
  name: string
  version: string
  environment: Environment
  namespace: string
  status: DeploymentStatus
  strategy: DeploymentStrategy
  createdAt: Date
  updatedAt: Date
  createdBy: string
  metadata: DeploymentMetadata
  health?: HealthStatus
  compliance?: ComplianceResult
  security?: SecurityResult
}

export type Environment = 'development' | 'staging' | 'production'
export type DeploymentStrategy = 'blue-green' | 'canary' | 'rolling' | 'recreate'

export interface DeploymentMetadata {
  labels: Record<string, string>
  annotations: Record<string, string>
  gitCommit?: string
  gitBranch?: string
  buildNumber?: string
  triggeredBy: 'manual' | 'ci-cd' | 'auto-scaling' | 'rollback'
}

export interface HealthStatus {
  healthy: boolean
  score: number // 0-100
  checks: HealthCheck[]
  lastCheckedAt: Date
}

export interface HealthCheck {
  name: string
  status: 'passing' | 'warning' | 'critical'
  message: string
  details?: any
}

export interface ComplianceResult {
  compliant: boolean
  frameworks: ComplianceFramework[]
  overallScore: number
  reportDate: Date
}

export interface ComplianceFramework {
  name: 'SOC2' | 'HIPAA' | 'GDPR'
  compliant: boolean
  score: number
  issues: ComplianceIssue[]
}

export interface ComplianceIssue {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  remediation: string
}

export interface SecurityResult {
  secure: boolean
  score: number
  vulnerabilities: SecurityVulnerability[]
  lastScanAt: Date
}

export interface SecurityVulnerability {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  description: string
  affected: string[]
  fixAvailable: boolean
}

// Form types for creating deployments
export interface DeploymentFormData {
  name: string
  version: string
  environment: Environment
  namespace: string
  strategy: DeploymentStrategy
  replicas: number
  resources: ResourceRequirements
  healthCheck: HealthCheckConfig
  rollbackOnFailure: boolean
  requireApproval: boolean
  notificationChannels: string[]
}

export interface ResourceRequirements {
  requests: {
    cpu: string
    memory: string
  }
  limits: {
    cpu: string
    memory: string
  }
}

export interface HealthCheckConfig {
  enabled: boolean
  initialDelaySeconds: number
  periodSeconds: number
  timeoutSeconds: number
  successThreshold: number
  failureThreshold: number
  path?: string
  port?: number
}

// API Response types
export interface DeploymentResponse {
  deployment: ActiveDeployment
  warnings?: string[]
}

export interface DeploymentListResponse {
  deployments: ActiveDeployment[]
  total: number
  page: number
  pageSize: number
}

// WebSocket event types for real-time updates
export type DeploymentEvent = 
  | { type: 'deployment.created'; deployment: ActiveDeployment }
  | { type: 'deployment.updated'; deployment: ActiveDeployment }
  | { type: 'deployment.deleted'; deploymentId: string }
  | { type: 'deployment.status_changed'; deploymentId: string; status: DeploymentStatus }
  | { type: 'deployment.health_changed'; deploymentId: string; health: HealthStatus }
  | { type: 'deployment.compliance_changed'; deploymentId: string; compliance: ComplianceResult }
  | { type: 'deployment.security_changed'; deploymentId: string; security: SecurityResult }

// Metric types for monitoring
export interface DeploymentMetrics {
  deploymentRate: MetricDataPoint[]
  successRate: MetricDataPoint[]
  avgDeploymentTime: MetricDataPoint[]
  errorRate: MetricDataPoint[]
  rollbackRate: MetricDataPoint[]
  resourceUtilization: {
    cpu: MetricDataPoint[]
    memory: MetricDataPoint[]
  }
}

export interface MetricDataPoint {
  timestamp: Date
  value: number
  label?: string
}