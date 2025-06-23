# Critical Gaps Implementation TODO

## Overview
This document provides a comprehensive implementation plan for all critical gaps, referencing Analytics's patterns while maintaining your own code implementation. All features will integrate seamlessly with your Next.js project and existing tech stack.

## 1. Variables & Templating System (0% → 100%)

### 1.1 Core Variable Engine
```typescript
// src/core/Analytics-engine/variables/VariableEngine.ts
// Reference: Analytics's public/app/features/variables/state/VariableModel.ts
```

- [ ] Create Variable type definitions
  ```typescript
  export interface Variable {
    id: string;
    name: string;
    label?: string;
    type: 'query' | 'custom' | 'constant' | 'datasource' | 'interval' | 'textbox' | 'adhoc';
    datasource?: string;
    query?: string;
    regex?: string;
    sort?: 'disabled' | 'alphabetical' | 'numerical';
    multi?: boolean;
    includeAll?: boolean;
    allValue?: string;
    options: VariableOption[];
    current: VariableOption | VariableOption[];
    refresh?: 'never' | 'on-dashboard-load' | 'on-time-range-change';
    hide?: 'label' | 'variable' | '';
  }
  ```

- [ ] Implement VariableManager class
  ```typescript
  // src/core/Analytics-engine/variables/VariableManager.ts
  export class VariableManager {
    private variables: Map<string, Variable>;
    private dependencies: Map<string, Set<string>>;
    private subscribers: Set<(variables: Variable[]) => void>;
    
    async initializeVariables(dashboardVariables: Variable[]): Promise<void>;
    async refreshVariable(variable: Variable): Promise<void>;
    interpolateQuery(query: string, scopedVars?: Record<string, any>): string;
    getVariableValue(name: string): string | string[];
    subscribeToChanges(callback: (variables: Variable[]) => void): () => void;
  }
  ```

- [ ] Create Variable Query Executors
  ```typescript
  // src/core/Analytics-engine/variables/executors/
  - QueryVariableExecutor.ts
  - CustomVariableExecutor.ts
  - DataSourceVariableExecutor.ts
  - IntervalVariableExecutor.ts
  - TextBoxVariableExecutor.ts
  - ConstantVariableExecutor.ts
  - AdhocVariableExecutor.ts
  ```

### 1.2 Variable UI Components

- [ ] Variable Selector Dropdown
  ```typescript
  // src/components/Analytics-engine/variables/VariableSelector.tsx
  // Reference: Analytics's public/app/features/variables/pickers/VariablePickerDropdown.tsx
  ```

- [ ] Variable Editor Modal
  ```typescript
  // src/components/Analytics-engine/variables/VariableEditor.tsx
  interface VariableEditorProps {
    variable?: Variable;
    onSave: (variable: Variable) => void;
    onCancel: () => void;
    dataSources: DataSource[];
  }
  ```

- [ ] Variable List Manager
  ```typescript
  // src/components/Analytics-engine/variables/VariableListEditor.tsx
  ```

### 1.3 Variable Integration

- [ ] Dashboard Context Provider
  ```typescript
  // src/contexts/DashboardContext.tsx
  export const DashboardContext = React.createContext<{
    dashboard: Dashboard;
    variables: Variable[];
    timeRange: TimeRange;
    refreshInterval: number;
    updateVariable: (name: string, value: string | string[]) => void;
  }>();
  ```

- [ ] Variable Interpolation Service
  ```typescript
  // src/services/variableInterpolation.ts
  export class VariableInterpolationService {
    interpolate(text: string, variables: Variable[], format?: string): string;
    interpolateObject(obj: any, variables: Variable[]): any;
  }
  ```

### 1.4 API Endpoints

- [ ] Variable Query API
  ```typescript
  // src/app/api/variables/query/route.ts
  export async function POST(request: Request) {
    const { datasource, query, variables } = await request.json();
    // Execute variable query with interpolation
  }
  ```

## 2. Panel Edit Mode (10% → 100%)

### 2.1 Panel Editor Component

- [ ] Main Panel Editor
  ```typescript
  // src/components/Analytics-engine/panel-editor/PanelEditor.tsx
  // Reference: Analytics's public/app/features/dashboard/components/PanelEditor/PanelEditor.tsx
  
  interface PanelEditorProps {
    panel: Panel;
    dashboard: Dashboard;
    onSave: (panel: Panel) => void;
    onCancel: () => void;
  }
  
  export function PanelEditor({ panel, dashboard, onSave, onCancel }: PanelEditorProps) {
    const [activeTab, setActiveTab] = useState<'queries' | 'transform' | 'alert' | 'overrides'>('queries');
    const [editedPanel, setEditedPanel] = useState(panel);
    // Implementation
  }
  ```

