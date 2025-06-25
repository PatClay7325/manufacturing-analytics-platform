'use server'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Types
interface SystemService {
  name: string
  status: 'up' | 'down' | 'degraded'
  lastCheck: Date
  responseTime?: number
}

interface SystemStatus {
  healthy: boolean
  services: SystemService[]
  lastUpdated: Date
}

interface ActiveAlerts {
  total: number
  critical: number
  warning: number
  info: number
  alerts: Array<{
    id: string
    severity: 'critical' | 'warning' | 'info'
    title: string
    description: string
    timestamp: Date
    equipment?: string
  }>
}

interface MetricsSummary {
  avgResponseTime: number
  errorRate: number
  requestsPerMinute: number
  activeUsers: number
  cpuUsage: number
  memoryUsage: number
}

// Core functions without caching for testing
export async function getSystemStatusCore(): Promise<SystemStatus> {
  try {
    // Check various services
    const services: SystemService[] = []
    
    // Check database
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      services.push({
        name: 'PostgreSQL Database',
        status: 'up',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
      })
    } catch {
      services.push({
        name: 'PostgreSQL Database',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    // Check Prometheus
    try {
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090'
      const response = await fetch(`${prometheusUrl}/-/healthy`, {
        signal: AbortSignal.timeout(5000),
      })
      services.push({
        name: 'Prometheus',
        status: response.ok ? 'up' : 'down',
        lastCheck: new Date(),
      })
    } catch {
      services.push({
        name: 'Prometheus',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    // Check AnalyticsPlatform
    try {
      const analyticsUrl = process.env.ANALYTICS_PLATFORM_URL || 'http://localhost:3003'
      const response = await fetch(`${analyticsUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      services.push({
        name: 'AnalyticsPlatform',
        status: response.ok ? 'up' : 'degraded',
        lastCheck: new Date(),
      })
    } catch {
      services.push({
        name: 'AnalyticsPlatform',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    // Check AlertManager
    try {
      const alertmanagerUrl = process.env.ALERTMANAGER_URL || 'http://localhost:9093'
      const response = await fetch(`${alertmanagerUrl}/-/healthy`, {
        signal: AbortSignal.timeout(5000),
      })
      services.push({
        name: 'AlertManager',
        status: response.ok ? 'up' : 'degraded',
        lastCheck: new Date(),
      })
    } catch {
      services.push({
        name: 'AlertManager',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    // Check Loki
    try {
      const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100'
      const response = await fetch(`${lokiUrl}/ready`, {
        signal: AbortSignal.timeout(5000),
      })
      services.push({
        name: 'Loki',
        status: response.ok ? 'up' : 'degraded',
        lastCheck: new Date(),
      })
    } catch {
      services.push({
        name: 'Loki',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    // Check Jaeger
    try {
      const jaegerUrl = process.env.JAEGER_URL || 'http://localhost:16686'
      const response = await fetch(`${jaegerUrl}/`, {
        signal: AbortSignal.timeout(5000),
      })
      services.push({
        name: 'Jaeger',
        status: response.ok ? 'up' : 'degraded',
        lastCheck: new Date(),
      })
    } catch {
      services.push({
        name: 'Jaeger',
        status: 'down',
        lastCheck: new Date(),
      })
    }

    const healthy = services.every(s => s.status === 'up')

    return {
      healthy,
      services,
      lastUpdated: new Date(),
    }
  } catch (error) {
    logger.error({ error }, 'Error checking system status')
    return {
      healthy: false,
      services: [],
      lastUpdated: new Date(),
    }
  }
}

export async function getActiveAlertsCore(): Promise<ActiveAlerts> {
  try {
    // Get alerts from database
    const dbAlerts = await prisma.alerts.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    })

    // Try to get alerts from AlertManager
    let alertManagerAlerts: any[] = []
    try {
      const alertmanagerUrl = process.env.ALERTMANAGER_URL || 'http://localhost:9093'
      const response = await fetch(`${alertmanagerUrl}/api/v1/alerts`, {
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) {
        const data = await response.json()
        alertManagerAlerts = data.data || []
      }
    } catch (error) {
      logger.warn({ error }, 'Could not fetch from AlertManager')
    }

    // Combine and deduplicate alerts
    const allAlerts = [
      ...dbAlerts.map(alert => ({
        id: alert.id,
        severity: alert.severity as 'critical' | 'warning' | 'info',
        title: alert.title,
        description: alert.description || '',
        timestamp: alert.timestamp,
        equipment: alert.equipmentId || undefined,
      })),
      ...alertManagerAlerts.map(alert => ({
        id: alert.fingerprint || `am-${Date.now()}`,
        severity: (alert.labels?.severity || 'info') as 'critical' | 'warning' | 'info',
        title: alert.annotations?.summary || 'Unknown Alert',
        description: alert.annotations?.description || '',
        timestamp: new Date(alert.startsAt),
        equipment: alert.labels?.equipment_id,
      })),
    ]

    // Count by severity
    const critical = allAlerts.filter(a => a.severity === 'critical').length
    const warning = allAlerts.filter(a => a.severity === 'warning').length
    const info = allAlerts.filter(a => a.severity === 'info').length

    return {
      total: allAlerts.length,
      critical,
      warning,
      info,
      alerts: allAlerts.slice(0, 10), // Return first 10 for display
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching alerts')
    return {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
      alerts: [],
    }
  }
}

export async function getMetricsSummaryCore(): Promise<MetricsSummary> {
  try {
    // Get recent performance metrics
    const recentMetrics = await prisma.performanceMetrics.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      select: {
        oee: true,
        availability: true,
        performance: true,
        quality: true,
        timestamp: true,
      },
    })

    // Calculate average response time (mock for now)
    const avgResponseTime = Math.round(Math.random() * 50 + 100)

    // Calculate error rate (mock for now) 
    const errorRate = Number((Math.random() * 2).toFixed(2))

    // Requests per minute (mock)
    const requestsPerMinute = Math.round(Math.random() * 500 + 1000)

    // Active users (mock)
    const activeUsers = Math.round(Math.random() * 50 + 100)

    // System metrics (mock)
    const cpuUsage = Number((Math.random() * 30 + 30).toFixed(1))
    const memoryUsage = Number((Math.random() * 40 + 40).toFixed(1))

    return {
      avgResponseTime,
      errorRate,
      requestsPerMinute,
      activeUsers,
      cpuUsage,
      memoryUsage,
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching metrics summary')
    return {
      avgResponseTime: 0,
      errorRate: 0,
      requestsPerMinute: 0,
      activeUsers: 0,
      cpuUsage: 0,
      memoryUsage: 0,
    }
  }
}

// Production versions with caching (conditional import to avoid test issues)
export async function getSystemStatus(): Promise<SystemStatus> {
  if (process.env.NODE_ENV === 'test') {
    return getSystemStatusCore()
  }
  
  // Use dynamic import to avoid issues in test environment
  const { unstable_cache } = await import('next/cache')
  const cachedFn = unstable_cache(
    getSystemStatusCore,
    ['system-status'],
    {
      revalidate: 30,
      tags: ['monitoring'],
    }
  )
  return cachedFn()
}

export async function getActiveAlerts(): Promise<ActiveAlerts> {
  if (process.env.NODE_ENV === 'test') {
    return getActiveAlertsCore()
  }
  
  const { unstable_cache } = await import('next/cache')
  const cachedFn = unstable_cache(
    getActiveAlertsCore,
    ['active-alerts'],
    {
      revalidate: 10,
      tags: ['alerts'],
    }
  )
  return cachedFn()
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  if (process.env.NODE_ENV === 'test') {
    return getMetricsSummaryCore()
  }
  
  const { unstable_cache } = await import('next/cache')
  const cachedFn = unstable_cache(
    getMetricsSummaryCore,
    ['metrics-summary'],
    {
      revalidate: 60,
      tags: ['metrics'],
    }
  )
  return cachedFn()
}

// Query Prometheus
export async function queryPrometheus(query: string, start?: Date, end?: Date) {
  const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090'
  
  const params = new URLSearchParams({
    query,
    ...(start && { start: start.toISOString() }),
    ...(end && { end: end.toISOString() }),
  })

  const response = await fetch(`${prometheusUrl}/api/v1/query_range?${params}`, {
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    throw new Error('Failed to query Prometheus')
  }

  return response.json()
}

// Query Loki for logs
export async function queryLoki(query: string, limit = 100) {
  const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100'
  
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
  })

  const response = await fetch(`${lokiUrl}/loki/api/v1/query_range?${params}`, {
    next: { revalidate: 10 },
  })

  if (!response.ok) {
    throw new Error('Failed to query Loki')
  }

  return response.json()
}