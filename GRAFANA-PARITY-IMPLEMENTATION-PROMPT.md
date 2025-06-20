# Grafana Parity Implementation Prompt

## Objective
Implement COMPLETE Grafana parity in the manufacturing analytics platform WITHOUT ANY COMPROMISES. Every single feature, route, panel type, and capability must be fully implemented and working.

## Reference Documents
- GRAFANA-PARITY-REFERENCE.md - Contains all Grafana routes, features, and capabilities
- Current implementation analysis showing gaps

## Implementation Requirements

### MANDATORY - ALL ITEMS MUST BE IMPLEMENTED:

#### 1. Plugin Architecture (P0) ✓ REQUIRED
- [ ] Complete plugin registry system
- [ ] Panel plugin support
- [ ] Data source plugin support
- [ ] App plugin support
- [ ] Plugin marketplace UI
- [ ] Plugin development SDK
- [ ] Hot-reload plugin support

#### 2. Missing Visualization Panels (P0) ✓ REQUIRED
ALL panels from GRAFANA-PARITY-REFERENCE.md must be implemented:
- [ ] Logs Panel - For manufacturing event logs
- [ ] Canvas Panel - For custom layouts and SCADA-like views
- [ ] Geomap Panel - For facility/location visualization
- [ ] Node Graph Panel - For process flow visualization
- [ ] Candlestick Panel - For financial/trend data
- [ ] Boom Table Panel - Advanced table with Prometheus support
- [ ] News Panel - RSS feed reader
- [ ] Annotations List Panel
- [ ] Dashboard List Panel
- [ ] Getting Started Panel
- [ ] Welcome Panel
- [ ] Plugin List Panel
- [ ] State Timeline Panel
- [ ] Status History Panel
- [ ] Worldmap Panel (with deprecation notice)

#### 3. Data Source Abstraction (P0) ✓ REQUIRED
- [ ] Prometheus data source (FULL compatibility)
- [ ] TestData data source
- [ ] Mixed data source support
- [ ] Dashboard data source
- [ ] Grafana internal data source
- [ ] Query proxy implementation
- [ ] All Prometheus API endpoints from reference

#### 4. Unified Alerting System (P0) ✓ REQUIRED
ALL routes from GRAFANA-PARITY-REFERENCE.md:
- [ ] /alerting/list - Alert rules
- [ ] /alerting/notifications - Contact points
- [ ] /alerting/routes - Notification policies
- [ ] /alerting/silences - Silences
- [ ] /alerting/groups - Alert groups
- [ ] /alerting/admin - Admin panel
- [ ] /alerting/new - Create alert rule
- [ ] Multi-channel notifications
- [ ] Alert routing and grouping
- [ ] Inhibition rules

#### 5. Dashboard Management ✓ REQUIRED
ALL routes from reference:
- [ ] /dashboard/new - Create dashboard
- [ ] /dashboards/folder/new - Create folder
- [ ] /dashboard/import - Import dashboard
- [ ] /dashboards - Browse dashboards
- [ ] /playlists - Playlist management
- [ ] /d/{uid}/{slug} - Dashboard by UID routing
- [ ] /dashboards/f/{uid}/{slug} - Folder routing

#### 6. Configuration Section ✓ REQUIRED
ALL routes from reference:
- [ ] /datasources - Data source management
- [ ] /org/users - User management
- [ ] /org/teams - Team management
- [ ] /plugins - Plugin management
- [ ] /org - Organization preferences
- [ ] /org/apikeys - API key management

#### 7. URL Parameters Support ✓ REQUIRED
ALL parameters from reference:
- [ ] orgId - Organization ID
- [ ] from/to - Time range
- [ ] refresh - Auto-refresh interval
- [ ] var-{variable} - Template variables
- [ ] kiosk - Kiosk mode (tv mode)
- [ ] theme - Theme override
- [ ] editview - Edit view mode

#### 8. Embedding Support ✓ REQUIRED
- [ ] iframe embedding capability
- [ ] Security headers configuration
- [ ] Cookie policy for embedding
- [ ] Public dashboard URLs
- [ ] Snapshot functionality

#### 9. API Compatibility ✓ REQUIRED
ALL APIs from reference:
- [ ] /api/search - Dashboard search
- [ ] /api/dashboards/uid/{uid} - Get dashboard
- [ ] /api/datasources - Data source API
- [ ] /api/plugins - Plugin API
- [ ] All Prometheus proxy endpoints

#### 10. Navigation Structure ✓ REQUIRED
Exact navigation from reference with:
- [ ] Correct sortWeight values
- [ ] All icons matching reference
- [ ] All subtitles and descriptions
- [ ] Hidden tabs where specified
- [ ] Plugin app routes (/a/ routes)

#### 11. Advanced Features ✓ REQUIRED
- [ ] Query builder for all data sources
- [ ] Explore view (/explore)
- [ ] Query history
- [ ] Result transformations
- [ ] Time zone support
- [ ] Fiscal calendar support
- [ ] Time shift comparisons
- [ ] Variable dependencies (chained)
- [ ] Query-based variables
- [ ] Interval variables

#### 12. Performance Features ✓ REQUIRED
- [ ] Query caching layer
- [ ] Lazy loading panels
- [ ] Virtual scrolling
- [ ] WebSocket streaming
- [ ] Panel refresh optimization

#### 13. Enterprise Features ✓ REQUIRED
- [ ] LDAP authentication
- [ ] SAML authentication
- [ ] OAuth authentication
- [ ] RBAC (Role-based access)
- [ ] Audit logging
- [ ] White-labeling support
- [ ] Team sync from auth providers

## Validation Checklist
Every item must be checked before considering implementation complete:

### Routes (ALL must work exactly as in reference)
- [ ] All Create section routes
- [ ] All Dashboard section routes
- [ ] Explore route
- [ ] All Alerting routes
- [ ] All Plugin app routes
- [ ] All Configuration routes
- [ ] All API routes
- [ ] All authentication routes

### Panels (ALL must be implemented)
- [ ] All 30+ panel types from reference
- [ ] Panel options parity
- [ ] Panel queries compatibility
- [ ] Panel transformations

### Features (ALL must work)
- [ ] All URL parameters
- [ ] All embedding modes
- [ ] All data source types
- [ ] All alert features
- [ ] All variable types
- [ ] All API endpoints

## Implementation Order
1. Plugin Architecture (foundation)
2. Data Source Abstraction
3. Missing Panels
4. Unified Alerting
5. URL Parameters & Embedding
6. Advanced Features
7. Performance Optimizations
8. Enterprise Features

## Success Criteria
- 100% route compatibility with reference
- 100% panel type coverage
- 100% API compatibility
- All URL parameters working
- Full embedding support
- Complete alerting system
- All data sources implemented

## NO COMPROMISES
- Every single item in GRAFANA-PARITY-REFERENCE.md must be implemented
- No shortcuts or partial implementations
- Full compatibility required
- Modern stack advantages must be retained while adding ALL Grafana features