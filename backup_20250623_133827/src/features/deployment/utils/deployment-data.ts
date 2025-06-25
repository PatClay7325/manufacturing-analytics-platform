/**
 * Server-side data fetching utilities for deployment data
 * Implements proper caching and error handling
 */

import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import type { DeploymentStats, ActiveDeployment } from '../types'
import { unstable_cache } from 'next/cache'

// Cache tags for granular invalidation
const CACHE_TAGS = {
  DEPLOYMENT_STATS: 'deployment-stats',
  ACTIVE_DEPLOYMENTS: 'active-deployments',
  DEPLOYMENT_DETAIL: (id: string) => `deployment-${id}`
} as const

// Cached function for deployment stats with 60 second revalidation
export const getDeploymentStats = unstable_cache(
  async (): Promise<DeploymentStats> => {
    try {
      const [
        totalCount,
        successCount,
        failedCount,
        pendingCount,
        avgTime,
        lastDeployment
      ] = await Promise.all([
        prisma.deployment.count(),
        prisma.deployment.count({ where: { status: 'completed' } }),
        prisma.deployment.count({ where: { status: 'failed' } }),
        prisma.deployment.count({ where: { status: 'pending' } }),
        prisma.deployment.aggregate({
          _avg: { duration: true },
          where: { status: 'completed' }
        }),
        prisma.deployment.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })
      ])

      const successRate = totalCount > 0 
        ? (successCount / totalCount) * 100 
        : 0

      // Get compliance and security scores from latest assessments
      const [complianceScore, securityScore] = await Promise.all([
        getLatestComplianceScore(),
        getLatestSecurityScore()
      ])

      return {
        totalDeployments: totalCount,
        successfulDeployments: successCount,
        failedDeployments: failedCount,
        pendingDeployments: pendingCount,
        averageDeploymentTime: avgTime._avg.duration || 0,
        deploymentSuccessRate: Math.round(successRate * 100) / 100,
        lastDeploymentAt: lastDeployment?.createdAt || null,
        complianceScore,
        securityScore
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch deployment stats')
      // Return safe defaults on error
      return {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        pendingDeployments: 0,
        averageDeploymentTime: 0,
        deploymentSuccessRate: 0,
        lastDeploymentAt: null,
        complianceScore: 0,
        securityScore: 0
      }
    }
  },
  [CACHE_TAGS.DEPLOYMENT_STATS],
  {
    revalidate: 60, // 60 seconds
    tags: [CACHE_TAGS.DEPLOYMENT_STATS]
  }
)

// Cached function for active deployments with 30 second revalidation
export const getActiveDeployments = unstable_cache(
  async (limit: number = 20): Promise<ActiveDeployment[]> => {
    try {
      const deployments = await prisma.deployment.findMany({
        where: {
          status: {
            in: ['pending', 'validating', 'deploying', 'rollingback']
          }
        },
        include: {
          health: true,
          compliance: {
            include: {
              frameworks: true
            }
          },
          security: {
            include: {
              vulnerabilities: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return deployments.map(mapPrismaToActiveDeployment)
    } catch (error) {
      logger.error({ error }, 'Failed to fetch active deployments')
      return []
    }
  },
  [CACHE_TAGS.ACTIVE_DEPLOYMENTS],
  {
    revalidate: 30, // 30 seconds for active deployments
    tags: [CACHE_TAGS.ACTIVE_DEPLOYMENTS]
  }
)

// Get deployment by ID with caching
export const getDeploymentById = unstable_cache(
  async (id: string): Promise<ActiveDeployment | null> => {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id },
        include: {
          health: {
            include: {
              checks: true
            }
          },
          compliance: {
            include: {
              frameworks: {
                include: {
                  issues: true
                }
              }
            }
          },
          security: {
            include: {
              vulnerabilities: true
            }
          }
        }
      })

      return deployment ? mapPrismaToActiveDeployment(deployment) : null
    } catch (error) {
      logger.error({ error, deploymentId: id }, 'Failed to fetch deployment')
      return null
    }
  },
  ['deployment-by-id'],
  {
    revalidate: 60,
    tags: [(id: string) => CACHE_TAGS.DEPLOYMENT_DETAIL(id)]
  }
)

// Helper function to get latest compliance score
async function getLatestComplianceScore(): Promise<number> {
  try {
    const assessment = await prisma.complianceAssessment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { overallScore: true }
    })
    return assessment?.overallScore || 0
  } catch {
    return 0
  }
}