### 2.2 Query Editor

- [ ] Unified Query Editor
  ```typescript
  // src/components/Analytics-engine/panel-editor/QueryEditor.tsx
  // Reference: Analytics's public/app/features/query/components/QueryEditor.tsx
  ```

- [ ] Data Source Specific Editors
  ```typescript
  // src/components/Analytics-engine/datasources/[datasource]/QueryEditor.tsx
  - PrometheusQueryEditor.tsx
  - InfluxDBQueryEditor.tsx
  - PostgreSQLQueryEditor.tsx
  - ElasticsearchQueryEditor.tsx
  ```

### 2.3 Visualization Picker

- [ ] Visualization Gallery
  ```typescript
  // src/components/Analytics-engine/panel-editor/VisualizationPicker.tsx
  interface VisualizationOption {
    id: string;
    name: string;
    icon: string;
    category: 'Time series' | 'Stats' | 'Misc';
    preview: React.ComponentType;
  }
  ```

### 2.4 Panel Options Editor

- [ ] Dynamic Options Editor
  ```typescript
  // src/components/Analytics-engine/panel-editor/PanelOptionsEditor.tsx
  // Generate form based on panel type options schema
  ```

- [ ] Field Configuration
  ```typescript
  // src/components/Analytics-engine/panel-editor/FieldConfigEditor.tsx
  interface FieldConfig {
    unit?: string;
    decimals?: number;
    displayName?: string;
    min?: number;
    max?: number;
    thresholds?: ThresholdsConfig;
    mappings?: ValueMapping[];
    links?: DataLink[];
  }
  ```

### 2.5 Transform Editor

- [ ] Data Transformations
  ```typescript
  // src/components/Analytics-engine/panel-editor/TransformEditor.tsx
  // Reference: Analytics's public/app/features/transformers/
  
  interface Transform {
    id: string;
    options: any;
  }
  
  // Transform implementations:
  - ReduceTransform.ts
  - FilterByNameTransform.ts
  - OrganizeFieldsTransform.ts
  - GroupByTransform.ts
  - MergeTransform.ts
  - CalculateFieldTransform.ts
  ```

## 3. Data Sources (20% → 100%)

### 3.1 Data Source Plugin System

- [ ] Base Data Source Class
  ```typescript
  // src/core/Analytics-engine/datasources/DataSourceBase.ts
  // Reference: Analytics's public/app/features/datasources/DataSourcePlugin.ts
  
  export abstract class DataSourceBase {
    abstract query(options: DataQueryRequest): Promise<DataQueryResponse>;
    abstract testDatasource(): Promise<TestDataSourceResponse>;
    abstract metricFindQuery?(query: string): Promise<MetricFindValue[]>;
    abstract annotationQuery?(options: AnnotationQueryRequest): Promise<AnnotationEvent[]>;
  }
  ```

### 3.2 Prometheus Data Source

- [ ] Prometheus Implementation
  ```typescript
  // src/core/Analytics-engine/datasources/prometheus/PrometheusDataSource.ts
  // Reference: Analytics's public/app/plugins/datasource/prometheus/
  ```

- [ ] PromQL Editor with Syntax Highlighting
  ```typescript
  // src/components/Analytics-engine/datasources/prometheus/PromQLEditor.tsx
  ```

- [ ] Metric Explorer
  ```typescript
  // src/components/Analytics-engine/datasources/prometheus/MetricExplorer.tsx
  ```

### 3.3 InfluxDB Data Source

- [ ] InfluxDB Implementation
  ```typescript
  // src/core/Analytics-engine/datasources/influxdb/InfluxDBDataSource.ts
  // Support both InfluxQL and Flux
  ```

- [ ] Query Builders
  ```typescript
  // src/components/Analytics-engine/datasources/influxdb/FluxQueryBuilder.tsx
  // src/components/Analytics-engine/datasources/influxdb/InfluxQLQueryBuilder.tsx
  ```

### 3.4 SQL Data Sources

- [ ] Generic SQL Data Source
  ```typescript
  // src/core/Analytics-engine/datasources/sql/SQLDataSource.ts
  ```

