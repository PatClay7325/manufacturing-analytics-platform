'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { SystemHealth } from './SystemHealth'
import { MetricsOverview } from './MetricsOverview'
import { AlertsPanel } from './AlertsPanel'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { LogViewer } from './LogViewer'
import { MetricsExplorer } from './MetricsExplorer'
import { AlertManager } from './AlertManager'

interface MonitoringTabsProps {
  systemStatus: any
  activeAlerts: any
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 rounded-lg"></div>
    </div>
  )
}

export function MonitoringTabs({ systemStatus, activeAlerts }: MonitoringTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid grid-cols-5 w-full max-w-2xl">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

      {/* Analytics Tab */}
      <TabsContent value="analytics" className="space-y-4">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analytics Dashboards</h2>
          <Suspense fallback={<LoadingSkeleton />}>
            <AnalyticsDashboard />
          </Suspense>
        </Card>
      </TabsContent>
    </Tabs>
  )
}