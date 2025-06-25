'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, BellOff, Clock, AlertCircle, Settings, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Alert {
  id: string
  name: string
  severity: 'critical' | 'warning' | 'info'
  state: 'firing' | 'pending' | 'inactive'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt?: Date
  endsAt?: Date
}

interface Silence {
  id: string
  matchers: Array<{ name: string; value: string; isRegex: boolean }>
  startsAt: Date
  endsAt: Date
  createdBy: string
  comment: string
}

export function AlertManager() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [silences, setSilences] = useState<Silence[]>([])
  const [isCreatingSilence, setIsCreatingSilence] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  // Fetch alerts and silences
  useEffect(() => {
    fetchAlerts()
    fetchSilences()
    
    const interval = setInterval(() => {
      fetchAlerts()
      fetchSilences()
    }, 10000) // Refresh every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alertmanager/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
      // Use mock data for demo
      setAlerts(generateMockAlerts())
    }
  }

  const fetchSilences = async () => {
    try {
      const response = await fetch('/api/monitoring/alertmanager/silences')
      if (response.ok) {
        const data = await response.json()
        setSilences(data.silences || [])
      }
    } catch (error) {
      console.error('Failed to fetch silences:', error)
    }
  }

  const createSilence = async (alert: Alert) => {
    setSelectedAlert(alert)
    setIsCreatingSilence(true)
  }

  const deleteSilence = async (id: string) => {
    try {
      await fetch(`/api/monitoring/alertmanager/silence/${id}`, {
        method: 'DELETE',
      })
      fetchSilences()
    } catch (error) {
      console.error('Failed to delete silence:', error)
    }
  }

  const getAlertIcon = (severity: string) => {
    const colors = {
      critical: 'text-red-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500',
    }
    return <AlertCircle className={`h-4 w-4 ${colors[severity as keyof typeof colors]}`} />
  }

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'firing':
        return <Badge variant="destructive">Firing</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge>{state}</Badge>
    }
  }

  return (
    <Tabs defaultValue="alerts" className="space-y-4">
      <TabsList>
        <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
        <TabsTrigger value="silences">Silences</TabsTrigger>
        <TabsTrigger value="rules">Alert Rules</TabsTrigger>
      </TabsList>

      {/* Active Alerts Tab */}
      <TabsContent value="alerts" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Active Alerts ({alerts.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active alerts</p>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getAlertIcon(alert.severity)}
                      <h4 className="font-medium">{alert.name}</h4>
                      {getStateBadge(alert.state)}
                    </div>
                    
                    {alert.annotations.summary && (
                      <p className="text-sm mb-2">{alert.annotations.summary}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(alert.labels).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                    
                    {alert.startsAt && (
                      <p className="text-xs text-muted-foreground">
                        Started {formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => createSilence(alert)}
                    className="gap-2"
                  >
                    <BellOff className="h-4 w-4" />
                    Silence
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      {/* Silences Tab */}
      <TabsContent value="silences" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Active Silences ({silences.length})</h3>
          <Button size="sm" onClick={() => setIsCreatingSilence(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Silence
          </Button>
        </div>

        <div className="space-y-3">
          {silences.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active silences</p>
            </Card>
          ) : (
            silences.map((silence) => (
              <Card key={silence.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BellOff className="h-4 w-4" />
                      <h4 className="font-medium">Silence</h4>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    
                    <p className="text-sm mb-2">{silence.comment}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {silence.matchers.map((matcher, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {matcher.name}: {matcher.value}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>By: {silence.createdBy}</span>
                      <span>•</span>
                      <span>
                        Expires {formatDistanceToNow(new Date(silence.endsAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSilence(silence.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      {/* Alert Rules Tab */}
      <TabsContent value="rules" className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Alert Rules Configuration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Alert rules are configured in Prometheus. Use the links below to manage them:
          </p>
          <div className="space-y-2">
            <Button variant="outline" asChild>
              <a href="http://localhost:9090/rules" target="_blank" rel="noopener noreferrer">
                View Prometheus Rules
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="http://localhost:9090/alerts" target="_blank" rel="noopener noreferrer">
                View Alert Status
              </a>
            </Button>
          </div>
        </Card>
      </TabsContent>

      {/* Create Silence Dialog */}
      {isCreatingSilence && (
        <CreateSilenceDialog
          alert={selectedAlert}
          onClose={() => {
            setIsCreatingSilence(false)
            setSelectedAlert(null)
          }}
          onSuccess={() => {
            setIsCreatingSilence(false)
            setSelectedAlert(null)
            fetchSilences()
          }}
        />
      )}
    </Tabs>
  )
}

// Silence creation dialog component
function CreateSilenceDialog({ 
  alert, 
  onClose, 
  onSuccess 
}: { 
  alert: Alert | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [duration, setDuration] = useState('2h')
  const [comment, setComment] = useState('')

  const handleCreate = async () => {
    // Implementation for creating silence
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-lg font-medium mb-4">Create Silence</h3>
        
        {alert && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <p className="text-sm font-medium">{alert.name}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(alert.labels).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="2h">2 hours</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="8h">8 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Comment</Label>
            <Textarea
              placeholder="Reason for silencing..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Silence
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Generate mock alerts for demo
function generateMockAlerts(): Alert[] {
  return [
    {
      id: '1',
      name: 'ManufacturingOEECriticalLow',
      severity: 'critical',
      state: 'firing',
      labels: {
        equipment_id: 'equip-001',
        equipment_name: 'Assembly Line 1',
        line: 'production-1',
      },
      annotations: {
        summary: 'Critical: OEE below 50% on Assembly Line 1',
        description: 'Equipment Assembly Line 1 has OEE of 45% which is critically low.',
      },
      startsAt: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      id: '2',
      name: 'EquipmentTemperatureHigh',
      severity: 'warning',
      state: 'firing',
      labels: {
        equipment_id: 'equip-003',
        sensor: 'temp-sensor-01',
      },
      annotations: {
        summary: 'High temperature detected on equipment',
        description: 'Temperature reading of 85°C exceeds threshold of 80°C',
      },
      startsAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  ]
}