- [ ] Database Specific Implementations
  ```typescript
  - PostgreSQLDataSource.ts
  - MySQLDataSource.ts
  - MSSQLDataSource.ts
  ```

- [ ] SQL Query Builder
  ```typescript
  // src/components/Analytics-engine/datasources/sql/SQLQueryBuilder.tsx
  ```

### 3.5 Elasticsearch Data Source

- [ ] Elasticsearch Implementation
  ```typescript
  // src/core/Analytics-engine/datasources/elasticsearch/ElasticsearchDataSource.ts
  ```

- [ ] Lucene Query Editor
  ```typescript
  // src/components/Analytics-engine/datasources/elasticsearch/LuceneQueryEditor.tsx
  ```

### 3.6 Data Source Management

- [ ] Data Source Configuration UI
  ```typescript
  // src/app/Analytics/datasources/page.tsx
  // src/app/Analytics/datasources/[id]/page.tsx
  ```

- [ ] Data Source API
  ```typescript
  // src/app/api/datasources/route.ts
  // src/app/api/datasources/[id]/route.ts
  // src/app/api/datasources/proxy/[id]/[...path]/route.ts
  ```

## 4. Explore Mode (0% → 100%)

### 4.1 Explore Page

- [ ] Main Explore Component
  ```typescript
  // src/app/Analytics/explore/page.tsx
  // Reference: Analytics's public/app/features/explore/Explore.tsx
  ```

- [ ] Split View Support
  ```typescript
  // src/components/Analytics-engine/explore/ExplorePaneContainer.tsx
  interface ExplorePaneProps {
    datasource: DataSource;
    queries: Query[];
    timeRange: TimeRange;
    onQueriesChange: (queries: Query[]) => void;
  }
  ```

### 4.2 Query History

- [ ] Query History Storage
  ```typescript
  // src/services/queryHistory.ts
  export class QueryHistoryService {
    async addQuery(datasource: string, query: Query): Promise<void>;
    async getHistory(datasource: string, limit?: number): Promise<QueryHistoryItem[]>;
    async starQuery(id: string): Promise<void>;
    async deleteQuery(id: string): Promise<void>;
  }
  ```

- [ ] Query History UI
  ```typescript
  // src/components/Analytics-engine/explore/QueryHistory.tsx
  ```

### 4.3 Logs Viewer

- [ ] Log Panel Implementation
  ```typescript
  // src/components/Analytics-engine/explore/LogsPanel.tsx
  // Reference: Analytics's public/app/features/logs/
  ```

- [ ] Log Context and Details
  ```typescript
  // src/components/Analytics-engine/explore/LogRowContextProvider.tsx
  ```

### 4.4 Metrics Explorer

- [ ] Metrics Browser
  ```typescript
  // src/components/Analytics-engine/explore/MetricsBrowser.tsx
  ```

- [ ] Instant Query Support
  ```typescript
  // src/components/Analytics-engine/explore/InstantQuery.tsx
  ```

## 5. Import/Export (0% → 100%)

### 5.1 Dashboard JSON Model

- [ ] Dashboard Schema Definition
  ```typescript
  // src/types/dashboard-schema.ts
  // Reference: Analytics's public/app/features/dashboard/state/DashboardModel.ts
  
  export interface DashboardJSON {
    version: number;
    uid: string;
    title: string;
    panels: PanelJSON[];
    templating: { list: Variable[] };
    annotations: { list: AnnotationQuery[] };
    time: { from: string; to: string };
    timepicker: TimePickerConfig;
    schemaVersion: number;
  }
  ```

### 5.2 Import Functionality

- [ ] Dashboard Importer
  ```typescript
  // src/services/dashboardImporter.ts
  export class DashboardImporter {
    async importFromJSON(json: string | object): Promise<Dashboard>;
    async importFromManufacturingPlatformCom(id: string): Promise<Dashboard>;
    validateDashboard(dashboard: any): ValidationResult;
    transformToInternal(manufacturingPlatformJson: any): Dashboard;
  }
  ```

- [ ] Import UI
  ```typescript
  // src/app/Analytics/dashboard/import/page.tsx
  ```

### 5.3 Export Functionality

- [ ] Dashboard Exporter
  ```typescript
  // src/services/dashboardExporter.ts
  export class DashboardExporter {
    exportToJSON(dashboard: Dashboard): DashboardJSON;
    exportWithData(dashboard: Dashboard, timeRange: TimeRange): Promise<ExportBundle>;
    exportToPDF(dashboard: Dashboard): Promise<Blob>;
  }
  ```

