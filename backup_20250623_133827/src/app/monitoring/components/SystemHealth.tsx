'use client'

import { useEffect, useState } from 'react'

interface SystemService {
  name: string
  status: 'up' | 'down' | 'degraded'
  lastCheck: Date
  responseTime?: number
}

interface SystemHealthProps {
  initialData: {
    healthy: boolean
    services: SystemService[]
    lastUpdated: Date
  }
}

export function SystemHealth({ initialData }: SystemHealthProps) {
  const [data, setData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true)
      try {
        const response = await fetch('/api/monitoring/system-status')
        if (response.ok) {
          const newData = await response.json()
          setData(newData)
        }
      } catch (error) {
        console.error('Failed to refresh system status:', error)
      } finally {
        setIsRefreshing(false)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <span role="img" aria-label="up">✅</span>
      case 'down':
        return <span role="img" aria-label="down">❌</span>
      case 'degraded':
        return <span role="img" aria-label="degraded">⚠️</span>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'up':
        return <span className="badge-success">Operational</span>
      case 'down':
        return <span className="badge-destructive">Down</span>
      case 'degraded':
        return <span className="badge-warning">Degraded</span>
      default:
        return <span className="badge-secondary">Unknown</span>
    }
  }

  const uptimePercentage = (data.services.filter(s => s.status === 'up').length / data.services.length) * 100

  return (
    <div className="monitoring-system-health">
      <div className="header">
        <div className="title-section">
          <h2>System Health</h2>
          <p>
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="uptime-section">
          <p className="uptime-percentage">
            {uptimePercentage.toFixed(1)}%
          </p>
          <p>Uptime</p>
        </div>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${uptimePercentage}%` }}
        />
      </div>

      <div className="services-list">
        {data.services.map((service) => (
          <div key={service.name} className="service-item">
            <div className="service-info">
              {getStatusIcon(service.status)}
              <div className="service-details">
                <p className="service-name">{service.name}</p>
                <p className="service-meta">
                  <span className="last-check">
                    {new Date(service.lastCheck).toLocaleTimeString()}
                  </span>
                  {service.responseTime && (
                    <>
                      <span> • </span>
                      <span className="response-time">
                        {service.responseTime}ms
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            {getStatusBadge(service.status)}
          </div>
        ))}
      </div>

      {!data.healthy && (
        <div className="health-warning">
          <p>
            ⚠️ System health is degraded. Some services are experiencing issues.
          </p>
        </div>
      )}
    </div>
  )
}