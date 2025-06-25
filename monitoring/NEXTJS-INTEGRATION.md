# Next.js Monitoring Integration Guide

## Overview

This guide explains how the monitoring infrastructure integrates with the Next.js manufacturing analytics platform, following modern React and Next.js best practices.

## 🏗️ Architecture

```
┌─────────────────────────┐     ┌──────────────────────┐
│   Next.js Application   │────▶│  Monitoring Stack    │
├─────────────────────────┤     ├──────────────────────┤
│ • Server Components     │     │ • Prometheus         │
│ • API Routes           │     │ • manufacturingPlatform            │
│ • Client Components    │     │ • Loki               │
│ • Monitoring Service   │     │ • Jaeger             │
└─────────────────────────┘     └──────────────────────┘
            │                              ▲
            └──────────────────────────────┘
                    Metrics Flow
```

## 📊 Monitoring Dashboard Page

The main monitoring interface is available at `/monitoring` with the following features:

### Server Components (Default)
- **Page Component**: Fetches initial data server-side
- **Actions**: Server functions for data fetching
- **Caching**: Next.js unstable_cache for performance

### Client Components (Interactive)
- **SystemHealth**: Real-time service status
- **MetricsOverview**: Interactive charts with Recharts
- **AlertsPanel**: WebSocket for live alerts
- **LogViewer**: Streaming logs interface
- **GrafanaDashboard**: Embedded manufacturingPlatform panels

## 🚀 Key Features

### 1. Real-time Metrics Streaming
```typescript
// WebSocket connection for live updates
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001/metrics')
  ws.onmessage = (event) => {
    const metric = JSON.parse(event.data)
    updateChart(metric)
  }
}, [])
```

### 2. Server-Side Data Fetching
```typescript
// Parallel data fetching with caching
const [systemStatus, activeAlerts, metricsSummary] = await Promise.all([
  getSystemStatus(),
  getActiveAlerts(),
  getMetricsSummary(),
])
```

### 3. Monitoring Service Integration
```typescript
import { monitoringService } from '@/lib/monitoring/MonitoringService'

// Record custom metrics
monitoringService.recordMetric('custom_metric', value, { 
  equipment_id: 'equip-001' 
})

// Query Prometheus
const results = await monitoringService.queryPrometheus(
  'avg(manufacturing_oee_score)',
  new Date(Date.now() - 3600000),
  new Date()
)
```

## 📈 API Routes

### `/api/monitoring/system-status`
Returns health status of all monitoring services

### `/api/monitoring/metrics`
Fetches aggregated metrics for charts

### `/api/monitoring/logs`
Queries logs from Loki with filtering

### `/api/monitoring/query`
Execute custom PromQL queries

### `/api/monitoring/alertmanager/*`
Manage alerts and silences

## 🔧 Usage Examples

### 1. Display Real-time OEE
```tsx
import { MetricsOverview } from '@/app/monitoring/components/MetricsOverview'

export default function DashboardPage() {
  return (
    <div>
      <h1>Manufacturing Dashboard</h1>
      <MetricsOverview />
    </div>
  )
}
```

### 2. Embed manufacturingPlatform Panel
```tsx
import { monitoringService } from '@/lib/monitoring/MonitoringService'

export default function EquipmentPage() {
  const panelUrl = monitoringService.getManufacturingPlatformPanelUrl(
    'manufacturing-overview',
    42, // Panel ID
    { 
      'var-equipment': 'equip-001',
      from: 'now-6h',
      to: 'now'
    }
  )

  return (
    <iframe 
      src={panelUrl}
      className="w-full h-96 border-0"
    />
  )
}
```

### 3. Custom Metric Recording
```tsx
// In your API routes or server components
import { manufacturingMetrics } from '@/lib/observability/metrics'

export async function POST(req: Request) {
  const start = Date.now()
  
  try {
    // Your business logic
    const result = await processManufacturingData()
    
    // Record success metric
    manufacturingMetrics.apiRequests.inc({
      method: 'POST',
      route: '/api/manufacturing',
      status: '200'
    })
    
    return Response.json(result)
  } catch (error) {
    // Record error metric
    manufacturingMetrics.apiRequests.inc({
      method: 'POST',
      route: '/api/manufacturing',
      status: '500'
    })
    
    throw error
  } finally {
    // Record duration
    manufacturingMetrics.apiDuration.observe(
      { route: '/api/manufacturing' },
      (Date.now() - start) / 1000
    )
  }
}
```