### 5.4 Provisioning Support

- [ ] File-based Provisioning
  ```typescript
  // src/services/provisioning.ts
  export class ProvisioningService {
    async loadFromDirectory(path: string): Promise<void>;
    async watchDirectory(path: string): Promise<void>;
    validateProvisioningConfig(config: any): ValidationResult;
  }
  ```

## 6. User Management & RBAC (0% → 100%)

### 6.1 Authentication System

- [ ] Auth Provider Integration
  ```typescript
  // src/auth/providers/
  - LocalAuthProvider.ts      // Username/password
  - OAuthProvider.ts          // Generic OAuth2
  - SAMLProvider.ts           // SAML 2.0
  - LDAPProvider.ts           // LDAP/Active Directory
  - JWTProvider.ts            // JWT tokens
  ```

- [ ] NextAuth Configuration
  ```typescript
  // src/app/api/auth/[...nextauth]/route.ts
  import NextAuth from 'next-auth';
  import { authOptions } from '@/auth/config';
  
  const handler = NextAuth(authOptions);
  export { handler as GET, handler as POST };
  ```

### 6.2 User Management

- [ ] User Model and Service
  ```typescript
  // src/models/User.ts
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'Admin' | 'Editor' | 'Viewer';
    organizations: Organization[];
    teams: Team[];
    preferences: UserPreferences;
  }
  ```

- [ ] User Management UI
  ```typescript
  // src/app/Analytics/admin/users/page.tsx
  // src/app/Analytics/admin/users/[id]/page.tsx
  ```

### 6.3 RBAC Implementation

- [ ] Permission System
  ```typescript
  // src/auth/permissions.ts
  export class PermissionService {
    canViewDashboard(user: User, dashboard: Dashboard): boolean;
    canEditDashboard(user: User, dashboard: Dashboard): boolean;
    canDeleteDashboard(user: User, dashboard: Dashboard): boolean;
    canManageDataSources(user: User): boolean;
    canManageUsers(user: User): boolean;
  }
  ```

- [ ] Team Management
  ```typescript
  // src/models/Team.ts
  // src/app/Analytics/admin/teams/page.tsx
  ```

### 6.4 API Security

- [ ] API Authentication Middleware
  ```typescript
  // src/middleware/auth.ts
  export async function authenticateRequest(request: Request): Promise<User | null>;
  export async function authorizeRequest(user: User, resource: string, action: string): Promise<boolean>;
  ```

## 7. Advanced Features (0% → 100%)

### 7.1 Annotations System

- [ ] Annotation Model
  ```typescript
  // src/models/Annotation.ts
  interface Annotation {
    id: string;
    dashboardId?: string;
    panelId?: string;
    time: number;
    timeEnd?: number;
    text: string;
    tags: string[];
    userId: string;
  }
  ```

- [ ] Annotation Service
  ```typescript
  // src/services/annotationService.ts
  export class AnnotationService {
    async create(annotation: Annotation): Promise<Annotation>;
    async query(options: AnnotationQuery): Promise<Annotation[]>;
    async update(id: string, annotation: Partial<Annotation>): Promise<Annotation>;
    async delete(id: string): Promise<void>;
  }
  ```

- [ ] Annotation UI Components
  ```typescript
  // src/components/Analytics-engine/annotations/AnnotationTooltip.tsx
  // src/components/Analytics-engine/annotations/AnnotationEditor.tsx
  ```

### 7.2 Plugin System

- [ ] Plugin Architecture
  ```typescript
  // src/core/Analytics-engine/plugins/PluginLoader.ts
  export class PluginLoader {
    async loadPlugin(id: string): Promise<Plugin>;
    async scanPlugins(directory: string): Promise<Plugin[]>;
    validatePlugin(plugin: any): ValidationResult;
  }
  ```

- [ ] Plugin Types
  ```typescript
  // src/core/Analytics-engine/plugins/types.ts
  interface PanelPlugin {
    id: string;
    name: string;
    module: string;
    options: OptionsSchema;
  }
  
  interface DataSourcePlugin {
    id: string;
    name: string;
    module: string;
    config: ConfigSchema;
  }
  ```

### 7.3 Dashboard Links

- [ ] Link Model
  ```typescript
  // src/types/dashboard.ts
  interface DashboardLink {
    title: string;
    type: 'dashboards' | 'link';
    icon?: string;
    tooltip?: string;
    url?: string;
    tags?: string[];
    targetBlank?: boolean;
  }
  ```

