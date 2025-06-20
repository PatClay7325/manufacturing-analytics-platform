# Grafana Comprehensive Routing Map

This document provides a detailed map of all routes and navigation paths in the Grafana application.

## Main Navigation Structure

### 1. Create Section (sortWeight: -1900)
- **URL:** `/dashboard/new`
- **Icon:** `plus`
- **Children:**
  - **Dashboard** - `/dashboard/new` - Icon: `apps`
  - **Folder** - `/dashboards/folder/new` - Icon: `folder-plus` - Create a new folder to organize your dashboards
  - **Import** - `/dashboard/import` - Icon: `import` - Import dashboard from file or Grafana.com
  - **Alert rule** - `/alerting/new` - Icon: `bell` - Create an alert rule

### 2. Dashboards Section (sortWeight: -1800)
- **URL:** `/`
- **Icon:** `apps`
- **SubTitle:** Manage dashboards and folders
- **Children:**
  - **Home** - `/` - Icon: `home-alt` (hidden from tabs)
  - **Browse** - `/dashboards` - Icon: `sitemap`
  - **Playlists** - `/playlists` - Icon: `presentation-play`

### 3. Explore Section (sortWeight: -1700)
- **URL:** `/explore`
- **Icon:** `compass`
- **SubTitle:** Explore your data

### 4. Alerting Section (sortWeight: -1600)
- **URL:** `/alerting/list`
- **Icon:** `bell`
- **SubTitle:** Alert rules and notifications
- **Children:**
  - **Alert rules** - `/alerting/list` - Icon: `list-ul`
  - **Contact points** - `/alerting/notifications` - Icon: `comment-alt-share`
  - **Notification policies** - `/alerting/routes` - Icon: `sitemap`
  - **Silences** - `/alerting/silences` - Icon: `bell-slash`
  - **Alert groups** - `/alerting/groups` - Icon: `layer-group`
  - **Admin** - `/alerting/admin` - Icon: `cog`

### 5. Grafana Plugin Sections (sortWeight: -1500)
- **Grafana Logs Drilldown** - `/a/grafana-lokiexplore-app/explore` - Image: `public/plugins/grafana-lokiexplore-app/img/logo.svg`
- **Grafana Metrics Drilldown** - `/a/grafana-metricsdrilldown-app/drilldown` - Image: `public/plugins/grafana-metricsdrilldown-app/img/logo.svg`
- **Grafana Profiles Drilldown** - `/a/grafana-pyroscope-app/explore` - Image: `public/plugins/grafana-pyroscope-app/img/logo.svg`
- **Grafana Traces Drilldown** - `/a/grafana-exploretraces-app/` - Image: `public/plugins/grafana-exploretraces-app/img/logo.svg`

### 6. Configuration Section (sortWeight: -1400)
- **URL:** `/datasources`
- **Icon:** `cog`
- **SubTitle:** Organization: Main Org.
- **Children:**
  - **Data sources** - `/datasources` - Icon: `database` - Add and configure data sources
  - **Users** - `/org/users` - Icon: `user` - Manage org members
  - **Teams** - `/org/teams` - Icon: `users-alt` - Manage org groups
  - **Plugins** - `/plugins` - Icon: `plug` - View and configure plugins
  - **Preferences** - `/org` - Icon: `sliders-v-alt` - Organization preferences
  - **API keys** - `/org/apikeys` - Icon: `key-skeleton-alt` - Create & manage API keys

### 7. Help Section (sortWeight: -1100)
- **URL:** `#` (no direct URL)
- **Icon:** `question-circle`
- **SubTitle:** Grafana v8.5.15 (be4228db5a)

## Dashboard Routes

The following dashboards are available in the system:

| Title | UID | URL |
|-------|-----|-----|
| Manufacturing | dep0pnjtkhybke | `/dashboards/f/dep0pnjtkhybke/manufacturing` |
| Equipment Health Monitoring | equipment-health-v1 | `/d/equipment-health-v1/equipment-health-monitoring` |
| Home | home | `/d/home/home` |
| Manufacturing Intelligence Dashboard | manufacturing-test | `/d/manufacturing-test/manufacturing-intelligence-dashboard` |
| Manufacturing Intelligence Platform - Enterprise | manufacturing-enterprise | `/d/manufacturing-enterprise/manufacturing-intelligence-platform-enterprise` |
| Manufacturing OEE Dashboard | manufacturing-oee-v1 | `/d/manufacturing-oee-v1/manufacturing-oee-dashboard` |
| Manufacturing OEE Dashboard (Test Data) | manufacturing-oee-testdata | `/d/manufacturing-oee-testdata/manufacturing-oee-dashboard-test-data` |
| Production Metrics Dashboard | production-metrics-v1 | `/d/production-metrics-v1/production-metrics-dashboard` |

