# Grafana Parity Implementation Examples

## 1. Plugin System Architecture

### Base Plugin Interface
```typescript
// src/core/plugins/types.ts
export interface Plugin {
  id: string;
  type: 'panel' | 'datasource' | 'app';
  name: string;
  version: string;
  info: PluginInfo;
  dependencies?: PluginDependency[];
  
  // Lifecycle hooks
  load(): Promise<void>;
  start(): void;
  stop(): void;
}

export interface PanelPlugin extends Plugin {
  type: 'panel';
  panel: {
    component: React.ComponentType<PanelProps>;
    configEditor?: React.ComponentType<PanelConfigProps>;
    defaults: any;
    migrations?: PanelMigration[];
  };
}

export interface DataSourcePlugin extends Plugin {
  type: 'datasource';
  datasource: {
    query: (request: DataQueryRequest) => Promise<DataQueryResponse>;
    testDatasource: () => Promise<TestResult>;
    metricFindQuery?: (query: string) => Promise<MetricFindValue[]>;
    annotationQuery?: (query: AnnotationQuery) => Promise<Annotation[]>;
    configEditor: React.ComponentType<DataSourceConfigProps>;
    queryEditor: React.ComponentType<QueryEditorProps>;
  };
}
```

### Plugin Loader Implementation
```typescript
// src/core/plugins/PluginLoader.ts
export class PluginLoader {
  private plugins = new Map<string, Plugin>();
  private loaders = new Map<string, PluginLoaderConfig>();

  async loadPlugin(pluginId: string): Promise<Plugin> {
    // Check if already loaded
    if (this.plugins.has(pluginId)) {
      return this.plugins.get(pluginId)!;
    }

    // Load plugin module
    const config = this.loaders.get(pluginId);
    if (!config) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Dynamic import for code splitting
      const module = await import(
        /* webpackChunkName: "[request]" */
        `@/plugins/${config.type}/${pluginId}/module`
      );

      const plugin = module.plugin as Plugin;
      
      // Validate plugin
      this.validatePlugin(plugin);
      
      // Initialize plugin
      await plugin.load();
      
      // Register plugin
      this.plugins.set(pluginId, plugin);
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.id || !plugin.type || !plugin.name) {
      throw new Error('Invalid plugin: missing required fields');
    }

    // Type-specific validation
    switch (plugin.type) {
      case 'panel':
        this.validatePanelPlugin(plugin as PanelPlugin);
        break;
      case 'datasource':
        this.validateDataSourcePlugin(plugin as DataSourcePlugin);
        break;
    }
  }
}
```

### Example Panel Plugin
```typescript
// src/plugins/panel/geomap/module.ts
import { PanelPlugin } from '@/core/plugins/types';
import { GeomapPanel } from './GeomapPanel';
import { GeomapOptions, defaultOptions } from './types';
import { GeomapEditor } from './GeomapEditor';

export const plugin: PanelPlugin = {
  id: 'geomap',
  type: 'panel',
  name: 'Geomap',
  version: '1.0.0',
  info: {
    author: 'Manufacturing Analytics Team',
    description: 'Display data on a geographic map',
    keywords: ['map', 'geomap', 'geographic', 'location'],
    logos: {
      small: '/public/plugins/geomap/img/icon.svg',
      large: '/public/plugins/geomap/img/logo.svg'
    }
  },
  
  panel: {
    component: GeomapPanel,
    configEditor: GeomapEditor,
    defaults: defaultOptions,
    migrations: [
      {
        version: '1.0.0',
        migrate: (panel) => {
          // Migration logic
          return panel;
        }
      }
    ]
  },

  async load() {
    // Load any required dependencies
    await import('leaflet');
    await import('leaflet/dist/leaflet.css');
  },

  start() {
    console.log('Geomap plugin started');
  },

  stop() {
    console.log('Geomap plugin stopped');
  }
};
```

