/**
 * Deployment Metrics Component
 * Displays real-time metrics with loading states and error handling
 */

import { memo } from 'react'
import { Card } from '@/components/common/Card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { DeploymentStats, DeploymentMetrics } from '../types'

interface DeploymentMetricsProps {
  stats: DeploymentStats
  metrics?: DeploymentMetrics
  loading?: boolean
}

// Memoized metric card to prevent unnecessary re-renders
const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendValue,
  variant = 'default' 
}: {
  title: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  variant?: 'default' | 'success' | 'error' | 'warning'
}) {
  const trendIcon = trend === 'up' 
    ? <ArrowUpIcon className="h-4 w-4" />
    : trend === 'down' 
    ? <ArrowDownIcon className="h-4 w-4" />
    : <MinusIcon className="h-4 w-4" />

  const trendColor = trend === 'up' 
    ? 'text-green-600' 
    : trend === 'down' 
    ? 'text-red-600' 
    : 'text-gray-600'

  const variantStyles = {
    default: 'bg-white dark:bg-gray-800',
    success: 'bg-green-50 dark:bg-green-900/20',
    error: 'bg-red-50 dark:bg-red-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20'
  }

  return (
    <Card className={`p-6 ${variantStyles[variant]}`}>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        {unit && (
          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
            {unit}
          </span>
        )}
      </div>
      {trend && (
        <div className={`mt-2 flex items-center text-sm ${trendColor}`}>
          {trendIcon}
          <span className="ml-1">
            {trendValue !== undefined ? `${Math.abs(trendValue)}%` : trend}
          </span>
        </div>
      )}
    </Card>
  )
})

export function DeploymentMetrics({ stats, metrics, loading }: DeploymentMetricsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Deployments"
          value={stats.totalDeployments}
          trend="up"
          trendValue={12}
        />
        <MetricCard
          title="Success Rate"
          value={`${stats.deploymentSuccessRate.toFixed(1)}%`}
          trend={stats.deploymentSuccessRate > 95 ? 'up' : 'down'}
          variant={stats.deploymentSuccessRate > 95 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Avg Deployment Time"
          value={formatDuration(stats.averageDeploymentTime)}
          trend="stable"
        />
        <MetricCard
          title="Failed Deployments"
          value={stats.failedDeployments}
          trend={stats.failedDeployments > 0 ? 'up' : 'stable'}
          variant={stats.failedDeployments > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Compliance & Security Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Compliance Score</h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  {getComplianceLevel(stats.complianceScore)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {stats.complianceScore}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div 
                style={{ width: `${stats.complianceScore}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Security Score</h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  {getSecurityLevel(stats.securityScore)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {stats.securityScore}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
              <div 
                style={{ width: `${stats.securityScore}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Deployment Rate</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metrics.deploymentRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Success Rate Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.successRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

function getComplianceLevel(score: number): string {
  if (score >= 95) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Improvement'
}

function getSecurityLevel(score: number): string {
  if (score >= 90) return 'Secure'
  if (score >= 75) return 'Moderate'
  if (score >= 50) return 'At Risk'
  return 'Critical'
}