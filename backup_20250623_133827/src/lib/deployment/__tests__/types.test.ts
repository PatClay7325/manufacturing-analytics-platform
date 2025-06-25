import { describe, it, expect } from 'vitest'
import type { DeploymentConfig, DeploymentResult, DeploymentStatus } from '../types'

describe('Deployment Types', () => {
  describe('DeploymentConfig', () => {
    it('should have required properties', () => {
      const config: DeploymentConfig = {
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
        labels: {},
        annotations: {}
      }

      expect(config.name).toBe('test-app')
      expect(config.version).toBe('1.0.0')
      expect(config.replicas).toBe(3)
      expect(config.strategy).toBe('rolling')
    })
  })

  describe('DeploymentStatus', () => {
    it('should support all deployment statuses', () => {
      const statuses: DeploymentStatus[] = [
        'pending',
        'validating',
        'deploying',
        'completed',
        'failed',
        'rollingback',
        'cancelled'
      ]

      statuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(status).toMatch(/^(pending|validating|deploying|completed|failed|rollingback|cancelled)$/)
      })
    })
  })

  describe('DeploymentResult', () => {
    it('should contain required result properties', () => {
      const result: DeploymentResult = {
        success: true,
        deploymentId: 'deploy-123',
        status: 'completed',
        message: 'Deployment successful',
        timestamp: new Date(),
        resources: {
          created: ['deployment/test-app', 'service/test-app'],
          updated: [],
          deleted: []
        }
      }

      expect(result.success).toBe(true)
      expect(result.deploymentId).toBe('deploy-123')
      expect(result.status).toBe('completed')
      expect(result.resources.created).toHaveLength(2)
    })

    it('should handle failed deployment result', () => {
      const result: DeploymentResult = {
        success: false,
        deploymentId: 'deploy-456',
        status: 'failed',
        message: 'Deployment failed: Image pull error',
        timestamp: new Date(),
        error: new Error('Image pull error'),
        resources: {
          created: [],
          updated: [],
          deleted: []
        }
      }

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.message).toContain('failed')
    })
  })
})