## Data Sources

The following data sources are configured in the system:

| Name | Type | UID | Default | Access |
|------|------|-----|---------|--------|
| Manufacturing-Metrics | prometheus | a0ab4673-9de1-4adf-8911-54498db34b9b | Yes | proxy |
| Manufacturing-TestData | testdata | manufacturing-testdata | No | proxy |
| Prometheus | prometheus | c934dfef-95ad-402b-afe7-22d0e6eef303 | No | proxy |
| TestData | testdata | d9df5af3-dd7a-4f1e-a0c9-464788dc1fad | No | proxy |

## API Routes

For API interactions, the following routes are available:

- **Search API:** `/api/search` - Lists all dashboards and folders
- **Dashboard API:** `/api/dashboards/uid/{uid}` - Gets dashboard by UID
- **Datasource API:** `/api/datasources` - Lists all data sources
- **Plugins API:** `/api/plugins` - Lists all installed plugins

### Data Source API Routes

Prometheus Data Source API endpoints:

- `/api/v1/query` - POST - Execute a Prometheus query
- `/api/v1/query_range` - POST - Execute a Prometheus range query
- `/api/v1/series` - POST - Find series by label matchers
- `/api/v1/labels` - POST - Get label names
- `/api/v1/query_exemplars` - POST - Query exemplars
- `/rules` - GET - Get alerting rules
- `/rules` - POST/DELETE - Manage alerting rules (Editor role required)
- `/config/v1/rules` - POST/DELETE - Manage alerting config (Editor role required)

## Authentication Routes

- **Login:** `/login`
- **Logout:** `/logout`
- **User Profile:** `/profile`

## Visualization Panel Types

The Grafana instance includes the following visualization panel types:

- **Alert list** - Shows list of alerts and their current status
- **Annotations list** - List annotations
- **Bar chart** - Categorical charts with group support
- **Bar gauge** - Horizontal and vertical gauges
- **Boom Table** - Boom table panel for Graphite, InfluxDB, Prometheus
- **Candlestick** - Candlestick chart
- **Dashboard list** - List of dynamic links to other dashboards
- **Gauge** - Standard gauge visualization
- **Geomap** - Geomap panel
- **Getting Started** - Getting started panel
- **Graph (old)** - Traditional time series graph panel
- **Heatmap** - Like a histogram over time
- **Histogram** - Histogram visualization
- **Logs** - Logs visualization
- **News** - RSS feed reader
- **Node Graph** - Node graph visualization
- **Pie Chart (old)** - Legacy pie chart panel
- **Pie chart** - The new core pie chart visualization
- **Plugin list** - Plugin List for Grafana
- **Stat** - Big stat values & sparklines
- **State timeline** - State changes and durations
- **Status history** - Periodic status history
- **Table** - Supports many column styles
- **Table (old)** - Table Panel for Grafana (deprecated)
- **Text** - Supports markdown and html content
- **Time series** - Time based line, area and bar charts
- **Welcome** - Welcome panel
- **Worldmap Panel** - World Map panel (deprecated, use Geomap instead)

## URL Parameters

Common URL parameters that can be used with Grafana dashboards:

- **orgId** - Organization ID (e.g., `orgId=1`)
- **from** - Start time for dashboard time range (e.g., `from=now-6h`)
- **to** - End time for dashboard time range (e.g., `to=now`)
- **refresh** - Auto-refresh interval (e.g., `refresh=5s`)
- **var-{variable}** - Dashboard template variable (e.g., `var-equipment=1,2,3`)
- **kiosk** - Kiosk mode (e.g., `kiosk=tv` for TV mode)
- **theme** - Override theme (e.g., `theme=light`)
- **editview** - Edit view (e.g., `editview=settings`)

Example full URL:
```
http://localhost:3003/d/manufacturing-oee-v1/manufacturing-oee-dashboard?orgId=1&refresh=30s&from=now-24h&to=now&kiosk=tv
```

## Grafana Embedding

URLs for embedding Grafana dashboards in iframes:

- `http://localhost:3003/d/home?orgId=1&kiosk=tv` - Home dashboard in kiosk/TV mode
- `http://localhost:3003/d/manufacturing-test/manufacturing-intelligence-dashboard?orgId=1&kiosk=tv` - Manufacturing Intelligence Dashboard in kiosk/TV mode

The Grafana configuration has the following embedding-related settings enabled:
- `GF_SECURITY_ALLOW_EMBEDDING=true` - Allow embedding Grafana in iframes
- `GF_SECURITY_COOKIE_SAMESITE=none` - Allow cookies in cross-site requests
- `GF_SECURITY_X_FRAME_OPTIONS_ENABLED=false` - Disable X-Frame-Options header
- `GF_SECURITY_CONTENT_SECURITY_POLICY=false` - Disable Content Security Policy