### 4. Alert Integration
```tsx
// Subscribe to alerts in your components
useEffect(() => {
  monitoringService.on('alert:new', (alert) => {
    showNotification({
      title: alert.name,
      message: alert.annotations.summary,
      severity: alert.severity
    })
  })

  return () => {
    monitoringService.removeAllListeners('alert:new')
  }
}, [])
```

## 🎨 UI Components

### Pre-built Components
- `SystemHealth`: Service status overview
- `MetricsOverview`: Manufacturing metrics charts
- `AlertsPanel`: Active alerts display
- `LogViewer`: Real-time log streaming
- `ManufacturingPlatformDashboard`: Embedded dashboards
- `MetricsExplorer`: PromQL query interface
- `AlertManager`: Alert management UI

### Using Monitoring Components
```tsx
import { AlertsPanel } from '@/app/monitoring/components/AlertsPanel'
import { getActiveAlerts } from '@/app/monitoring/actions'

export default async function OperationsPage() {
  const alerts = await getActiveAlerts()
  
  return (
    <div>
      <h1>Operations Center</h1>
      <AlertsPanel initialAlerts={alerts} />
    </div>
  )
}
```

## 🔐 Security Considerations

### 1. Metrics Endpoint Protection
The `/api/metrics` endpoint includes security checks:
```typescript
const isInternal = req.headers.get('x-forwarded-for')?.includes('10.') || 
                  req.headers.get('user-agent')?.includes('Prometheus')

if (!isInternal && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 2. manufacturingPlatform Embedding
- Use read-only user for embedded panels
- Configure CORS headers properly
- Implement CSP headers for iframe security

### 3. WebSocket Security
- Implement authentication for WebSocket connections
- Use WSS in production
- Rate limit connections

## 📊 Performance Optimization

### 1. Data Caching
```typescript
export const getSystemStatus = unstable_cache(
  async () => {
    // Expensive operation
  },
  ['system-status'],
  {
    revalidate: 30, // Cache for 30 seconds
    tags: ['monitoring'],
  }
)
```

### 2. Streaming SSR
```typescript
export default async function MonitoringPage() {
  return (
    <div>
      <Suspense fallback={<LoadingSkeleton />}>
        <SystemHealth />
      </Suspense>
      <Suspense fallback={<LoadingSkeleton />}>
        <MetricsOverview />
      </Suspense>
    </div>
  )
}
```

### 3. Client-Side Optimization
- Use React.memo for chart components
- Implement windowing for large datasets
- Throttle WebSocket updates

## 🚀 Deployment Considerations

### 1. Environment Variables
```env
# Add to .env.production
PROMETHEUS_URL=http://prometheus:9090
MANUFACTURING_PLATFORM_URL=http://manufacturingPlatform:3000
ALERTMANAGER_URL=http://alertmanager:9093
LOKI_URL=http://loki:3100
JAEGER_URL=http://jaeger:16686
```

### 2. Docker Network
Ensure Next.js container can reach monitoring services:
```yaml
services:
  nextjs-app:
    networks:
      - monitoring
    depends_on:
      - prometheus
      - manufacturingPlatform
```

### 3. Production Optimizations
- Enable Prometheus remote write for scalability
- Use manufacturingPlatform image renderer for snapshots
- Configure proper resource limits
- Implement monitoring for the monitoring stack

## 📚 Additional Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Prometheus Client Library](https://github.com/siimon/prom-client)
- [manufacturingPlatform Embedding Guide](https://manufacturingPlatform.com/docs/manufacturingPlatform/latest/administration/embed/)
- [React Server Components](https://react.dev/reference/react/use-server)

## 🆘 Troubleshooting

### Common Issues

1. **Metrics not appearing in Prometheus**
   - Check if Next.js app is running
   - Verify Prometheus can reach the metrics endpoint
   - Check Prometheus targets page

2. **manufacturingPlatform panels not loading**
   - Verify manufacturingPlatform datasources are configured
   - Check browser console for CORS errors
   - Ensure authentication is configured

3. **WebSocket connection failing**
   - Check if WebSocket server is running
   - Verify firewall rules
   - Check browser console for errors

4. **Slow dashboard loading**
   - Implement proper caching strategies
   - Use streaming SSR
   - Optimize Prometheus queries

For more help, check the logs:
```bash
# Next.js logs
docker logs manufacturing-nextjs

# Monitoring service logs
docker-compose logs prometheus manufacturingPlatform
```