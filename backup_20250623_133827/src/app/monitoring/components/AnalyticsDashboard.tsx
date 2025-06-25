'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react'

const ANALYTICS_DASHBOARDS = [
  {
    id: 'manufacturing-overview',
    name: 'Manufacturing Overview',
    description: 'Real-time OEE, production metrics, and equipment status',
  },
  {
    id: 'equipment-performance',
    name: 'Equipment Performance',
    description: 'Detailed equipment metrics and maintenance tracking',
  },
  {
    id: 'quality-metrics',
    name: 'Quality Metrics',
    description: 'Quality control, defect rates, and SPC charts',
  },
  {
    id: 'system-health',
    name: 'System Health',
    description: 'Infrastructure monitoring and performance metrics',
  },
]

export function AnalyticsDashboard() {
  const [selectedDashboard, setSelectedDashboard] = useState(ANALYTICS_DASHBOARDS[0].id)
  const [timeRange, setTimeRange] = useState('now-1h')
  const [refreshInterval, setRefreshInterval] = useState('30s')
  const [key, setKey] = useState(0) // Force iframe refresh

  const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:3003'
  const dashboard = ANALYTICS_DASHBOARDS.find(d => d.id === selectedDashboard)

  const iframeSrc = `${analyticsUrl}/d/${selectedDashboard}?orgId=1&from=${timeRange}&to=now&refresh=${refreshInterval}&kiosk&theme=light`

  const handleRefresh = () => {
    setKey(prev => prev + 1)
  }

  const openInAnalytics = () => {
    window.open(`${analyticsUrl}/d/${selectedDashboard}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium mb-1">Dashboard Selection</h3>
            <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYTICS_DASHBOARDS.map(dash => (
                  <SelectItem key={dash.id} value={dash.id}>
                    <div>
                      <div className="font-medium">{dash.name}</div>
                      <div className="text-sm text-muted-foreground">{dash.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now-5m">Last 5 minutes</SelectItem>
                <SelectItem value="now-15m">Last 15 minutes</SelectItem>
                <SelectItem value="now-30m">Last 30 minutes</SelectItem>
                <SelectItem value="now-1h">Last hour</SelectItem>
                <SelectItem value="now-6h">Last 6 hours</SelectItem>
                <SelectItem value="now-12h">Last 12 hours</SelectItem>
                <SelectItem value="now-24h">Last 24 hours</SelectItem>
                <SelectItem value="now-7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={refreshInterval} onValueChange={setRefreshInterval}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5s">5 seconds</SelectItem>
                <SelectItem value="10s">10 seconds</SelectItem>
                <SelectItem value="30s">30 seconds</SelectItem>
                <SelectItem value="1m">1 minute</SelectItem>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              title="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={openInAnalytics}
              title="Open in Analytics"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Analytics Iframe */}
      <Card className="p-0 overflow-hidden">
        <div className="relative bg-gray-50 dark:bg-gray-900">
          <iframe
            key={key}
            src={iframeSrc}
            className="w-full h-[600px] border-0"
            title={dashboard?.name}
            allow="fullscreen"
          />
          
          {/* Overlay to prevent iframe interaction issues */}
          <div className="absolute top-2 right-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const iframe = document.querySelector('iframe')
                if (iframe?.requestFullscreen) {
                  iframe.requestFullscreen()
                }
              }}
              className="gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Info */}
      <Card className="p-4">
        <h4 className="font-medium mb-2">About This Dashboard</h4>
        <p className="text-sm text-muted-foreground mb-3">
          {dashboard?.description}
        </p>
        <div className="flex gap-4 text-sm">
          <a
            href={`${analyticsUrl}/d/${selectedDashboard}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            Open in Analytics
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={`${analyticsUrl}/dashboard/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            Create New Dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </div>
  )
}