### 7.4 Library Panels

- [ ] Library Panel Service
  ```typescript
  // src/services/libraryPanelService.ts
  export class LibraryPanelService {
    async create(panel: Panel): Promise<LibraryPanel>;
    async update(uid: string, panel: Panel): Promise<LibraryPanel>;
    async delete(uid: string): Promise<void>;
    async getConnectedDashboards(uid: string): Promise<Dashboard[]>;
  }
  ```

### 7.5 Playlists

- [ ] Playlist Model and Service
  ```typescript
  // src/models/Playlist.ts
  interface Playlist {
    id: string;
    name: string;
    interval: string;
    items: PlaylistItem[];
  }
  ```

## Implementation Infrastructure

### Container Setup

- [ ] Update Docker Compose
  ```yaml
  # docker-compose.yml additions
  services:
    prometheus:
      image: prom/prometheus:latest
      volumes:
        - ./prometheus.yml:/etc/prometheus/prometheus.yml
      ports:
        - "9090:9090"
    
    influxdb:
      image: influxdb:2.7
      environment:
        - INFLUXDB_DB=Analytics
      ports:
        - "8086:8086"
    
    elasticsearch:
      image: elasticsearch:8.11.0
      environment:
        - discovery.type=single-node
      ports:
        - "9200:9200"
  ```

### Database Migrations

- [ ] Create migration for variables
  ```sql
  -- prisma/migrations/add_variables.sql
  CREATE TABLE "Variable" (
    "id" TEXT PRIMARY KEY,
    "dashboardId" TEXT REFERENCES "Dashboard"("id"),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "query" TEXT,
    "options" JSONB,
    "current" JSONB
  );
  ```

- [ ] Create migration for annotations
- [ ] Create migration for users and teams
- [ ] Create migration for library panels

### Testing Infrastructure

- [ ] Variable System Tests
  ```typescript
  // src/__tests__/variables/
  - VariableManager.test.ts
  - VariableInterpolation.test.ts
  - VariableUI.test.tsx
  ```

- [ ] Panel Editor Tests
- [ ] Data Source Tests
- [ ] Import/Export Tests
- [ ] RBAC Tests

## Deployment Readiness

### Environment Configuration

- [ ] Environment variables
  ```env
  # Analytics Engine Configuration
  PROMETHEUS_URL=http://prometheus:9090
  INFLUXDB_URL=http://influxdb:8086
  ELASTICSEARCH_URL=http://elasticsearch:9200
  
  # Auth Configuration
  NEXTAUTH_SECRET=
  OAUTH_CLIENT_ID=
  OAUTH_CLIENT_SECRET=
  LDAP_URL=
  LDAP_BIND_DN=
  
  # Plugin Directory
  PLUGIN_DIR=/app/plugins
  ```

### Production Build

- [ ] Build optimization
  ```typescript
  // next.config.js updates
  module.exports = {
    experimental: {
      optimizeCss: true,
    },
    webpack: (config) => {
      // Add plugin loader configuration
      return config;
    }
  };
  ```

### Health Checks

- [ ] Add comprehensive health checks
  ```typescript
  // src/app/api/health/route.ts
  export async function GET() {
    const checks = {
      database: await checkDatabase(),
      datasources: await checkDataSources(),
      cache: await checkRedis(),
      plugins: await checkPlugins(),
    };
    return Response.json({ status: 'healthy', checks });
  }
  ```

## Timeline

### Week 1-2: Variables & Templating
- Core engine implementation
- UI components
- Integration with existing panels

### Week 3-4: Panel Edit Mode
- Complete panel editor
- Query builders for all data sources
- Transform system

### Week 5-6: Data Sources
- Prometheus and InfluxDB
- SQL databases
- Elasticsearch

### Week 7: Explore Mode
- Basic explore functionality
- Query history
- Split view

### Week 8: Import/Export
- JSON model support
- Import UI
- Export functionality

### Week 9-10: User Management
- Authentication providers
- RBAC implementation
- User/Team management

### Week 11-12: Advanced Features
- Annotations
- Plugin system
- Library panels
- Playlists

## Success Criteria

- [ ] All Analytics Dashboard JSON files can be imported
- [ ] Variables work in all queries and panel titles
- [ ] Panel editing provides full Analytics functionality
- [ ] All major data sources are supported
- [ ] User can explore data without creating dashboards
- [ ] Full authentication and authorization works
- [ ] System is fully containerized and production-ready