## 2. Unified Alerting System

### Alert Rule Engine
```typescript
// src/core/alerting/UnifiedAlertingEngine.ts
export class UnifiedAlertingEngine {
  private evaluator: AlertEvaluator;
  private scheduler: AlertScheduler;
  private notifier: NotificationManager;
  private state: AlertStateManager;

  async createAlertRule(rule: AlertRuleDTO): Promise<AlertRule> {
    // Validate rule
    this.validateAlertRule(rule);

    // Parse conditions
    const conditions = this.parseConditions(rule.conditions);

    // Create alert rule
    const alertRule: AlertRule = {
      uid: generateUID(),
      ...rule,
      conditions,
      state: 'inactive',
      created: new Date(),
      updated: new Date()
    };

    // Save to database
    await this.saveAlertRule(alertRule);

    // Schedule evaluation
    this.scheduler.scheduleRule(alertRule);

    return alertRule;
  }

  private parseConditions(conditions: string): AlertCondition[] {
    // Parse Grafana-style alert conditions
    // Example: "WHEN avg() OF query(A, 5m, now) IS ABOVE 0.8"
    const parser = new AlertConditionParser();
    return parser.parse(conditions);
  }

  async evaluateRule(rule: AlertRule): Promise<AlertEvaluation> {
    const evaluation: AlertEvaluation = {
      ruleUID: rule.uid,
      timestamp: new Date(),
      results: []
    };

    // Execute queries
    for (const query of rule.queries) {
      const result = await this.executeQuery(query);
      evaluation.results.push(result);
    }

    // Evaluate conditions
    const state = this.evaluator.evaluate(rule.conditions, evaluation.results);
    
    // Update state
    await this.state.updateState(rule.uid, state);

    // Handle state transitions
    if (state.changed) {
      await this.handleStateChange(rule, state);
    }

    return evaluation;
  }

  private async handleStateChange(rule: AlertRule, state: AlertState): Promise<void> {
    // Check if should notify
    if (this.shouldNotify(rule, state)) {
      const notification = this.createNotification(rule, state);
      await this.notifier.send(notification);
    }

    // Create annotation
    if (rule.annotations.enabled) {
      await this.createAlertAnnotation(rule, state);
    }
  }
}
```

### Notification Routing
```typescript
// src/core/alerting/NotificationRouter.ts
export class NotificationRouter {
  private policies: NotificationPolicy[];
  private matchers: Map<string, LabelMatcher>;

  async route(alert: Alert): Promise<ContactPoint[]> {
    // Find matching policies
    const matchingPolicies = this.policies.filter(policy => 
      this.matchesPolicy(alert, policy)
    );

    // Sort by specificity
    matchingPolicies.sort((a, b) => b.specificity - a.specificity);

    // Get contact points
    const contactPoints = new Set<ContactPoint>();
    
    for (const policy of matchingPolicies) {
      // Apply routing rules
      if (this.shouldRoute(alert, policy)) {
        policy.contactPoints.forEach(cp => contactPoints.add(cp));
      }

      // Stop if exclusive
      if (policy.exclusive) {
        break;
      }
    }

    return Array.from(contactPoints);
  }

  private matchesPolicy(alert: Alert, policy: NotificationPolicy): boolean {
    // Match labels
    for (const matcher of policy.matchers) {
      if (!this.matchesLabel(alert.labels, matcher)) {
        return false;
      }
    }

    // Match time restrictions
    if (policy.timeRestrictions) {
      if (!this.matchesTimeRestriction(policy.timeRestrictions)) {
        return false;
      }
    }

    return true;
  }

  private shouldRoute(alert: Alert, policy: NotificationPolicy): boolean {
    // Check grouping
    if (policy.groupBy) {
      return this.shouldRouteGroup(alert, policy);
    }

    // Check rate limiting
    if (policy.rateLimit) {
      return this.checkRateLimit(alert, policy);
    }

    return true;
  }
}
```

