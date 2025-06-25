'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/ui/button'
import { AlertBadge } from '@/components/alerts/AlertBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeploymentMetrics } from './DeploymentMetrics'
import { ActiveDeploymentsList } from './ActiveDeploymentsList'
import { ComplianceStatus } from './ComplianceStatus'
import { SecurityOverview } from './SecurityOverview'
import { DeploymentForm } from './DeploymentForm'
import { useDeploymentStore } from '../hooks/useDeploymentStore'
import { useDeploymentMetrics } from '../hooks/useDeploymentMetrics'
import type { DeploymentStats, ActiveDeployment } from '../types'

interface DeploymentDashboardProps {
  initialStats: DeploymentStats
  initialDeployments: ActiveDeployment[]
}

export function DeploymentDashboard({ 
  initialStats, 
  initialDeployments 
}: DeploymentDashboardProps) {
  const [isPending, startTransition] = useTransition()
  const [showDeploymentForm, setShowDeploymentForm] = useState(false)
  
  // Zustand store for state management
  const { 
    deployments, 
    stats, 
    updateDeployments, 
    updateStats 
  } = useDeploymentStore()

  // Real-time metrics hook
  const { metrics, isLoading: metricsLoading } = useDeploymentMetrics({
    refreshInterval: 30000 // 30 seconds
  })

  // Initialize store with server data
  useState(() => {
    updateStats(initialStats)
    updateDeployments(initialDeployments)
  })

  const handleNewDeployment = useCallback(() => {
    setShowDeploymentForm(true)
  }, [])

  const handleDeploymentComplete = useCallback((deployment: ActiveDeployment) => {
    startTransition(() => {
      updateDeployments([deployment, ...deployments])
      setShowDeploymentForm(false)
    })
  }, [deployments, updateDeployments])

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <AlertBadge 
              count={stats.failedDeployments} 
              variant="error"
              label="Failed Deployments"
            />
            <AlertBadge 
              count={stats.pendingDeployments} 
              variant="warning"
              label="Pending"
            />
          </div>
          <Button 
            onClick={handleNewDeployment}
            disabled={isPending}
          >
            New Deployment
          </Button>
        </div>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deployments">Active Deployments</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DeploymentMetrics 
            stats={stats} 
            metrics={metrics}
            loading={metricsLoading}
          />
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <ActiveDeploymentsList 
            deployments={deployments}
            onRefresh={() => {
              startTransition(() => {
                // Trigger refresh
              })
            }}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceStatus />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityOverview />
        </TabsContent>
      </Tabs>

      {/* Deployment Form Modal */}
      {showDeploymentForm && (
        <DeploymentForm
          onClose={() => setShowDeploymentForm(false)}
          onComplete={handleDeploymentComplete}
        />
      )}
    </div>
  )
}