# Next.js Project Cleanup Plan

## Overview
This cleanup plan will refactor the Next.js project to work with the containerized Grafana instance instead of duplicating its functionality.

## 1. Files/Directories to Remove

### Dashboard Pages (Duplicating Grafana)
- `/app/Analytics-dashboard/` - Use Grafana dashboards instead
- `/app/analytics-demo/` - Demo no longer needed
- `/app/dashboard-demo/` - Demo no longer needed
- `/app/dashboard/` - Generic dashboard, use Grafana
- `/app/dashboards/analytics/` - Use Grafana analytics
- `/app/dashboards/analytics-engine-demo/` - Demo not needed
- `/app/dashboards/demo/` - All demo dashboards
- `/app/dashboards/folder-demo/` - Demo not needed
- `/app/dashboards/server-demo/` - Demo not needed
- `/app/dashboards/simple-server-demo/` - Demo not needed
- `/app/debug-dashboard/` - Debug in Grafana
- `/app/enhanced-dashboard/` - Use Grafana
- `/app/persistent-dashboard/` - Grafana handles persistence
- `/app/prometheus-dashboard/` - Use Grafana Prometheus integration
- `/app/test-dashboard*/` - All test dashboards
- `/app/variable-dashboard/` - Grafana has variables

### Monitoring Pages (Grafana handles this)
- `/app/monitoring/` - Entire monitoring section
- `/app/api/monitoring/` - Monitoring APIs

### Components to Remove
- `/components/dashboard/DashboardEditor*.tsx` - Use Grafana editor
- `/components/dashboard/DashboardViewer*.tsx` - Use Grafana viewer
- `/components/dashboard/GridLayout.tsx` - Grafana handles layout
- `/components/dashboard/PanelEditor.tsx` - Use Grafana panels
- `/components/dashboard/PanelRenderer.tsx` - Grafana renders panels
- `/components/dashboard/QueryBuilder.tsx` - Use Grafana query builder
- `/components/dashboard/TimeRangePicker.tsx` - Grafana has this
- `/components/dashboard/VariableEditor.tsx` - Grafana variables
- `/components/analytics/` - Most analytics components
- `/components/panels/` - Most panel components (keep only custom ones)

## 2. Files/Features to Keep

### Manufacturing-Specific Features
- `/app/equipment/` - Equipment management
- `/app/manufacturing-chat/` - AI chat interface
- `/app/production/` - Production specific features
- `/app/alerts/` - Custom alert management
- `/app/data-upload/` - Data import functionality

### Core Features
- `/app/login/`, `/app/register/` - Authentication
- `/app/profile/` - User management
- `/app/admin/` - Admin panel
- `/app/api/auth/` - Auth APIs
- `/app/api/chat/` - Chat APIs
- `/app/api/equipment/` - Equipment APIs
- `/app/api/manufacturing-metrics/` - Manufacturing APIs

### Components to Keep
- `/components/charts/ManufacturingChart.tsx` - Custom manufacturing charts
- `/components/equipment/` - All equipment components
- `/components/chat/` - Chat interface
- `/components/common/` - Common UI components
- `/components/alerts/` - Alert components

## 3. Integration Points with Grafana

### New Features to Add
1. **Grafana Embed Component** - Embed Grafana dashboards in Next.js
2. **Grafana API Integration** - Query Grafana from Next.js
3. **Single Sign-On** - Share authentication between Next.js and Grafana
4. **Dashboard Links** - Quick links to Grafana dashboards

### API Routes to Modify
- `/api/dashboards/` → Proxy to Grafana API
- `/api/monitoring/` → Query Grafana datasources

## 4. Dependencies to Remove
- Remove charting libraries that Grafana handles
- Remove dashboard-specific dependencies
- Keep only essential UI and manufacturing-specific libs

## 5. New Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages
│   ├── (manufacturing)/ # Manufacturing features
│   │   ├── equipment/
│   │   ├── production/
│   │   ├── chat/
│   │   └── alerts/
│   ├── admin/
│   ├── api/
│   │   ├── auth/
│   │   ├── equipment/
│   │   ├── manufacturing/
│   │   └── grafana-proxy/ # New Grafana integration
│   └── page.tsx         # Home with links to features
├── components/
│   ├── manufacturing/   # Manufacturing-specific
│   ├── equipment/
│   ├── chat/
│   ├── common/
│   └── grafana/        # New Grafana integration components
└── services/
    ├── manufacturing/
    └── grafana/        # Grafana API client
```

## 6. Implementation Steps

1. **Backup current state**
2. **Remove duplicate dashboard features**
3. **Create Grafana integration components**
4. **Update navigation to link to Grafana**
5. **Clean up dependencies**
6. **Test all remaining features**
7. **Update documentation**