# Analytics References Audit - Manufacturing Analytics Platform

## Summary
This document contains a comprehensive list of all Analytics references found in the codebase that need to be replaced with Manufacturing Analytics Platform branding.

## Total Files with Analytics References: 71

### Component Files (11 files)
1. `/src/components/grafana/ManufacturingDashboard.tsx` - Component for embedding Analytics Dashboards
2. `/src/components/grafana/DashboardEmbed.tsx` - Analytics embedding wrapper
3. `/src/components/grafana/AnalyticsPanel.tsx` - Individual Analytics panel component
4. `/src/components/grafana/DashboardPanel.tsx` - Dashboard panel wrapper
5. `/src/components/dashboard/ManufacturingDashboard.tsx` - Manufacturing dashboard with Analytics styling
6. `/src/components/dashboard/ManufacturingDashboard.tsx` - Main manufacturing dashboard
7. `/src/components/charts/ManufacturingCharts.tsx` - Analytics charts
8. `/src/components/charts/index.ts` - Chart exports including Analytics charts
9. `/src/components/layout/DashboardLayout.tsx` - Analytics layout wrapper
10. `/src/components/layout/Navigation.tsx` - Contains "Analytics Dashboard" and "Advanced Analytics" navigation links
11. `/src/components/explore/ExploreVisualization.tsx` - Exploration visualization component

### Page Files (11 files)
1. `/src/app/Analytics-dashboard/page.tsx` - Dedicated Analytics Dashboard page
2. `/src/app/dashboards/Analytics/page.tsx` - Analytics Dashboards section
3. `/src/app/dashboards/browse/page.tsx` - Dashboard browsing page
4. `/src/app/dashboards/unified/page.tsx` - Unified dashboard view
5. `/src/app/dashboards/oee/page.tsx` - OEE dashboard
6. `/src/app/dashboards/production/page.tsx` - Production dashboard
7. `/src/app/dashboards/quality/page.tsx` - Quality dashboard
8. `/src/app/dashboards/maintenance/page.tsx` - Maintenance dashboard
9. `/src/app/dashboards/rca/page.tsx` - Root Cause Analysis dashboard
10. `/src/app/documentation/page.tsx` - Documentation page
11. `/src/app/api/metrics/query/route.ts` - Metrics query API route

### Configuration Files (3 files)
1. `/src/config/Analytics.config.ts` - Main Analytics configuration file
2. `/src/lib/grafana/config.ts` - Analytics library configuration
3. `/src/types/datasource.ts` - Datasource types

### Test Files (2 files)
1. `/src/__tests__/components/charts/ManufacturingCharts.test.tsx` - Analytics charts tests
2. `/src/__tests__/integration/database.integration.test.ts` - Database integration tests

### Docker & Infrastructure Files (2 files)
1. `/docker-compose.yml` - Contains Analytics service definition and multiple references
2. `/deployment/scripts/monitor.sh` - Monitoring script

### Documentation Files (16 files)
1. `/README.md` - Main readme with "Adaptive Factory Analytics Engine: Complete Analytics-parallel functionality"
2. `/GRAFANA-INTEGRATION-GUIDE.md` - Integration guide
3. `/GRAFANA-FEATURES-IMPLEMENTATION-SUMMARY.md` - Features summary
4. `/GRAFANA-GAP-ANALYSIS-SUMMARY.md` - Gap analysis
5. `/docs/IMPLEMENTATION-ROADMAP.md` - Implementation roadmap
6. `/docs/COMPREHENSIVE-GAP-ANALYSIS.md` - Comprehensive gap analysis
7. `/docs/PERFORMANCE-OPTIMIZATION-GUIDE.md` - Performance guide
8. `/docs/WEEK-BY-WEEK-IMPLEMENTATION-SCHEDULE.md` - Implementation schedule
9. `/docs/FULL-GRAFANA-PARITY-IMPLEMENTATION.md` - Full parity implementation
10. `/docs/GRAFANA-COMPLIANT-IMPLEMENTATION-STRATEGY.md` - Compliant implementation strategy
11. `/docs/CRITICAL-GAPS-IMPLEMENTATION-TODO.md` - Critical gaps TODO
12. `/docs/GRAFANA-UI-CORRECTIONS-GUIDE.md` - UI corrections guide
13. `/docs/GRAFANA-PARITY-IMPLEMENTATION-GUIDE.md` - Parity implementation guide
14. `/docs/architecture/TIMESCALEDB-PERFORMANCE-SETUP.md` - TimescaleDB setup
15. `/docs/deployment.md` - Deployment documentation
16. `/docs/docker-integration.md` - Docker integration

