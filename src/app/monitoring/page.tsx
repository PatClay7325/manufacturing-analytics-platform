import { Suspense } from 'react'
import { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetricsOverview } from './components/MetricsOverview'
import { AlertsPanel } from './components/AlertsPanel'
import { SystemHealth } from './components/SystemHealth'
import { GrafanaDashboard } from './components/GrafanaDashboard'
import { LogViewer } from './components/LogViewer'
import { getSystemStatus, getActiveAlerts, getMetricsSummary } from './actions'

export const metadata: Metadata = {
  title: 'System Monitoring | Manufacturing Analytics',
  description: 'Real-time monitoring and observability dashboard',
}

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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="grafana">Grafana</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<LoadingSkeleton />}>
            <SystemHealth initialData={systemStatus} />
          </Suspense>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <MetricsOverview />
            </Suspense>
            
            <Suspense fallback={<LoadingSkeleton />}>
              <AlertsPanel initialAlerts={activeAlerts} />
            </Suspense>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Real-time Metrics</h2>
            <Suspense fallback={<LoadingSkeleton />}>
              <MetricsExplorer />
            </Suspense>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Alert Management</h2>
            <Suspense fallback={<LoadingSkeleton />}>
              <AlertManager />
            </Suspense>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Log Viewer</h2>
            <Suspense fallback={<LoadingSkeleton />}>
              <LogViewer />
            </Suspense>
          </Card>
        </TabsContent>

        {/* Grafana Tab */}
        <TabsContent value="grafana" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Grafana Dashboards</h2>
            <Suspense fallback={<LoadingSkeleton />}>
              <GrafanaDashboard />
            </Suspense>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 rounded-lg"></div>
    </div>
  )
}

// Client components that will be created separately
import { MetricsExplorer } from './components/MetricsExplorer'
import { AlertManager } from './components/AlertManager'