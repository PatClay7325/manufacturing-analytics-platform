import { EventEmitter } from 'events'
import { logger } from '@/lib/logger'
import { getMetrics } from '@/lib/observability/metrics'

interface MetricPoint {
  timestamp: number
  value: number
  labels?: Record<string, string>
}

interface Alert {
  id: string
  name: string
  severity: 'critical' | 'warning' | 'info'
  state: 'firing' | 'pending' | 'resolved'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: Date
  endsAt?: Date
}

interface MonitoringConfig {
  prometheusUrl: string
  analyticsUrl: string
  alertmanagerUrl: string
  lokiUrl: string
  jaegerUrl: string
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService
  private config: MonitoringConfig
  private metricsBuffer: Map<string, MetricPoint[]> = new Map()
  private alertsCache: Map<string, Alert> = new Map()
  private flushInterval: NodeJS.Timeout | null = null

  private constructor(config?: Partial<MonitoringConfig>) {
    super()
    this.config = {
      prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
      analyticsUrl: process.env.ANALYTICS_PLATFORM_URL || 'http://localhost:3003',
      alertmanagerUrl: process.env.ALERTMANAGER_URL || 'http://localhost:9093',
      lokiUrl: process.env.LOKI_URL || 'http://localhost:3100',
      jaegerUrl: process.env.JAEGER_URL || 'http://localhost:16686',
      ...config,
    }

    // Start periodic metric flush
    this.startMetricsFlusher()
  }

  static getInstance(config?: Partial<MonitoringConfig>): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config)
    }
    return MonitoringService.instance
  }

  // Record a metric
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, labels)
    
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, [])
    }

    this.metricsBuffer.get(key)!.push({
      timestamp: Date.now(),
      value,
      labels,
    })

    // Emit metric event for real-time updates
    this.emit('metric', { name, value, labels, timestamp: Date.now() })
  }

  // Query Prometheus
  async queryPrometheus(
    query: string,
    start?: Date,
    end?: Date,
    step?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      query,
      ...(start && { start: start.toISOString() }),
      ...(end && { end: end.toISOString() }),
      ...(step && { step }),
    })

    const response = await fetch(
      `${this.config.prometheusUrl}/api/v1/query_range?${params}`
    )

    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Query instant metrics
  async queryInstant(query: string): Promise<any> {
    const params = new URLSearchParams({ query })
    
    const response = await fetch(
      `${this.config.prometheusUrl}/api/v1/query?${params}`
    )

    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Get active alerts
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const response = await fetch(`${this.config.alertmanagerUrl}/api/v1/alerts`)
      
      if (!response.ok) {
        throw new Error(`AlertManager query failed: ${response.statusText}`)
      }

      const data = await response.json()
      const alerts = data.data || []

      // Update cache and emit events
      const activeAlerts: Alert[] = alerts.map((alert: any) => {
        const formattedAlert: Alert = {
          id: alert.fingerprint,
          name: alert.labels.alertname,
          severity: alert.labels.severity || 'info',
          state: 'firing',
          labels: alert.labels,
          annotations: alert.annotations || {},
          startsAt: new Date(alert.startsAt),
          endsAt: alert.endsAt ? new Date(alert.endsAt) : undefined,
        }

        // Check if this is a new alert
        if (!this.alertsCache.has(formattedAlert.id)) {
          this.emit('alert:new', formattedAlert)
        }

        this.alertsCache.set(formattedAlert.id, formattedAlert)
        return formattedAlert
      })

      // Check for resolved alerts
      this.alertsCache.forEach((cachedAlert, id) => {
        if (!activeAlerts.find(a => a.id === id)) {
          this.emit('alert:resolved', cachedAlert)
          this.alertsCache.delete(id)
        }
      })

      return activeAlerts
    } catch (error) {
      logger.error({ error }, 'Failed to fetch alerts')
      return []
    }
  }

  // Create alert silence
  async createSilence(
    matchers: Array<{ name: string; value: string; isRegex?: boolean }>,
    duration: string,
    comment: string,
    createdBy: string = 'system'
  ): Promise<string> {
    const now = new Date()
    const durationMs = this.parseDuration(duration)
    const endsAt = new Date(now.getTime() + durationMs)

    const silence = {
      matchers,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      createdBy,
      comment,
    }

    const response = await fetch(`${this.config.alertmanagerUrl}/api/v1/silences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(silence),
    })

    if (!response.ok) {
      throw new Error(`Failed to create silence: ${response.statusText}`)
    }

    const data = await response.json()
    return data.silenceID
  }

  // Query logs from Loki
  async queryLogs(
    query: string,
    start?: Date,
    end?: Date,
    limit: number = 100
  ): Promise<any> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      ...(start && { start: Math.floor(start.getTime() * 1000000).toString() }), // nanoseconds
      ...(end && { end: Math.floor(end.getTime() * 1000000).toString() }),
    })

    const response = await fetch(
      `${this.config.lokiUrl}/loki/api/v1/query_range?${params}`
    )

    if (!response.ok) {
      throw new Error(`Loki query failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Get Analytics dashboard URL
  getAnalyticsPlatformDashboardUrl(dashboardId: string, params?: Record<string, string>): string {
    const url = new URL(`${this.config.analyticsUrl}/d/${dashboardId}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    return url.toString()
  }

  // Get embedded AnalyticsPlatform panel URL
  getAnalyticsPlatformPanelUrl(
    dashboardId: string,
    panelId: number,
    params?: Record<string, string>
  ): string {
    const url = new URL(
      `${this.config.analyticsUrl}/d-solo/${dashboardId}?panelId=${panelId}`
    )
    
    // Default params for embedding
    url.searchParams.append('theme', 'light')
    url.searchParams.append('refresh', '30s')
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    return url.toString()
  }

  // Health check all monitoring services
  async checkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {}

    // Check Prometheus
    try {
      const response = await fetch(`${this.config.prometheusUrl}/-/healthy`)
      health.prometheus = response.ok
    } catch {
      health.prometheus = false
    }

    // Check AnalyticsPlatform
    try {
      const response = await fetch(`${this.config.analyticsUrl}/api/health`)
      health.analyticsPlatform = response.ok
    } catch {
      health.analyticsPlatform = false
    }

    // Check AlertManager
    try {
      const response = await fetch(`${this.config.alertmanagerUrl}/-/healthy`)
      health.alertmanager = response.ok
    } catch {
      health.alertmanager = false
    }

    // Check Loki
    try {
      const response = await fetch(`${this.config.lokiUrl}/ready`)
      health.loki = response.ok
    } catch {
      health.loki = false
    }

    // Check Jaeger
    try {
      const response = await fetch(`${this.config.jaegerUrl}/`)
      health.jaeger = response.ok
    } catch {
      health.jaeger = false
    }

    return health
  }

  // Private methods
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    
    return `${name}{${labelStr}}`
  }

  private startMetricsFlusher(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, 10000) // Flush every 10 seconds
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.size === 0) return

    try {
      // In a real implementation, this would send metrics to a remote write endpoint
      // For now, we'll just clear the buffer
      logger.debug(
        { metricsCount: this.metricsBuffer.size },
        'Flushing metrics buffer'
      )
      
      this.metricsBuffer.clear()
    } catch (error) {
      logger.error({ error }, 'Failed to flush metrics')
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid duration: ${duration}`)

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: throw new Error(`Invalid duration unit: ${unit}`)
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    
    this.removeAllListeners()
    this.metricsBuffer.clear()
    this.alertsCache.clear()
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance()