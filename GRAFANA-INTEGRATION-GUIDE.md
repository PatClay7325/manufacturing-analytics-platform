# Analytics UI Integration Guide

This guide explains how the Analytics UI has been fully integrated into the Manufacturing Analytics Platform, based on the factory-core-njs implementation.

## Overview

The integration includes:
- Complete Analytics sidebar navigation with collapse/expand functionality
- Tabbed dashboard interface with multiple views
- Real-time panel embedding from our analytics system server
- Responsive design with mobile support
- Centralized configuration for easy management

## Architecture

### 1. Layout Components

#### DashboardLayout (`/src/components/layout/DashboardLayout.tsx`)
- Provides the main Analytics layout with collapsible sidebar
- Implements sidebar context for state management
- Includes mobile-responsive hamburger menu
- Features hierarchical navigation with expandable sections

Key features:
- Sidebar collapse/expand with localStorage persistence
- Mobile-responsive design
- Search functionality
- User menu
- Time range and filter controls

#### Navigation Structure
```
Dashboards
├── Home
├── Browse
├── Manufacturing Overview
├── OEE Analytics
├── Equipment Health
├── Production Lines
├── Quality Control
├── Maintenance
└── Root Cause Analysis

Observe
├── Alerts
├── Real-time Metrics
├── Event Logs
└── Performance Traces

Apps
├── Manufacturing AI
├── Integrations
└── Reports

Configuration
├── Data sources
├── Users
├── Teams
├── Plugins
├── Preferences
├── API keys
└── Security
```

### 2. Dashboard Components

#### ManufacturingDashboard (`/src/components/dashboard/ManufacturingDashboard.tsx`)
Main dashboard component with:
- 6 different tab views (Overview, OEE, Production, Quality, Maintenance, RCA)
- Time range selection
- Equipment filtering
- Refresh controls
- Fullscreen mode

#### AnalyticsPanel (`/src/components/grafana/AnalyticsPanel.tsx`)
Individual panel component that:
- Embeds Analytics panels via iframe
- Handles loading states and errors
- Supports grid positioning
- Includes panel controls (view, share, expand)
- Injects styles to hide Analytics chrome

#### DashboardEmbed (`/src/components/grafana/DashboardEmbed.tsx`)
Low-level iframe embedding component for custom implementations.

### 3. Configuration

#### Centralized Config (`/src/config/Analytics.config.ts`)
```typescript
export const GRAFANA_CONFIG = {
  baseUrl: 'http://localhost:3002',
  orgId: 1,
  theme: 'light',
  dashboard: {
    uid: 'manufacturing-main',
    name: 'manufacturing-dashboard',
    title: 'Manufacturing Intelligence Dashboard'
  },
  panels: {
    oee: 1,
    oeeGauge: 2,
    oeeTrend: 3,
    // ... all panel IDs
  },
  timeRanges: {
    last24h: { from: 'now-24h', to: 'now' },
    // ... other ranges
  }
};
```

## Usage

### Basic Dashboard Page
```typescript
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Manufacturing Dashboard"
        defaultTimeRange="last7d"
        defaultEquipment="all"
        defaultTabIndex={0}
      />
    </DashboardLayout>
  );
}
```

### Individual Panel Embedding
```typescript
import { AnalyticsPanel } from '@/components/grafana/AnalyticsPanel';
import { GRAFANA_CONFIG } from '@/config/Analytics.config';

<AnalyticsPanel
  dashboardUid={GRAFANA_CONFIG.dashboard.uid}
  panelId={GRAFANA_CONFIG.panels.oee}
  title="OEE Metrics"
  timeRange={{ from: 'now-24h', to: 'now' }}
  height="400px"
  gridPos={{ h: 4, w: 12, x: 0, y: 0 }}
/>
```

### Custom Embed
```typescript
import { DashboardEmbed } from '@/components/grafana/DashboardEmbed';

<DashboardEmbed
  dashboardUrl="http://localhost:3002/d/manufacturing-main/dashboard?kiosk"
  height="600px"
  width="100%"
  showLoadingIndicator={true}
/>
```

## Features

### 1. Sidebar Features
- **Collapsible**: Click chevron icon to collapse/expand
- **Persistent State**: Sidebar state saved to localStorage
- **Mobile Responsive**: Automatically collapses on small screens
- **Search**: Quick dashboard search functionality
- **Hierarchical Navigation**: Expandable sections for organized navigation

### 2. Dashboard Features
- **Tabbed Interface**: 6 different dashboard views
- **Time Range Selection**: Quick time range picker
- **Equipment Filtering**: Filter by specific equipment
- **Refresh Control**: Manual refresh with loading indicator
- **Fullscreen Mode**: Expand dashboard to fullscreen
- **Connection Status**: Shows Analytics server connection status

### 3. Panel Features
- **Auto-loading**: Panels load automatically when Analytics is available
- **Error Handling**: Graceful error states with helpful messages
- **Loading States**: Smooth loading indicators
- **Grid Positioning**: Analytics 24-column grid system
- **Panel Controls**: View, share, expand options

## Prerequisites

1. **Analytics Server**: Must be running on port 3002
2. **Dashboard Setup**: Manufacturing dashboard must be configured in Analytics
3. **CORS Configuration**: Analytics must allow embedding from your domain

## Configuration Steps

1. **Start Analytics**:
   ```bash
   docker-compose up -d grafana
   ```

2. **Configure Analytics** (grafana.ini):
   ```ini
   [security]
   allow_embedding = true
   
   [auth.anonymous]
   enabled = true
   org_role = Viewer
   ```

3. **Update Environment Variables**:
   ```env
   NEXT_PUBLIC_Analytics_URL=http://localhost:3002
   ```

4. **Create Dashboard in Analytics**:
   - Import dashboard JSON from `/grafana/dashboards/`
   - Note the dashboard UID
   - Update `GRAFANA_CONFIG.dashboard.uid` if needed

## Routes Created

- `/Analytics-dashboard` - Main manufacturing dashboard
- `/dashboards/browse` - Dashboard browser
- `/dashboards/oee` - OEE Analytics Dashboard
- `/dashboards/production` - Production dashboard
- `/dashboards/quality` - Quality Control dashboard
- `/dashboards/maintenance` - Maintenance dashboard
- `/dashboards/rca` - Root Cause Analysis dashboard

## Customization

### Adding New Panels
1. Add panel ID to `GRAFANA_CONFIG.panels`
2. Create panel in Analytics Dashboard
3. Use `AnalyticsPanel` component to embed

### Modifying Navigation
1. Edit `navTree` in `DashboardLayout`
2. Add corresponding routes in `/app/dashboards/`

### Styling
- Colors defined in Tailwind config
- Light theme by default (configurable in GRAFANA_CONFIG)
- Responsive breakpoints: lg (1024px) for sidebar behavior

## Troubleshooting

### Analytics Not Connecting
- Check Analytics is running: `docker ps | grep grafana`
- Verify URL in browser: `http://localhost:3002`
- Check browser console for CORS errors

### Panels Not Loading
- Verify dashboard UID matches config
- Check panel IDs are correct
- Ensure anonymous access is enabled in Analytics

### Sidebar Issues
- Clear localStorage: `localStorage.removeItem('grafanaSidebarCollapsed')`
- Check for JavaScript errors in console

## Best Practices

1. **Performance**: Use panel IDs instead of full dashboard embeds when possible
2. **Security**: Configure Analytics viewer role for anonymous access
3. **Responsiveness**: Test on multiple screen sizes
4. **Error Handling**: Always provide fallback UI for connection errors
5. **Configuration**: Keep all Analytics settings in centralized config file

## Next Steps

1. Configure real data sources in Analytics (Prometheus, InfluxDB, etc.)
2. Create custom panels for specific manufacturing metrics
3. Implement user-specific dashboards with authentication
4. Add dashboard templating for multi-tenant scenarios
5. Integrate alerting with notification channels