### Environment Files (1 file)
1. `/.env.example` - Contains GRAFANA_URL, Analytics_API_KEY, Analytics_ORG_ID variables

### Script Files (7 files)
1. `/scripts/batch-fix-event-handlers.sh`
2. `/scripts/fix-optional-chaining-assignment.js`
3. `/scripts/fix-all-event-chaining.js`
4. `/scripts/fix-remaining-syntax-errors.ts`
5. `/scripts/fix-final-syntax.js`
6. `/scripts/run-comprehensive-tests.sh`
7. `/scripts/test-dependency-visualization.js`

### SQL & Migration Files (2 files)
1. `/scripts/init-postgres/02-setup-timescaledb-manufacturing.sql`
2. `/prisma/migrations/setup-timescaledb.sql`

### Additional Files (14 files)
1. `/COMPREHENSIVE-ERROR-DETECTION.cmd`
2. `/FIND-INCOMPLETE-PAGES.cmd`
3. `/START-SERVER-AND-TEST.cmd`
4. `/QUICK-PAGE-CHECK-WINDOWS.cmd`
5. `/RUN-COMPREHENSIVE-TESTS-WINDOWS.cmd`
6. `/COMPREHENSIVE-INTEGRATION-VERIFICATION.md`
7. `/verify-integration.js`
8. `/run-comprehensive-test.js`
9. `/tests/e2e/comprehensive-full-test.spec.ts`
10. `/TIMESCALEDB-IMPLEMENTATION-SUMMARY.md`
11. `/deployment/README.md`
12. `/docs/PERFORMANCE-OPTIMIZATION.md`
13. `/docs/Manufacturing Engineering Agent Documentation.md`
14. `/prisma/backups/schema-flat-backup.prisma`

## Key References to Replace

### Navigation Links
- "Analytics Dashboard" → "Analytics Dashboard"
- "Advanced Analytics" → "Manufacturing Analytics"
- "/dashboards/Analytics" → "/dashboards/Analytics"
- "/Analytics-dashboard" → "/Analytics-dashboard"

### Component Names
- `ManufacturingDashboard` → `AnalyticsDashboard`
- `DashboardEmbed` → `AnalyticsEmbed`
- `AnalyticsPanel` → `AnalyticsPanel`
- `ManufacturingCharts` → `AnalyticsCharts`
- `DashboardLayout` → `AnalyticsLayout`
- `ManufacturingDashboard` → `ManufacturingAnalyticsDashboard`

### Configuration
- `GRAFANA_CONFIG` → `Analytics_CONFIG`
- `buildGrafanaUrl` → `buildAnalyticsUrl`
- `GRAFANA_DASHBOARDS` → `Analytics_DASHBOARDS`
- `Analytics.config.ts` → `Analytics.config.ts`

### Environment Variables
- `NEXT_PUBLIC_Analytics_URL` → `NEXT_PUBLIC_Analytics_URL`
- `Analytics_API_KEY` → `Analytics_API_KEY`
- `Analytics_ORG_ID` → `Analytics_ORG_ID`
- `GRAFANA_DATASOURCE_TYPE` → `Analytics_DATASOURCE_TYPE`
- `GRAFANA_DATASOURCE_UID` → `Analytics_DATASOURCE_UID`
- `GRAFANA_DATASOURCE_NAME` → `Analytics_DATASOURCE_NAME`

### Docker Services
- Container name: `manufacturing-grafana` → `manufacturing-Analytics`
- Service name: `grafana` → `Analytics-dashboard`
- Volume: `grafana-storage` → `Analytics-storage`

### Text Content
- "Analytics Dashboard" → "Analytics Dashboard"
- "Analytics-parallel" → "Enterprise-grade Analytics"
- "Analytics-level performance" → "Enterprise-level performance"
- "Analytics" → "Professional Analytics"
- "Open in Analytics" → "Open in Analytics"
- "Loading Analytics Dashboard" → "Loading Analytics Dashboard"

### Documentation References
- All references to "Analytics parity" → "Enterprise Analytics capabilities"
- "Analytics-compliant" → "Industry-standard compliant"
- "Dashboard Integration" → "Analytics integration"

## Recommended Approach

1. **Phase 1**: Update all user-facing text and navigation
2. **Phase 2**: Rename components and their imports
3. **Phase 3**: Update configuration files and environment variables
4. **Phase 4**: Update Docker configuration
5. **Phase 5**: Update documentation
6. **Phase 6**: Update tests to match new naming

## Notes
- Some references may be in comments or documentation explaining compatibility
- The Analytics engine is designed to provide Analytics-like functionality but with Manufacturing Analytics Platform branding
- Consider keeping some technical references in documentation for developers who are familiar with Analytics