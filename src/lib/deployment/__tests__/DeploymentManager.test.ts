import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import type { 
  DeploymentConfig, 
  DeploymentResult, 
  DeploymentStatus,
  DeploymentValidationResult 
} from '../types'

// Mock logger before imports
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}))

import { DeploymentManager } from '../DeploymentManager'
import { logger } from '@/lib/logger'

// Mock Kubernetes client
const mockK8sClient = {
  apply: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  watch: vi.fn(),
}

// Mock Redis client
const mockRedisClient = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn(),
}

// Mock Prometheus client
const mockPrometheusClient = {
  register: {
    metrics: vi.fn(),
  },
  Counter: vi.fn(() => ({
    labels: vi.fn().mockReturnThis(),
    inc: vi.fn()
  })),
  Histogram: vi.fn(),
  Gauge: vi.fn(),
  deploymentCounter: {
    labels: vi.fn().mockReturnThis(),
    inc: vi.fn()
  }
}

describe('DeploymentManager', () => {
  let deploymentManager: DeploymentManager
  let mockConfig: DeploymentConfig

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockK8sClient.apply.mockResolvedValue({ 
      metadata: { name: 'test-app', namespace: 'production' }
    })
    mockK8sClient.get.mockResolvedValue({
      status: { readyReplicas: 3, replicas: 3 },
      metadata: { creationTimestamp: '2023-01-01T00:00:00Z' }
    })
    mockK8sClient.list.mockResolvedValue({ items: [] })
    
    mockRedisClient.set.mockResolvedValue('OK')
    mockRedisClient.get.mockResolvedValue(null)
    
    deploymentManager = new DeploymentManager({
      kubernetesConfig: {
        apiUrl: 'https://k8s.example.com',
        token: 'test-token',
        namespace: 'default'
      },
      k8sClient: mockK8sClient,
      redisClient: mockRedisClient,
      prometheusClient: mockPrometheusClient
    })

    mockConfig = {
      name: 'test-app',
      version: '1.0.0',
      namespace: 'production',
      image: 'nginx:latest',
      replicas: 3,
      environment: 'production',
      strategy: 'rolling',
      resources: {
        requests: { cpu: '100m', memory: '128Mi' },
        limits: { cpu: '500m', memory: '512Mi' }
      },
      labels: { app: 'test-app' },
      annotations: { 'app.kubernetes.io/managed-by': 'deployment-manager' },
      healthCheck: {
        httpGet: { path: '/health', port: 8080 },
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
      }
    }
  })

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(deploymentManager).toBeInstanceOf(DeploymentManager)
      expect(logger.info).toHaveBeenCalledWith('DeploymentManager initialized')
    })

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new DeploymentManager({
          kubernetesConfig: {
            apiUrl: '',
            token: '',
            namespace: ''
          }
        })
      }).toThrow('Invalid Kubernetes configuration')
    })
  })

  describe('validateDeployment', () => {
    it('should validate a correct deployment configuration', async () => {
      const result = await deploymentManager.validateDeployment(mockConfig)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should reject invalid deployment name', async () => {
      const invalidConfig = {
        ...mockConfig,
        name: 'INVALID-NAME-123!'
      }

      const result = await deploymentManager.validateDeployment(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Deployment name must be lowercase alphanumeric with hyphens')
    })

    it('should reject invalid resource limits', async () => {
      const invalidConfig = {
        ...mockConfig,
        resources: {
          requests: { cpu: '1000m', memory: '1Gi' },
          limits: { cpu: '100m', memory: '512Mi' }
        }
      }

      const result = await deploymentManager.validateDeployment(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CPU limits must be greater than or equal to requests')
    })

    it('should warn about missing health checks', async () => {
      const configWithoutHealthCheck = {
        ...mockConfig,
        healthCheck: undefined
      }

      const result = await deploymentManager.validateDeployment(configWithoutHealthCheck)
      
      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('No health check configured - recommended for production deployments')
    })

    it('should reject zero replicas in production', async () => {
      const invalidConfig = {
        ...mockConfig,
        replicas: 0,
        environment: 'production' as const
      }

      const result = await deploymentManager.validateDeployment(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Production deployments must have at least 1 replica')
    })
  })

  describe('deploy', () => {
    beforeEach(() => {
      // Mock successful Kubernetes operations
      mockK8sClient.apply.mockResolvedValue({ 
        metadata: { name: 'test-app', namespace: 'production' }
      })
      mockK8sClient.get.mockResolvedValue({
        status: { readyReplicas: 3, replicas: 3 }
      })
      
      // Mock Redis operations
      mockRedisClient.set.mockResolvedValue('OK')
      mockRedisClient.get.mockResolvedValue(null)
    })

    it('should successfully deploy valid configuration', async () => {
      const result = await deploymentManager.deploy(mockConfig)
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.deploymentId).toMatch(/^deploy-\d{13}-[a-f0-9]{8}$/)
      expect(result.resources.created).toContain('deployment/test-app')
      expect(result.resources.created).toContain('service/test-app')
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deployment completed successfully')
      )
    })

    it('should fail deployment with invalid configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        name: 'INVALID!'
      }

      const result = await deploymentManager.deploy(invalidConfig)
      
      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error).toBeInstanceOf(Error)
      expect(result.message).toContain('Validation failed')
    })

    it('should handle Kubernetes API errors gracefully', async () => {
      mockK8sClient.apply.mockRejectedValue(new Error('API server unavailable'))

      const result = await deploymentManager.deploy(mockConfig)
      
      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.message).toBe('API server unavailable')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Deployment failed'),
        expect.any(Error)
      )
    })

    it('should prevent concurrent deployments of same application', async () => {
      // Mock existing deployment in progress
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        status: 'deploying',
        startTime: new Date().toISOString()
      }))

      const result = await deploymentManager.deploy(mockConfig)
      
      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.message).toContain('Deployment already in progress')
    })

    it('should implement rolling update strategy correctly', async () => {
      const rollingConfig = {
        ...mockConfig,
        strategy: 'rolling' as const
      }

      const result = await deploymentManager.deploy(rollingConfig)
      
      expect(result.success).toBe(true)
      expect(mockK8sClient.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: expect.objectContaining({
            strategy: expect.objectContaining({
              type: 'RollingUpdate',
              rollingUpdate: expect.objectContaining({
                maxSurge: '25%',
                maxUnavailable: '25%'
              })
            })
          })
        })
      )
    })

    it('should implement blue-green strategy correctly', async () => {
      const blueGreenConfig = {
        ...mockConfig,
        strategy: 'blue-green' as const
      }

      const result = await deploymentManager.deploy(blueGreenConfig)
      
      expect(result.success).toBe(true)
      // Should create blue deployment first
      expect(mockK8sClient.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: expect.stringContaining('blue')
          })
        })
      )
    })

    it('should collect and report deployment metrics', async () => {
      const startTime = Date.now()
      
      const result = await deploymentManager.deploy(mockConfig)
      
      const endTime = Date.now()
      expect(result.success).toBe(true)
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(startTime)
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(endTime)
      
      // Verify metrics were recorded
      expect(mockPrometheusClient.deploymentCounter.labels).toHaveBeenCalledWith(
        'success', 'production', 'rolling'
      )
      expect(mockPrometheusClient.deploymentCounter.inc).toHaveBeenCalled()
    })
  })

  describe('rollback', () => {
    beforeEach(() => {
      mockK8sClient.get.mockResolvedValue({
        metadata: { 
          annotations: { 'deployment.kubernetes.io/revision': '3' } 
        },
        spec: {
          template: {
            metadata: {
              annotations: { 'deployment.kubernetes.io/revision': '3' }
            }
          }
        }
      })
      mockK8sClient.apply.mockResolvedValue({
        metadata: { name: 'test-app', namespace: 'production' }
      })
    })

    it('should rollback to previous version successfully', async () => {
      const result = await deploymentManager.rollback('test-app', 'production')
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.message).toContain('Rollback completed')
      expect(mockK8sClient.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              metadata: expect.objectContaining({
                annotations: expect.objectContaining({
                  'deployment.kubernetes.io/revision': '2'
                })
              })
            })
          })
        })
      )
    })

    it('should rollback to specific version', async () => {
      const result = await deploymentManager.rollback('test-app', 'production', '1')
      
      expect(result.success).toBe(true)
      expect(mockK8sClient.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              metadata: expect.objectContaining({
                annotations: expect.objectContaining({
                  'deployment.kubernetes.io/revision': '1'
                })
              })
            })
          })
        })
      )
    })

    it('should fail rollback for non-existent deployment', async () => {
      mockK8sClient.get.mockRejectedValue(new Error('Deployment not found'))

      const result = await deploymentManager.rollback('non-existent', 'production')
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Deployment not found')
    })
  })

  describe('getDeploymentStatus', () => {
    it('should return current deployment status', async () => {
      mockK8sClient.get.mockResolvedValue({
        status: {
          conditions: [{ type: 'Progressing', status: 'True' }],
          readyReplicas: 2,
          replicas: 3,
          updatedReplicas: 2
        }
      })

      const status = await deploymentManager.getDeploymentStatus('test-app', 'production')
      
      expect(status.type).toBe('deploying')
      if (status.type === 'deploying') {
        expect(status.progress).toBe(67) // 2/3 * 100
        expect(status.stage).toBe('updating')
      }
    })

    it('should return completed status for successful deployment', async () => {
      mockK8sClient.get.mockResolvedValue({
        status: {
          conditions: [{ type: 'Progressing', status: 'True' }],
          readyReplicas: 3,
          replicas: 3,
          updatedReplicas: 3
        },
        metadata: {
          creationTimestamp: '2023-01-01T00:00:00Z'
        }
      })

      const status = await deploymentManager.getDeploymentStatus('test-app', 'production')
      
      expect(status.type).toBe('completed')
      if (status.type === 'completed') {
        expect(status.completedAt).toBeInstanceOf(Date)
        expect(status.duration).toBeGreaterThan(0)
      }
    })

    it('should return failed status for failed deployment', async () => {
      mockK8sClient.get.mockResolvedValue({
        status: {
          conditions: [
            { 
              type: 'Progressing', 
              status: 'False', 
              reason: 'ProgressDeadlineExceeded',
              message: 'ReplicaSet "test-app-abc123" has timed out progressing'
            }
          ],
          readyReplicas: 0,
          replicas: 3
        }
      })

      const status = await deploymentManager.getDeploymentStatus('test-app', 'production')
      
      expect(status.type).toBe('failed')
      if (status.type === 'failed') {
        expect(status.error).toContain('ProgressDeadlineExceeded')
        expect(status.canRetry).toBe(true)
      }
    })
  })

  describe('listDeployments', () => {
    it('should list all deployments with status', async () => {
      mockK8sClient.list.mockResolvedValue({
        items: [
          {
            metadata: { 
              name: 'app1', 
              namespace: 'production',
              creationTimestamp: '2023-01-01T00:00:00Z'
            },
            status: { readyReplicas: 3, replicas: 3, updatedReplicas: 3 }
          },
          {
            metadata: { 
              name: 'app2', 
              namespace: 'production',
              creationTimestamp: '2023-01-01T00:00:00Z'
            },
            status: { readyReplicas: 1, replicas: 2, updatedReplicas: 1 }
          }
        ]
      })

      // Mock getDeploymentStatus calls
      mockK8sClient.get
        .mockResolvedValueOnce({
          metadata: { creationTimestamp: '2023-01-01T00:00:00Z' },
          status: { readyReplicas: 3, replicas: 3, updatedReplicas: 3 }
        })
        .mockResolvedValueOnce({
          metadata: { creationTimestamp: '2023-01-01T00:00:00Z' },
          status: { readyReplicas: 1, replicas: 2, updatedReplicas: 1 }
        })

      const deployments = await deploymentManager.listDeployments('production')
      
      expect(deployments).toHaveLength(2)
      expect(deployments[0].name).toBe('app1')
      expect(deployments[0].status.type).toBe('completed')
      expect(deployments[1].name).toBe('app2')
      expect(deployments[1].status.type).toBe('deploying')
    })

    it('should filter deployments by labels', async () => {
      const labels = { app: 'test-app', version: '1.0.0' }
      
      await deploymentManager.listDeployments('production', labels)
      
      expect(mockK8sClient.list).toHaveBeenCalledWith(
        'deployments',
        'production',
        { labelSelector: 'app=test-app,version=1.0.0' }
      )
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources and close connections', async () => {
      const mockRedisQuit = vi.fn().mockResolvedValue('OK')
      mockRedisClient.quit = mockRedisQuit

      await deploymentManager.cleanup()
      
      expect(mockRedisQuit).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('DeploymentManager cleanup completed')
    })
  })
})