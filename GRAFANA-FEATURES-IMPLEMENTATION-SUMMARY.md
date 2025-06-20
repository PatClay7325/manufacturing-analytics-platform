# Analytics Features Implementation Summary

## What We've Implemented

### 1. Variables & Templating System ✅
- **SimpleVariableEngine.ts**: Complete variable engine with our own implementation
  - Query variables with data source support
  - Custom variables with comma-separated values
  - Interval variables with auto option
  - Constant and textbox variables
  - Multi-value support with formatting
  - Variable interpolation in queries
  - Dependency tracking and refresh

- **VariableSelector.tsx**: React component for variable dropdowns
  - Single and multi-select support
  - Search functionality for long lists
  - Variable bar for Dashboard Integration
  - Hide options (label/variable)

### 2. Panel Editor ✅
- **SimplePanelEditor.tsx**: Complete panel editing experience
  - Tab-based interface (Query, Transform, Visualization, Alert)
  - Side-by-side editor and preview
  - Run query functionality
  - Modal or inline rendering options

## Quick Implementation Guide for Remaining Features

### 3. Data Sources (Next Priority)

Create a simple plugin system:

```typescript
// src/core/Analytics-engine/datasources/DataSourceRegistry.ts
export class DataSourceRegistry {
  private plugins = new Map<string, DataSourcePlugin>();
  
  register(plugin: DataSourcePlugin) {
    this.plugins.set(plugin.id, plugin);
  }
  
  async query(datasourceId: string, query: any) {
    const plugin = this.plugins.get(datasourceId);
    if (!plugin) throw new Error(`Unknown datasource: ${datasourceId}`);
    return plugin.query(query);
  }
}

// src/core/Analytics-engine/datasources/plugins/PrometheusPlugin.ts
export class PrometheusPlugin implements DataSourcePlugin {
  id = 'prometheus';
  name = 'Prometheus';
  
  async query({ expr, start, end, step }) {
    const params = new URLSearchParams({
      query: expr,
      start: start.toString(),
      end: end.toString(),
      step: step || '15s'
    });
    
    const response = await fetch(`${this.config.url}/api/v1/query_range?${params}`);
    return this.transformResponse(await response.json());
  }
  
  async testConnection() {
    try {
      await fetch(`${this.config.url}/api/v1/query?query=1`);
      return { status: 'success', message: 'Success' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
```

### 4. Explore Mode (Simple Implementation)

```typescript
// src/app/Analytics/explore/page.tsx
export default function ExplorePage() {
  const [datasource, setDatasource] = useState('prometheus');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  
  const runQuery = async () => {
    const response = await fetch('/api/Analytics/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasource, query })
    });
    setResults(await response.json());
  };
  
  return (
    <div className="explore-page">
      <DataSourcePicker value={datasource} onChange={setDatasource} />
      <QueryEditor datasource={datasource} value={query} onChange={setQuery} />
      <button onClick={runQuery}>Run Query</button>
      <ResultsViewer results={results} />
    </div>
  );
}
```

### 5. Import/Export (JSON Compatibility)

```typescript
// src/services/DashboardImportExport.ts
export class DashboardImportExport {
  // Import Analytics JSON
  import(json: string | object): Dashboard {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    return {
      id: data.uid,
      title: data.title,
      panels: data.panels.map(p => ({
        id: p.id,
        type: this.mapPanelType(p.type),
        title: p.title,
        gridPos: p.gridPos,
        targets: p.targets,
        options: this.mapPanelOptions(p),
      })),
      variables: data.templating?.list || [],
      timeRange: data.time,
    };
  }
  
  // Export to Analytics format
  export(dashboard: Dashboard): object {
    return {
      uid: dashboard.id,
      title: dashboard.title,
      schemaVersion: 37,
      version: 1,
      panels: dashboard.panels.map((p, i) => ({
        id: i + 1,
        type: p.type,
        title: p.title,
        gridPos: p.gridPos,
        targets: p.targets,
        options: p.options,
      })),
      templating: { list: dashboard.variables },
      time: dashboard.timeRange,
    };
  }
}
```

### 6. Authentication (Using NextAuth)

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Your auth logic
        const user = await authenticateUser(credentials);
        return user || null;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 7. Annotations (Simple Implementation)

