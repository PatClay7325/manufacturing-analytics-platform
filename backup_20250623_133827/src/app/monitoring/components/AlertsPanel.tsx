'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, AlertTriangle, Info, Bell, BellOff, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  timestamp: Date
  equipment?: string
}

interface AlertsPanelProps {
  initialAlerts: {
    total: number
    critical: number
    warning: number
    info: number
    alerts: Alert[]
  }
}

export function AlertsPanel({ initialAlerts }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState(initialAlerts.alerts)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [isRealtime, setIsRealtime] = useState(true)

  // WebSocket connection for real-time alerts
  useEffect(() => {
    if (!isRealtime) return

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/alerts')

    ws.onmessage = (event) => {
      try {
        const newAlert = JSON.parse(event.data)
        setAlerts(prev => [newAlert, ...prev].slice(0, 50)) // Keep last 50 alerts
      } catch (error) {
        console.error('Failed to parse alert:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [isRealtime])

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'info':
        return <Badge variant="secondary">Info</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter)

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      })
      // Remove from local state
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          <Badge variant="outline">{filteredAlerts.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRealtime(!isRealtime)}
            className="gap-2"
          >
            {isRealtime ? (
              <>
                <Bell className="h-4 w-4" />
                Real-time
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                Paused
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href="/alerts" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'critical', 'warning', 'info'] as const).map((level) => (
          <Button
            key={level}
            variant={filter === level ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(level)}
            className="capitalize"
          >
            {level}
            {level !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {initialAlerts[level]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No {filter === 'all' ? '' : filter} alerts</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getAlertIcon(alert.severity)}
                      <h4 className="font-medium">{alert.title}</h4>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </span>
                      {alert.equipment && (
                        <>
                          <span>•</span>
                          <span>Equipment: {alert.equipment}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}