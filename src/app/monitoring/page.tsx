import { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { MonitoringTabs } from './components/MonitoringTabs'
import { getSystemStatus, getActiveAlerts, getMetricsSummary } from './actions'

export const metadata: Metadata = {
  title: 'System Monitoring | Manufacturing Analytics',
  description: 'Real-time monitoring and observability dashboard',
}

// Force dynamic rendering as this page accesses database and external services
export const dynamic = 'force-dynamic'

export default async function MonitoringPage() {
  // Parallel data fetching for initial load
  const [systemStatus, activeAlerts, metricsSummary] = await Promise.all([
    getSystemStatus(),
    getActiveAlerts(),
    getMetricsSummary(),
  ])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Real-time monitoring, metrics, and observability for the manufacturing platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">System Health</h3>
          <p className="text-2xl font-bold mt-2">
            {systemStatus.healthy ? (
              <span className="text-green-600">Healthy</span>
            ) : (
              <span className="text-red-600">Degraded</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {systemStatus.services.filter(s => s.status === 'up').length}/{systemStatus.services.length} services running
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Active Alerts</h3>
          <p className="text-2xl font-bold mt-2">{activeAlerts.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeAlerts.critical} critical, {activeAlerts.warning} warning
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Avg Response Time</h3>
          <p className="text-2xl font-bold mt-2">{metricsSummary.avgResponseTime}ms</p>
          <p className="text-xs text-muted-foreground mt-1">Last 5 minutes</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Error Rate</h3>
          <p className="text-2xl font-bold mt-2">{metricsSummary.errorRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Last hour</p>
        </Card>
      </div>

      {/* Main Monitoring Tabs */}
      <MonitoringTabs systemStatus={systemStatus} activeAlerts={activeAlerts} />
    </div>
  )
}