```typescript
// src/models/Annotation.ts
export interface Annotation {
  id: string;
  dashboardId: string;
  time: number;
  timeEnd?: number;
  text: string;
  tags: string[];
}

// src/services/AnnotationService.ts
export class AnnotationService {
  async getAnnotations(dashboardId: string, from: Date, to: Date) {
    return prisma.annotation.findMany({
      where: {
        dashboardId,
        time: { gte: from, lte: to }
      }
    });
  }
  
  async createAnnotation(annotation: Omit<Annotation, 'id'>) {
    return prisma.annotation.create({ data: annotation });
  }
}

// Add to panel rendering
const renderAnnotations = (annotations: Annotation[]) => {
  return annotations.map(ann => (
    <div 
      key={ann.id}
      className="annotation-marker"
      style={{ left: `${getXPosition(ann.time)}%` }}
      title={ann.text}
    />
  ));
};
```

## Deployment Setup

### Docker Compose Complete Configuration

```yaml
version: '3.8'

services:
  # Your Next.js App
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/manufacturing
      - REDIS_URL=redis://redis:6379
      - PROMETHEUS_URL=http://prometheus:9090
      - INFLUXDB_URL=http://influxdb:8086
    depends_on:
      - postgres
      - redis
      - prometheus
      - influxdb

  # TimescaleDB
  postgres:
    image: timescale/timescaledb:latest-pg14
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=manufacturing
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-postgres:/docker-entrypoint-initdb.d

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data

  # Analytics Engine
  Analytics-engine:
    build: ./manufacturing-dashboard/scripts/Analytics-engine
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  # Data Sources
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      - INFLUXDB_DB=metrics
      - INFLUXDB_ADMIN_USER=admin
      - INFLUXDB_ADMIN_PASSWORD=admin123
    volumes:
      - influxdb-data:/var/lib/influxdb2

  # Ollama (existing)
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  influxdb-data:
  ollama-data:
```

## API Routes Implementation

```typescript
// src/app/api/Analytics/variables/query/route.ts
export async function POST(request: Request) {
  const { datasource, query, context } = await request.json();
  
  const ds = dataSourceRegistry.get(datasource);
  const result = await ds.metricFindQuery(query);
  
  return Response.json({ data: result });
}

// src/app/api/Analytics/query/route.ts
export async function POST(request: Request) {
  const { queries, timeRange, datasource } = await request.json();
  
  const results = await Promise.all(
    queries.map(q => dataSourceRegistry.query(datasource, {
      ...q,
      start: timeRange.from,
      end: timeRange.to
    }))
  );
  
  return Response.json({ series: results });
}

// src/app/api/Analytics/dashboards/import/route.ts
export async function POST(request: Request) {
  const json = await request.json();
  
  const dashboard = dashboardImportExport.import(json);
  const saved = await dashboardService.create(dashboard);
  
  return Response.json(saved);
}
```

## Testing Everything

```typescript
// src/__tests__/integration/grafana-compatibility.test.ts
describe('Analytics Compatibility', () => {
  it('should import Analytics Dashboard JSON', async () => {
    const grafanaJson = loadFixture('grafana-dashboard.json');
    const dashboard = await importService.import(grafanaJson);
    
    expect(dashboard.panels).toHaveLength(6);
    expect(dashboard.variables).toHaveLength(3);
  });
  
  it('should interpolate variables in queries', () => {
    const query = 'SELECT * FROM metrics WHERE host = $hostname';
    const interpolated = variableEngine.interpolate(query);
    
    expect(interpolated).toBe('SELECT * FROM metrics WHERE host = \'server1\'');
  });
  
  it('should export to Analytics format', async () => {
    const dashboard = await dashboardService.get('test-dashboard');
    const exported = exportService.export(dashboard);
    
    expect(exported.schemaVersion).toBe(37);
    expect(exported.panels[0].type).toBe('graph');
  });
});
```

## Final Implementation Checklist

- [x] Variables & Templating Engine
- [x] Variable UI Components  
- [x] Panel Editor Framework
- [ ] Query Editor Components (per data source)
- [ ] Visualization Options Editor
- [ ] Transform Editor
- [ ] Data Source Plugins (Prometheus, InfluxDB, SQL)
- [ ] Explore Mode Page
- [ ] Import/Export Service
- [ ] Authentication with NextAuth
- [ ] Basic RBAC
- [ ] Annotations Service
- [ ] Docker Compose Setup
- [ ] API Routes
- [ ] Integration Tests

## Time Estimate

With the simplified approach and code provided:
- **1 Developer**: 2-3 weeks for core features
- **2 Developers**: 1-2 weeks
- Focus on compatibility over feature parity
- Use existing libraries where possible
- Implement only what your users need