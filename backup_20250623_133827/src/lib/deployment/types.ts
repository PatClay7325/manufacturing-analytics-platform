/**
 * Core deployment types for Enterprise Deployment Manager
 */

export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate'
export type DeploymentEnvironment = 'development' | 'staging' | 'production'
export type DeploymentStatus = 'pending' | 'validating' | 'deploying' | 'completed' | 'failed' | 'rollingback' | 'cancelled'

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

export interface DeploymentConfig {
  name: string
  version: string
  namespace: string
  image: string
  replicas: number
  environment: DeploymentEnvironment
  strategy: DeploymentStrategy
  resources: ResourceRequirements
  labels: Record<string, string>
  annotations: Record<string, string>
  healthCheck?: {
    httpGet?: {
      path: string
      port: number
    }
    initialDelaySeconds: number
    periodSeconds: number
    timeoutSeconds: number
    successThreshold: number
    failureThreshold: number
  }
}

export interface DeploymentResources {
  created: string[]
  updated: string[]
  deleted: string[]
}

export interface DeploymentResult {
  success: boolean
  deploymentId: string
  status: DeploymentStatus
  message: string
  timestamp: Date
  resources: DeploymentResources
  error?: Error
  warnings?: string[]
  metadata?: Record<string, any>
}

export interface DeploymentMetrics {
  deploymentId: string
  startTime: Date
  endTime?: Date
  duration?: number
  resourcesCreated: number
  resourcesUpdated: number
  resourcesDeleted: number
  errors: number
  warnings: number
}

export interface DeploymentValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}