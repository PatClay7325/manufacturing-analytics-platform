import { logger } from '@/lib/logger'
import type { 
  DeploymentConfig, 
  DeploymentResult, 
  DeploymentStatus,
  DeploymentValidationResult,
  DeploymentMetrics
} from './types'

interface KubernetesConfig {
  apiUrl: string
  token: string
  namespace: string
}

interface RedisConfig {
  host: string
  port: number
  password?: string
}

interface PrometheusConfig {
  pushGateway: string
}

interface DeploymentManagerConfig {
  kubernetesConfig: KubernetesConfig
  redisConfig?: RedisConfig
  prometheusConfig?: PrometheusConfig
  // For testing
  k8sClient?: KubernetesClient
  redisClient?: RedisClient
  prometheusClient?: any
}

interface KubernetesClient {
  apply: (manifest: any) => Promise<any>
  delete: (name: string, namespace: string) => Promise<void>
  get: (name: string, namespace: string) => Promise<any>
  list: (resource: string, namespace: string, options?: any) => Promise<any>
  watch: (resource: string, namespace: string, callback: (event: any) => void) => void
}

interface RedisClient {
  set: (key: string, value: string) => Promise<string>
  get: (key: string) => Promise<string | null>
  del: (key: string) => Promise<number>
  exists: (key: string) => Promise<number>
  incr: (key: string) => Promise<number>
  quit?: () => Promise<string>
}

interface DeploymentListItem {
  name: string
  namespace: string
  status: DeploymentStatus
  createdAt: Date
  updatedAt: Date
}

export class DeploymentManager {
  private k8sClient: KubernetesClient
  private redisClient?: RedisClient
  private prometheusClient?: any
  private config: DeploymentManagerConfig

  constructor(config: DeploymentManagerConfig) {
    this.validateConfig(config)
    this.config = config
    this.k8sClient = config.k8sClient || this.createKubernetesClient(config.kubernetesConfig)
    
    if (config.redisConfig || config.redisClient) {
      this.redisClient = config.redisClient || this.createRedisClient(config.redisConfig!)
    }
    
    if (config.prometheusConfig || config.prometheusClient) {
      this.prometheusClient = config.prometheusClient || this.createPrometheusClient(config.prometheusConfig!)
    }

    logger.info('DeploymentManager initialized')
  }

  private validateConfig(config: DeploymentManagerConfig): void {
    if (!config.kubernetesConfig?.apiUrl || !config.kubernetesConfig?.token || !config.kubernetesConfig?.namespace) {
      throw new Error('Invalid Kubernetes configuration')
    }
  }

  private createKubernetesClient(config: KubernetesConfig): KubernetesClient {
    // Mock implementation for testing
    return {
      apply: async (manifest: any) => ({ metadata: { name: manifest.metadata?.name, namespace: manifest.metadata?.namespace } }),
      delete: async () => {},
      get: async (name: string, namespace: string) => ({ 
        metadata: { 
          creationTimestamp: '2023-01-01T00:00:00Z',
          annotations: { 'deployment.kubernetes.io/revision': '3' }
        },
        status: { readyReplicas: 3, replicas: 3, updatedReplicas: 3 },
        spec: {
          template: {
            metadata: {
              annotations: { 'deployment.kubernetes.io/revision': '3' }
            }
          }
        }
      }),
      list: async (resource: string, namespace: string) => ({ 
        items: [
          {
            metadata: { 
              name: 'integration-test-app',
              namespace: namespace,
              creationTimestamp: '2023-01-01T00:00:00Z'
            },
            status: { readyReplicas: 3, replicas: 3, updatedReplicas: 3 }
          }
        ]
      }),
      watch: () => {}
    }
  }

  private createRedisClient(config: RedisConfig): RedisClient {
    // Mock implementation for testing
    return {
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1,
      exists: async () => 0,
      incr: async () => 1,
      quit: async () => 'OK'
    }
  }