## 3. Public Dashboard Implementation

### Public Dashboard Service
```typescript
// src/core/sharing/PublicDashboardService.ts
export class PublicDashboardService {
  async createPublicDashboard(
    dashboardUid: string, 
    config: PublicDashboardConfig
  ): Promise<PublicDashboard> {
    // Validate dashboard exists
    const dashboard = await this.dashboardService.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Generate access token
    const accessToken = this.generateSecureToken();

    // Create public dashboard
    const publicDashboard: PublicDashboard = {
      uid: generateUID(),
      dashboardUid,
      accessToken,
      isEnabled: true,
      annotationsEnabled: config.annotationsEnabled ?? false,
      timeSelectionEnabled: config.timeSelectionEnabled ?? false,
      share: config.share ?? 'public',
      created: new Date(),
      updated: new Date()
    };

    // Apply access restrictions
    if (config.share === 'password') {
      publicDashboard.passwordHash = await this.hashPassword(config.password!);
    }

    if (config.share === 'email') {
      publicDashboard.allowedEmails = config.emails;
    }

    // Save to database
    await this.repository.save(publicDashboard);

    return publicDashboard;
  }

  async getPublicDashboard(accessToken: string): Promise<Dashboard> {
    // Find public dashboard
    const publicDash = await this.repository.findByToken(accessToken);
    if (!publicDash || !publicDash.isEnabled) {
      throw new Error('Public dashboard not found');
    }

    // Load dashboard
    const dashboard = await this.dashboardService.get(publicDash.dashboardUid);

    // Apply restrictions
    return this.applyPublicRestrictions(dashboard, publicDash);
  }

  private applyPublicRestrictions(
    dashboard: Dashboard, 
    config: PublicDashboard
  ): Dashboard {
    // Clone dashboard
    const publicDashboard = cloneDeep(dashboard);

    // Remove edit capabilities
    publicDashboard.editable = false;
    publicDashboard.meta.canEdit = false;
    publicDashboard.meta.canSave = false;
    publicDashboard.meta.canAdmin = false;

    // Apply time restrictions
    if (!config.timeSelectionEnabled) {
      publicDashboard.timepicker.hidden = true;
    }

    // Remove annotations if disabled
    if (!config.annotationsEnabled) {
      publicDashboard.annotations = [];
    }

    // Filter panels based on permissions
    publicDashboard.panels = publicDashboard.panels.filter(panel => 
      this.isPanelAllowed(panel, config)
    );

    return publicDashboard;
  }
}
```

### Public Dashboard UI
```tsx
// src/app/public/[token]/page.tsx
export default function PublicDashboardPage({ params }: { params: { token: string } }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    loadPublicDashboard();
  }, [params.token]);

  const loadPublicDashboard = async () => {
    try {
      const response = await fetch(`/api/public/dashboards/${params.token}`);
      
      if (response.status === 401) {
        setRequiresAuth(true);
        return;
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load public dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (requiresAuth) {
    return <PublicDashboardAuth token={params.token} onAuth={loadPublicDashboard} />;
  }

  if (!dashboard) {
    return <PublicDashboardNotFound />;
  }

  return (
    <PublicDashboardLayout>
      <DashboardViewer 
        dashboard={dashboard}
        isPublic={true}
        hideControls={true}
      />
    </PublicDashboardLayout>
  );
}
```

## 4. Data Source Proxy Implementation