// Helper function to get latest security score
async function getLatestSecurityScore(): Promise<number> {
  try {
    const scan = await prisma.securityScan.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { score: true }
    })
    return scan?.score || 0
  } catch {
    return 0
  }
}

// Map Prisma model to our domain type
function mapPrismaToActiveDeployment(deployment: any): ActiveDeployment {
  return {
    id: deployment.id,
    name: deployment.name,
    version: deployment.version,
    environment: deployment.environment,
    namespace: deployment.namespace,
    status: mapDeploymentStatus(deployment.status, deployment),
    strategy: deployment.strategy,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    createdBy: deployment.createdBy,
    metadata: {
      labels: deployment.labels || {},
      annotations: deployment.annotations || {},
      gitCommit: deployment.gitCommit,
      gitBranch: deployment.gitBranch,
      buildNumber: deployment.buildNumber,
      triggeredBy: deployment.triggeredBy
    },
    health: deployment.health ? {
      healthy: deployment.health.healthy,
      score: deployment.health.score,
      checks: deployment.health.checks || [],
      lastCheckedAt: deployment.health.lastCheckedAt
    } : undefined,
    compliance: deployment.compliance ? {
      compliant: deployment.compliance.compliant,
      frameworks: deployment.compliance.frameworks.map((f: any) => ({
        name: f.name,
        compliant: f.compliant,
        score: f.score,
        issues: f.issues || []
      })),
      overallScore: deployment.compliance.overallScore,
      reportDate: deployment.compliance.reportDate
    } : undefined,
    security: deployment.security ? {
      secure: deployment.security.secure,
      score: deployment.security.score,
      vulnerabilities: deployment.security.vulnerabilities || [],
      lastScanAt: deployment.security.lastScanAt
    } : undefined
  }
}

// Map status string to discriminated union
function mapDeploymentStatus(status: string, deployment: any): ActiveDeployment['status'] {
  switch (status) {
    case 'pending':
      return { type: 'pending', queuePosition: deployment.queuePosition || 1 }
    case 'validating':
      return { type: 'validating', progress: deployment.progress || 0 }
    case 'deploying':
      return { 
        type: 'deploying', 
        progress: deployment.progress || 0,
        stage: deployment.stage || 'preparing'
      }
    case 'completed':
      return { 
        type: 'completed', 
        completedAt: deployment.completedAt,
        duration: deployment.duration || 0
      }
    case 'failed':
      return {
        type: 'failed',
        error: deployment.error || 'Unknown error',
        failedAt: deployment.failedAt || deployment.updatedAt,
        canRetry: deployment.canRetry !== false
      }
    case 'rollingback':
      return { type: 'rollingback', progress: deployment.progress || 0 }
    case 'cancelled':
      return {
        type: 'cancelled',
        cancelledAt: deployment.cancelledAt || deployment.updatedAt,
        reason: deployment.cancelReason || 'User cancelled'
      }
    default:
      return { type: 'pending', queuePosition: 1 }
  }
}

// Invalidate caches when deployments change
export async function invalidateDeploymentCache(deploymentId?: string) {
  const tags = [
    CACHE_TAGS.DEPLOYMENT_STATS,
    CACHE_TAGS.ACTIVE_DEPLOYMENTS
  ]
  
  if (deploymentId) {
    tags.push(CACHE_TAGS.DEPLOYMENT_DETAIL(deploymentId))
  }

  // This would be implemented with your cache invalidation strategy
  // For example, using revalidateTag from next/cache
}