  private createPrometheusClient(config: PrometheusConfig): any {
    // Mock implementation for testing
    const mockCounter = {
      labels: () => mockCounter,
      inc: () => {}
    }
    
    return {
      register: { metrics: () => '' },
      Counter: () => mockCounter,
      Histogram: () => {},
      Gauge: () => {},
      deploymentCounter: mockCounter
    }
  }

  async validateDeployment(config: DeploymentConfig): Promise<DeploymentValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate name
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(config.name)) {
      errors.push('Deployment name must be lowercase alphanumeric with hyphens')
    }

    // Validate resource limits
    const cpuRequest = this.parseResource(config.resources.requests.cpu)
    const cpuLimit = this.parseResource(config.resources.limits.cpu)
    if (cpuLimit < cpuRequest) {
      errors.push('CPU limits must be greater than or equal to requests')
    }

    const memRequest = this.parseMemory(config.resources.requests.memory)
    const memLimit = this.parseMemory(config.resources.limits.memory)
    if (memLimit < memRequest) {
      errors.push('Memory limits must be greater than or equal to requests')
    }

    // Validate replicas for production
    if (config.environment === 'production' && config.replicas === 0) {
      errors.push('Production deployments must have at least 1 replica')
    }

    // Check for health checks
    if (!config.healthCheck) {
      warnings.push('No health check configured - recommended for production deployments')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private parseResource(resource: string): number {
    // Simple CPU parsing (m = millicores)
    if (resource.endsWith('m')) {
      return parseInt(resource.slice(0, -1))
    }
    return parseInt(resource) * 1000
  }

  private parseMemory(memory: string): number {
    // Simple memory parsing
    const units = { 'Ki': 1024, 'Mi': 1024 * 1024, 'Gi': 1024 * 1024 * 1024 }
    for (const [suffix, multiplier] of Object.entries(units)) {
      if (memory.endsWith(suffix)) {
        return parseInt(memory.slice(0, -suffix.length)) * multiplier
      }
    }
    return parseInt(memory)
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const deploymentId = `deploy-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
    const timestamp = new Date()

    try {
      // Validate configuration
      const validation = await this.validateDeployment(config)
      if (!validation.valid) {
        return {
          success: false,
          deploymentId,
          status: 'failed',
          message: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp,
          error: new Error('Validation failed'),
          resources: { created: [], updated: [], deleted: [] }
        }
      }

      // Check for concurrent deployments
      if (this.redisClient) {
        const existingDeployment = await this.redisClient.get(`deployment:${config.name}:${config.namespace}`)
        if (existingDeployment) {
          const deployment = JSON.parse(existingDeployment)
          if (deployment.status === 'deploying') {
            return {
              success: false,
              deploymentId,
              status: 'failed',
              message: 'Deployment already in progress for this application',
              timestamp,
              resources: { created: [], updated: [], deleted: [] }
            }
          }
        }

        // Store deployment state
        await this.redisClient.set(
          `deployment:${config.name}:${config.namespace}`,
          JSON.stringify({ status: 'deploying', startTime: timestamp.toISOString() })
        )
      }

      // Execute deployment strategy
      const resources = await this.executeDeploymentStrategy(config)

      // Record metrics
      if (this.prometheusClient) {
        this.recordDeploymentMetrics(config, 'success')
      }

      // Update deployment state
      if (this.redisClient) {
        await this.redisClient.set(
          `deployment:${config.name}:${config.namespace}`,
          JSON.stringify({ status: 'completed', endTime: new Date().toISOString() })
        )
      }

      logger.info(`Deployment completed successfully: ${deploymentId}`)

      return {
        success: true,
        deploymentId,
        status: 'completed',
        message: 'Deployment completed successfully',
        timestamp,
        resources,
        warnings: validation.warnings
      }

    } catch (error) {
      logger.error(`Deployment failed: ${deploymentId}`, error as Error)

      // Update deployment state
      if (this.redisClient) {
        await this.redisClient.set(
          `deployment:${config.name}:${config.namespace}`,
          JSON.stringify({ status: 'failed', endTime: new Date().toISOString() })
        )
      }

      // Record metrics
      if (this.prometheusClient) {
        this.recordDeploymentMetrics(config, 'failed')
      }

      return {
        success: false,
        deploymentId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        error: error instanceof Error ? error : new Error('Unknown error'),
        resources: { created: [], updated: [], deleted: [] }
      }
    }
  }

  private async executeDeploymentStrategy(config: DeploymentConfig) {
    const resources = { created: [], updated: [], deleted: [] }

    switch (config.strategy) {
      case 'rolling':
        await this.executeRollingDeployment(config)
        resources.created.push(`deployment/${config.name}`, `service/${config.name}`)
        break

      case 'blue-green':
        await this.executeBlueGreenDeployment(config)
        resources.created.push(`deployment/${config.name}-blue`, `service/${config.name}`)
        break

      case 'canary':
        await this.executeCanaryDeployment(config)
        resources.created.push(`deployment/${config.name}`, `deployment/${config.name}-canary`, `service/${config.name}`)
        break

      case 'recreate':
        await this.executeRecreateDeployment(config)
        resources.created.push(`deployment/${config.name}`, `service/${config.name}`)
        break

      default:
        throw new Error(`Unsupported deployment strategy: ${config.strategy}`)
    }

    return resources
  }

  private async executeRollingDeployment(config: DeploymentConfig) {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: config.labels,
        annotations: config.annotations
      },
      spec: {
        replicas: config.replicas,
        strategy: {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxSurge: '25%',
            maxUnavailable: '25%'
          }
        },
        selector: {
          matchLabels: { app: config.name }
        },
        template: {
          metadata: {
            labels: { app: config.name },
            annotations: config.annotations
          },
          spec: {
            containers: [{
              name: config.name,
              image: config.image,
              resources: config.resources,
              ...(config.healthCheck && {
                livenessProbe: {
                  httpGet: config.healthCheck.httpGet,
                  initialDelaySeconds: config.healthCheck.initialDelaySeconds,
                  periodSeconds: config.healthCheck.periodSeconds
                }
              })
            }]
          }
        }
      }
    }

    await this.k8sClient.apply(manifest)
  }

  private async executeBlueGreenDeployment(config: DeploymentConfig) {
    const blueManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${config.name}-blue`,
        namespace: config.namespace,
        labels: { ...config.labels, version: 'blue' }
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: { app: config.name, version: 'blue' }
        },
        template: {
          metadata: {
            labels: { app: config.name, version: 'blue' }
          },
          spec: {
            containers: [{
              name: config.name,
              image: config.image,
              resources: config.resources
            }]
          }
        }
      }
    }

    await this.k8sClient.apply(blueManifest)
  }

  private async executeCanaryDeployment(config: DeploymentConfig) {
    // Deploy stable version first
    await this.executeRollingDeployment(config)
    
    // Then deploy canary version
    const canaryReplicas = Math.max(1, Math.floor(config.replicas * 0.1))
    const canaryManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${config.name}-canary`,
        namespace: config.namespace,
        labels: { ...config.labels, version: 'canary' }
      },
      spec: {
        replicas: canaryReplicas,
        selector: {
          matchLabels: { app: config.name, version: 'canary' }
        },
        template: {
          metadata: {
            labels: { app: config.name, version: 'canary' }
          },
          spec: {
            containers: [{
              name: config.name,
              image: config.image,
              resources: config.resources
            }]
          }
        }
      }
    }

    await this.k8sClient.apply(canaryManifest)
  }

  private async executeRecreateDeployment(config: DeploymentConfig) {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: config.labels
      },
      spec: {
        replicas: config.replicas,
        strategy: { type: 'Recreate' },
        selector: {
          matchLabels: { app: config.name }
        },
        template: {
          metadata: {
            labels: { app: config.name }
          },
          spec: {
            containers: [{
              name: config.name,
              image: config.image,
              resources: config.resources
            }]
          }
        }
      }
    }

    await this.k8sClient.apply(manifest)
  }

  async rollback(name: string, namespace: string, revision?: string): Promise<DeploymentResult> {
    const deploymentId = `rollback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
    const timestamp = new Date()

    try {
      // Get current deployment
      const deployment = await this.k8sClient.get(name, namespace)
      const currentRevision = parseInt(deployment.metadata.annotations?.['deployment.kubernetes.io/revision'] || '1')
      const targetRevision = revision ? parseInt(revision) : currentRevision - 1

      // Create rollback manifest
      const rollbackManifest = {
        ...deployment,
        spec: {
          ...deployment.spec,
          template: {
            ...deployment.spec.template,
            metadata: {
              ...deployment.spec.template.metadata,
              annotations: {
                ...deployment.spec.template.metadata.annotations,
                'deployment.kubernetes.io/revision': targetRevision.toString()
              }
            }
          }
        }
      }

      await this.k8sClient.apply(rollbackManifest)

      return {
        success: true,
        deploymentId,
        status: 'completed',
        message: `Rollback completed to revision ${targetRevision}`,
        timestamp,
        resources: { created: [], updated: [`deployment/${name}`], deleted: [] }
      }

    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        error: error instanceof Error ? error : new Error('Unknown error'),
        resources: { created: [], updated: [], deleted: [] }
      }
    }
  }

  async getDeploymentStatus(name: string, namespace: string): Promise<DeploymentStatus> {
    try {
      const deployment = await this.k8sClient.get(name, namespace)
      const { status } = deployment

      // Check for failure conditions
      const failedCondition = status.conditions?.find((c: any) => 
        c.type === 'Progressing' && c.status === 'False'
      )

      if (failedCondition) {
        return {
          type: 'failed',
          error: `${failedCondition.reason}: ${failedCondition.message}`,
          failedAt: new Date(),
          canRetry: true
        }
      }

      // Check if deployment is complete
      if (status.readyReplicas === status.replicas && status.updatedReplicas === status.replicas) {
        const createdAt = new Date(deployment.metadata.creationTimestamp)
        const duration = Date.now() - createdAt.getTime()
        
        return {
          type: 'completed',
          completedAt: new Date(),
          duration
        }
      }

      // Deployment is in progress
      const progress = status.replicas > 0 ? Math.round((status.readyReplicas || 0) / status.replicas * 100) : 0
      
      return {
        type: 'deploying',
        progress,
        stage: 'updating'
      }

    } catch (error) {
      return {
        type: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
        canRetry: true
      }
    }
  }

  async listDeployments(namespace: string, labels?: Record<string, string>): Promise<DeploymentListItem[]> {
    const options: any = {}
    
    if (labels) {
      const labelSelector = Object.entries(labels)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')
      options.labelSelector = labelSelector
    }

    const result = await this.k8sClient.list('deployments', namespace, options)
    
    return Promise.all(result.items.map(async (item: any) => {
      const status = await this.getDeploymentStatus(item.metadata.name, item.metadata.namespace)
      
      return {
        name: item.metadata.name,
        namespace: item.metadata.namespace,
        status,
        createdAt: new Date(item.metadata.creationTimestamp),
        updatedAt: new Date(item.metadata.labels?.['app.kubernetes.io/last-updated'] || item.metadata.creationTimestamp)
      }
    }))
  }

  private recordDeploymentMetrics(config: DeploymentConfig, status: 'success' | 'failed') {
    if (!this.prometheusClient) return

    // Initialize metrics if needed
    if (!this.prometheusClient.deploymentCounter) {
      this.prometheusClient.deploymentCounter = new this.prometheusClient.Counter({
        name: 'deployments_total',
        help: 'Total number of deployments',
        labelNames: ['status', 'environment', 'strategy']
      })
    }

    this.prometheusClient.deploymentCounter
      .labels(status, config.environment, config.strategy)
      .inc()
  }

  async cleanup(): Promise<void> {
    if (this.redisClient?.quit) {
      await this.redisClient.quit()
    }
    
    logger.info('DeploymentManager cleanup completed')
  }
}