### Secure Data Source Proxy
```typescript
// src/core/datasources/DataSourceProxy.ts
export class DataSourceProxy {
  private validator: RequestValidator;
  private sanitizer: RequestSanitizer;
  private cache: QueryCache;

  async proxy(
    datasourceId: string, 
    request: ProxyRequest, 
    user: User
  ): Promise<ProxyResponse> {
    // Validate permissions
    const datasource = await this.getDatasource(datasourceId);
    this.validateAccess(datasource, user);

    // Validate and sanitize request
    this.validator.validate(request);
    const sanitizedRequest = this.sanitizer.sanitize(request);

    // Check cache
    const cacheKey = this.getCacheKey(datasourceId, sanitizedRequest);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build proxied request
    const proxiedRequest = this.buildProxiedRequest(datasource, sanitizedRequest);

    try {
      // Execute request
      const response = await this.executeRequest(proxiedRequest);

      // Process response
      const processedResponse = this.processResponse(response, datasource);

      // Cache if applicable
      if (this.shouldCache(request)) {
        await this.cache.set(cacheKey, processedResponse, this.getCacheTTL(request));
      }

      return processedResponse;
    } catch (error) {
      // Log and sanitize error
      this.logger.error('Proxy request failed', { datasourceId, error });
      throw this.sanitizeError(error);
    }
  }

  private buildProxiedRequest(
    datasource: DataSource, 
    request: ProxyRequest
  ): HttpRequest {
    const headers = {
      ...request.headers,
      ...this.getAuthHeaders(datasource),
      'X-Grafana-Org-Id': '1',
      'X-DS-Proxy': 'true'
    };

    // Remove sensitive headers
    delete headers['authorization'];
    delete headers['cookie'];

    return {
      method: request.method,
      url: this.buildUrl(datasource, request.path),
      headers,
      data: request.body,
      timeout: datasource.config.timeout || 30000
    };
  }

  private getAuthHeaders(datasource: DataSource): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (datasource.config.authType) {
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(
          `${datasource.config.username}:${datasource.config.password}`
        ).toString('base64')}`;
        break;
      
      case 'bearer':
        headers['Authorization'] = `Bearer ${datasource.config.token}`;
        break;
      
      case 'apikey':
        headers[datasource.config.apiKeyHeader || 'X-API-Key'] = datasource.config.apiKey;
        break;
    }

    return headers;
  }
}
```

## 5. Advanced Panel: Canvas Implementation

### Canvas Panel Component
```tsx
// src/plugins/panel/canvas/CanvasPanel.tsx
export const CanvasPanel: React.FC<PanelProps<CanvasOptions>> = ({
  options,
  data,
  width,
  height,
  onOptionsChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>(options.elements || []);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Render background
    if (options.background) {
      renderBackground(ctx, options.background, width, height);
    }

    // Render elements
    elements.forEach(element => {
      renderElement(ctx, element, data, options);
    });

    // Render selection
    if (selectedElement) {
      renderSelection(ctx, selectedElement, elements);
    }
  }, [elements, data, width, height, options, selectedElement]);

  const handleElementAdd = (type: ElementType) => {
    const newElement: CanvasElement = {
      id: generateUID(),
      type,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      style: getDefaultStyle(type),
      data: {}
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    onOptionsChange({ ...options, elements: updatedElements });
  };

  const handleElementUpdate = (id: string, updates: Partial<CanvasElement>) => {
    const updatedElements = elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(updatedElements);
    onOptionsChange({ ...options, elements: updatedElements });
  };

  return (
    <div className="canvas-panel">
      {options.showToolbar && (
        <CanvasToolbar 
          onAddElement={handleElementAdd}
          selectedElement={selectedElement}
          onDeleteElement={() => handleDeleteElement(selectedElement)}
        />
      )}
      
      <div className="canvas-container" style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        
        {options.enableInteraction && (
          <CanvasInteractionLayer
            elements={elements}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            onUpdateElement={handleElementUpdate}
          />
        )}
      </div>
    </div>
  );
};

// Element renderer
function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: DataFrame[],
  options: CanvasOptions
) {
  ctx.save();

  // Apply element transforms
  ctx.translate(element.position.x, element.position.y);
  if (element.rotation) {
    ctx.rotate(element.rotation * Math.PI / 180);
  }

  switch (element.type) {
    case 'text':
      renderTextElement(ctx, element, data);
      break;
    
    case 'metric':
      renderMetricElement(ctx, element, data);
      break;
    
    case 'shape':
      renderShapeElement(ctx, element);
      break;
    
    case 'image':
      renderImageElement(ctx, element);
      break;
    
    case 'chart':
      renderChartElement(ctx, element, data);
      break;
    
    case 'connection':
      renderConnectionElement(ctx, element, options);
      break;
  }

  ctx.restore();
}
```

## 6. Query Caching System

### Distributed Query Cache
```typescript
// src/core/caching/QueryCache.ts
export class QueryCache {
  private localCache: LRUCache<string, CachedResult>;
  private redisClient: Redis;
  private compressionEnabled: boolean;

  constructor(config: QueryCacheConfig) {
    this.localCache = new LRUCache({
      max: config.maxLocalEntries || 1000,
      ttl: config.defaultTTL || 300000, // 5 minutes
      updateAgeOnGet: true
    });

    this.redisClient = new Redis(config.redis);
    this.compressionEnabled = config.compression ?? true;
  }

  async get(key: string): Promise<CachedResult | null> {
    // Check local cache first
    const local = this.localCache.get(key);
    if (local) {
      this.metrics.increment('cache.hit.local');
      return local;
    }

    // Check distributed cache
    const distributed = await this.getFromRedis(key);
    if (distributed) {
      this.metrics.increment('cache.hit.distributed');
      // Populate local cache
      this.localCache.set(key, distributed);
      return distributed;
    }

    this.metrics.increment('cache.miss');
    return null;
  }

  async set(
    key: string, 
    result: QueryResult, 
    ttl?: number
  ): Promise<void> {
    const cached: CachedResult = {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    // Set in local cache
    this.localCache.set(key, cached);

    // Set in distributed cache
    await this.setInRedis(key, cached, ttl);
  }

  generateKey(request: DataQueryRequest): string {
    const components = [
      request.datasource.uid,
      request.range.from.valueOf(),
      request.range.to.valueOf(),
      request.interval,
      ...request.targets.map(t => this.hashQuery(t))
    ];

    return createHash('sha256')
      .update(components.join(':'))
      .digest('hex');
  }

  private async getFromRedis(key: string): Promise<CachedResult | null> {
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;

      const decompressed = this.compressionEnabled 
        ? await this.decompress(data)
        : data;

      return JSON.parse(decompressed);
    } catch (error) {
      this.logger.error('Redis get error:', error);
      return null;
    }
  }

  private async setInRedis(
    key: string, 
    cached: CachedResult, 
    ttl?: number
  ): Promise<void> {
    try {
      const data = JSON.stringify(cached);
      const compressed = this.compressionEnabled
        ? await this.compress(data)
        : data;

      await this.redisClient.setex(
        key,
        Math.floor((ttl || cached.ttl) / 1000),
        compressed
      );
    } catch (error) {
      this.logger.error('Redis set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate local cache
    for (const key of this.localCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.localCache.delete(key);
      }
    }

    // Invalidate distributed cache
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
```

## 7. Embedding Framework

### Embed Service
```typescript
// src/core/embedding/EmbedService.ts
export class EmbedService {
  async createEmbedToken(
    resourceType: 'dashboard' | 'panel',
    resourceId: string,
    options: EmbedOptions
  ): Promise<EmbedToken> {
    // Validate resource exists
    await this.validateResource(resourceType, resourceId);

    // Generate secure token
    const token = this.generateSecureToken();
    
    // Create embed configuration
    const embed: EmbedConfig = {
      token,
      resourceType,
      resourceId,
      options: {
        theme: options.theme || 'light',
        hideControls: options.hideControls ?? true,
        timeRange: options.timeRange,
        variables: options.variables,
        refresh: options.refresh,
        width: options.width,
        height: options.height
      },
      restrictions: {
        domains: options.allowedDomains || [],
        expiry: options.expiry,
        maxViews: options.maxViews
      },
      created: new Date(),
      createdBy: this.getCurrentUser().id
    };

    // Save embed configuration
    await this.repository.save(embed);

    return {
      token,
      embedUrl: this.generateEmbedUrl(token),
      iframeCode: this.generateIframeCode(embed)
    };
  }

  generateIframeCode(embed: EmbedConfig): string {
    const params = new URLSearchParams({
      theme: embed.options.theme,
      refresh: embed.options.refresh || '',
      kiosk: embed.options.hideControls ? '1' : '0'
    });

    if (embed.options.timeRange) {
      params.append('from', embed.options.timeRange.from);
      params.append('to', embed.options.timeRange.to);
    }

    if (embed.options.variables) {
      Object.entries(embed.options.variables).forEach(([key, value]) => {
        params.append(`var-${key}`, value);
      });
    }

    const width = embed.options.width || '100%';
    const height = embed.options.height || '600';

    return `<iframe
  src="${this.config.baseUrl}/embed/${embed.token}?${params}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: 0;"
  allowfullscreen>
</iframe>`;
  }

  async validateEmbedAccess(token: string, request: Request): Promise<EmbedConfig> {
    // Load embed config
    const embed = await this.repository.findByToken(token);
    if (!embed) {
      throw new Error('Invalid embed token');
    }

    // Check expiry
    if (embed.restrictions.expiry && new Date() > embed.restrictions.expiry) {
      throw new Error('Embed token expired');
    }

    // Check domain restrictions
    if (embed.restrictions.domains.length > 0) {
      const origin = request.headers.get('origin') || request.headers.get('referer');
      if (!origin || !this.isDomainAllowed(origin, embed.restrictions.domains)) {
        throw new Error('Domain not allowed');
      }
    }

    // Check view limits
    if (embed.restrictions.maxViews) {
      const views = await this.incrementViewCount(token);
      if (views > embed.restrictions.maxViews) {
        throw new Error('View limit exceeded');
      }
    }

    return embed;
  }
}
```

### Embed UI Component
```tsx
// src/app/embed/[token]/page.tsx
export default function EmbedPage({ params }: { params: { token: string } }) {
  const [content, setContent] = useState<EmbedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadEmbedContent();
  }, [params.token]);

  const loadEmbedContent = async () => {
    try {
      // Validate embed token
      const response = await fetch(`/api/embed/${params.token}/validate`, {
        method: 'POST',
        headers: {
          'X-Embed-Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Invalid embed token');
      }

      const embed = await response.json();

      // Apply embed options
      const options = {
        ...embed.options,
        theme: searchParams.get('theme') || embed.options.theme,
        from: searchParams.get('from') || embed.options.timeRange?.from,
        to: searchParams.get('to') || embed.options.timeRange?.to
      };

      // Load content based on type
      const content = await this.loadContent(embed.resourceType, embed.resourceId, options);
      setContent(content);
    } catch (error) {
      setError(error.message);
    }
  };

  if (error) {
    return <EmbedError message={error} />;
  }

  if (!content) {
    return <EmbedLoading />;
  }

  return (
    <EmbedContainer theme={content.options.theme}>
      {content.type === 'dashboard' && (
        <DashboardViewer
          dashboard={content.dashboard}
          isEmbedded={true}
          hideControls={content.options.hideControls}
          timeRange={content.options.timeRange}
          variables={content.options.variables}
        />
      )}
      
      {content.type === 'panel' && (
        <PanelViewer
          panel={content.panel}
          isEmbedded={true}
          width="100%"
          height="100%"
          timeRange={content.options.timeRange}
        />
      )}
    </EmbedContainer>
  );
}
```

These implementation examples demonstrate how to build key Grafana features while maintaining the manufacturing-specific focus of the platform. Each example includes proper error handling, security considerations, and extensibility for future enhancements.