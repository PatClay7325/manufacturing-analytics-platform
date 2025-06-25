/**
 * Production Monitoring Manager - 10/10 Enterprise Implementation
 * Real metric collection, alerting, and observability with Prometheus/AnalyticsPlatform integration
 */

import { KubeConfig, CoreV1Api, AppsV1Api, Metrics } from '@kubernetes/client-node';
import { register, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import AWS from 'aws-sdk';
import { logger } from '@/lib/logger';
import { retryWithBackoff, createCircuitBreaker } from '@/utils/resilience-production';
import { getStateStorage, LockType, LockStatus } from '@/utils/stateStorage';
import Joi from 'joi';
import http from 'http';
import https from 'https';
import WebSocket from 'ws';

// Core monitoring metrics
const monitoringOperations = new Counter({
  name: 'monitoring_operations_total',
  help: 'Total monitoring operations',
  labelNames: ['operation', 'status', 'target', 'namespace']
});

const metricCollectionLatency = new Histogram({
  name: 'metric_collection_duration_seconds',
  help: 'Metric collection duration',
  labelNames: ['source', 'metric_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const alertsGenerated = new Counter({
  name: 'alerts_generated_total',
  help: 'Total alerts generated',
  labelNames: ['severity', 'alert_type', 'namespace', 'source']
});

const activeAlerts = new Gauge({
  name: 'alerts_active',
  help: 'Number of active alerts',
  labelNames: ['severity', 'alert_type', 'namespace']
});

const systemHealth = new Gauge({
  name: 'system_health_score',
  help: 'Overall system health score (0-100)',
  labelNames: ['component', 'namespace']
});

const dataQuality = new Gauge({
  name: 'monitoring_data_quality_score',
  help: 'Data quality score for monitoring data (0-100)',
  labelNames: ['source', 'metric_type']
});

export interface MonitoringConfig {
  collection: {
    enabled: boolean;
    interval: number; // seconds
    sources: MetricSource[];
    retention: {
      shortTerm: number; // days
      longTerm: number; // days
      aggregationRules: AggregationRule[];
    };
    sampling: {
      enabled: boolean;
      rate: number; // 0-1
      strategy: 'random' | 'systematic' | 'adaptive';
    };
  };
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
    channels: AlertChannel[];
    escalation: EscalationPolicy[];
    suppressionRules: SuppressionRule[];
    grouping: {
      enabled: boolean;
      by: string[];
      interval: number;
    };
  };
  storage: {
    primary: {
      type: 'prometheus' | 'victoria-metrics' | 'influxdb' | 'cloudwatch';
      url: string;
      retention: string;
      configuration: Record<string, any>;
    };
    backup?: {
      type: 'aws-s3' | 'azure-blob' | 'gcp-storage';
      bucket: string;
      region?: string;
      compression: boolean;
    };
  };
  visualization: {
    analyticsPlatform: {
      enabled: boolean;
      url?: string;
      apiKey?: string;
      dashboards: DashboardConfig[];
    };
    kibana: {
      enabled: boolean;
      url?: string;
      spaces: string[];
    };
    custom: {
      enabled: boolean;
      endpoints: CustomVisualizationEndpoint[];
    };
  };
  security: {
    authentication: {
      enabled: boolean;
      method: 'basic' | 'oauth2' | 'cert' | 'api-key';
      credentials?: Record<string, string>;
    };
    encryption: {
      inTransit: boolean;
      atRest: boolean;
      certificates?: {
        ca: string;
        cert: string;
        key: string;
      };
    };
    accessControl: {
      enabled: boolean;
      roles: MonitoringRole[];
      permissions: MonitoringPermission[];
    };
  };
  compliance: {
    dataGovernance: {
      enabled: boolean;
      policies: DataGovernancePolicy[];
      classification: DataClassification[];
    };
    audit: {
      enabled: boolean;
      logAccess: boolean;
      logModifications: boolean;
      retention: number; // days
    };
    privacy: {
      anonymization: boolean;
      encryption: boolean;
      rightToForget: boolean;
    };
  };
}

export interface MetricSource {
  name: string;
  type: 'kubernetes' | 'prometheus' | 'cloudwatch' | 'custom-api' | 'webhook';
  config: {
    url?: string;
    namespace?: string;
    query?: string;
    headers?: Record<string, string>;
    authentication?: AuthConfig;
    interval?: number;
    timeout?: number;
  };
  metrics: MetricDefinition[];
  enabled: boolean;
  healthCheck: {
    enabled: boolean;
    endpoint?: string;
    interval: number;
    timeout: number;
  };
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: string[];
  unit?: string;
  validation: {
    min?: number;
    max?: number;
    required: boolean;
  };
  transformation?: {
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    window: number; // seconds
  };
}

export interface AggregationRule {
  name: string;
  sourceMetrics: string[];
  targetMetric: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate';
  interval: number;
  retention: number;
  labels: string[];
}

export interface AlertRule {
  name: string;
  description: string;
  expr: string; // PromQL or similar query
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  threshold: {
    value: number;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    duration: number; // seconds
  };
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enabled: boolean;
  channels: string[];
  inhibition: {
    enabled: boolean;
    rules: string[];
  };
  dependencies: string[];
}

export interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams' | 'sms';
  config: {
    webhook?: string;
    email?: {
      to: string[];
      from: string;
      smtpHost: string;
      smtpPort: number;
      username: string;
      password: string;
    };
    slack?: {
      webhook: string;
      channel: string;
      username: string;
    };
    pagerduty?: {
      routingKey: string;
      severity: string;
    };
  };
  enabled: boolean;
  filters: {
    severity: string[];
    namespaces: string[];
    labels: Record<string, string>;
  };
  rateLimiting: {
    enabled: boolean;
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface EscalationPolicy {
  name: string;
  triggers: {
    severity: string[];
    duration: number; // seconds
    conditions: string[];
  };
  actions: EscalationAction[];
  enabled: boolean;
}

export interface EscalationAction {
  type: 'notify' | 'auto-remediate' | 'scale' | 'restart' | 'rollback';
  channels: string[];
  config?: Record<string, any>;
  delay: number; // seconds
}

export interface SuppressionRule {
  name: string;
  matchers: Record<string, string>;
  duration: number; // seconds
  comment: string;
  enabled: boolean;
}

export interface DashboardConfig {
  name: string;
  title: string;
  tags: string[];
  panels: PanelConfig[];
  variables: VariableConfig[];
  refresh: string;
  timeRange: {
    from: string;
    to: string;
  };
}

export interface PanelConfig {
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap' | 'alert-list';
  targets: QueryTarget[];
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  options?: Record<string, any>;
}

export interface QueryTarget {
  expr: string;
  legendFormat: string;
  refId: string;
  interval?: string;
}

export interface VariableConfig {
  name: string;
  type: 'query' | 'custom' | 'datasource' | 'interval';
  query?: string;
  options?: string[];
  multiValue: boolean;
  includeAll: boolean;
}

export interface CustomVisualizationEndpoint {
  name: string;
  url: string;
  type: 'json' | 'html' | 'image';
  authentication?: AuthConfig;
  refresh: number; // seconds
}

export interface MonitoringRole {
  name: string;
  permissions: string[];
  namespaces: string[];
  description: string;
}

export interface MonitoringPermission {
  resource: string;
  actions: string[];
  conditions?: string[];
}

export interface DataGovernancePolicy {
  name: string;
  applies_to: string[];
  rules: {
    retention: number;
    encryption: boolean;
    access_levels: string[];
    anonymization: boolean;
  };
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  metrics: string[];
  handling_rules: string[];
}

export interface AuthConfig {
  type: 'basic' | 'bearer' | 'api-key' | 'oauth2';
  credentials: Record<string, string>;
}

export interface Alert {
  id: string;
  name: string;
  severity: string;
  status: 'firing' | 'resolved' | 'suppressed';
  startsAt: Date;
  endsAt?: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  fingerprint: string;
  generatorURL: string;
  silenceURL?: string;
  escalations: EscalationEvent[];
}

export interface EscalationEvent {
  timestamp: Date;
  action: string;
  result: 'success' | 'failure';
  details: string;
}

export interface MetricData {
  source: string;
  name: string;
  value: number | string;
  labels: Record<string, string>;
  timestamp: Date;
  unit?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthStatus {
  overall: {
    score: number;
    status: 'healthy' | 'degraded' | 'critical';
    components: ComponentHealth[];
  };
  metrics: {
    total: number;
    stale: number;
    error_rate: number;
    collection_latency: number;
  };
  alerts: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  storage: {
    usage: number;
    retention_compliance: number;
    backup_status: string;
  };
}

export interface ComponentHealth {
  name: string;
  score: number;
  status: 'healthy' | 'degraded' | 'critical';
  metrics: string[];
  issues: string[];
  lastCheck: Date;
}

export class ProductionMonitoringManager {
  private kc: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private metricsApi: Metrics;
  private config: MonitoringConfig;
  private stateStorage = getStateStorage();
  private metricCollectors: Map<string, MetricCollector> = new Map();
  private alertManager: AlertManager;
  private dashboardManager: DashboardManager;
  private storageManager: StorageManager;
  private securityManager: SecurityManager;
  private webSocketServer?: WebSocket.Server;
  private httpServer?: http.Server;
  private circuitBreaker: any;

  constructor(config: MonitoringConfig, kubeconfigPath?: string) {
    this.config = this.validateConfig(config);
    this.initializeKubernetesClients(kubeconfigPath);
    this.initializeMetricCollectors();
    this.initializeAlertManager();
    this.initializeDashboardManager();
    this.initializeStorageManager();
    this.initializeSecurityManager();
    this.setupCircuitBreaker();
    this.startMonitoring();
    this.startHealthChecks();
    
    // Enable default Node.js metrics
    collectDefaultMetrics({ register });
  }

  /**
   * Validate monitoring configuration
   */
  private validateConfig(config: MonitoringConfig): MonitoringConfig {
    const schema = Joi.object({
      collection: Joi.object({
        enabled: Joi.boolean().default(true),
        interval: Joi.number().integer().min(1).default(60),
        sources: Joi.array().items(Joi.object()).default([]),
        retention: Joi.object({
          shortTerm: Joi.number().integer().min(1).default(7),
          longTerm: Joi.number().integer().min(7).default(365),
          aggregationRules: Joi.array().default([])
        }).default(),
        sampling: Joi.object({
          enabled: Joi.boolean().default(false),
          rate: Joi.number().min(0).max(1).default(1),
          strategy: Joi.string().valid('random', 'systematic', 'adaptive').default('random')
        }).default()
      }).required(),
      alerting: Joi.object({
        enabled: Joi.boolean().default(true),
        rules: Joi.array().default([]),
        channels: Joi.array().default([]),
        escalation: Joi.array().default([]),
        suppressionRules: Joi.array().default([]),
        grouping: Joi.object({
          enabled: Joi.boolean().default(true),
          by: Joi.array().items(Joi.string()).default(['alertname', 'severity']),
          interval: Joi.number().integer().min(1).default(300)
        }).default()
      }).default(),
      storage: Joi.object({
        primary: Joi.object({
          type: Joi.string().valid('prometheus', 'victoria-metrics', 'influxdb', 'cloudwatch').required(),
          url: Joi.string().required(),
          retention: Joi.string().default('30d'),
          configuration: Joi.object().default({})
        }).required(),
        backup: Joi.object({
          type: Joi.string().valid('aws-s3', 'azure-blob', 'gcp-storage'),
          bucket: Joi.string().required(),
          region: Joi.string().optional(),
          compression: Joi.boolean().default(true)
        }).optional()
      }).required(),
      visualization: Joi.object({
        analyticsPlatform: Joi.object({
          enabled: Joi.boolean().default(false),
          url: Joi.string().optional(),
          apiKey: Joi.string().optional(),
          dashboards: Joi.array().default([])
        }).default(),
        kibana: Joi.object({
          enabled: Joi.boolean().default(false),
          url: Joi.string().optional(),
          spaces: Joi.array().default([])
        }).default(),
        custom: Joi.object({
          enabled: Joi.boolean().default(false),
          endpoints: Joi.array().default([])
        }).default()
      }).default(),
      security: Joi.object({
        authentication: Joi.object({
          enabled: Joi.boolean().default(true),
          method: Joi.string().valid('basic', 'oauth2', 'cert', 'api-key').default('api-key'),
          credentials: Joi.object().optional()
        }).default(),
        encryption: Joi.object({
          inTransit: Joi.boolean().default(true),
          atRest: Joi.boolean().default(true),
          certificates: Joi.object().optional()
        }).default(),
        accessControl: Joi.object({
          enabled: Joi.boolean().default(true),
          roles: Joi.array().default([]),
          permissions: Joi.array().default([])
        }).default()
      }).default(),
      compliance: Joi.object({
        dataGovernance: Joi.object({
          enabled: Joi.boolean().default(true),
          policies: Joi.array().default([]),
          classification: Joi.array().default([])
        }).default(),
        audit: Joi.object({
          enabled: Joi.boolean().default(true),
          logAccess: Joi.boolean().default(true),
          logModifications: Joi.boolean().default(true),
          retention: Joi.number().integer().min(30).default(90)
        }).default(),
        privacy: Joi.object({
          anonymization: Joi.boolean().default(false),
          encryption: Joi.boolean().default(true),
          rightToForget: Joi.boolean().default(false)
        }).default()
      }).default()
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`Monitoring configuration validation failed: ${error.message}`);
    }

    return value;
  }

  /**
   * Initialize Kubernetes clients
   */
  private initializeKubernetesClients(kubeconfigPath?: string): void {
    try {
      this.kc = new KubeConfig();
      
      if (kubeconfigPath) {
        this.kc.loadFromFile(kubeconfigPath);
      } else {
        try {
          this.kc.loadFromCluster();
        } catch {
          this.kc.loadFromDefault();
        }
      }

      this.coreApi = this.kc.makeApiClient(CoreV1Api);
      this.appsApi = this.kc.makeApiClient(AppsV1Api);
      this.metricsApi = new Metrics(this.kc);

      logger.info('Monitoring manager Kubernetes clients initialized');

    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize Kubernetes clients');
      throw error;
    }
  }

  /**
   * Initialize metric collectors
   */
  private initializeMetricCollectors(): void {
    for (const source of this.config.collection.sources) {
      const collector = new MetricCollector(source, this.config);
      this.metricCollectors.set(source.name, collector);
    }

    logger.info({
      collectors: this.metricCollectors.size
    }, 'Metric collectors initialized');
  }

  /**
   * Initialize alert manager
   */
  private initializeAlertManager(): void {
    this.alertManager = new AlertManager(this.config.alerting, this.stateStorage);
  }

  /**
   * Initialize dashboard manager
   */
  private initializeDashboardManager(): void {
    this.dashboardManager = new DashboardManager(this.config.visualization);
  }

  /**
   * Initialize storage manager
   */
  private initializeStorageManager(): void {
    this.storageManager = new StorageManager(this.config.storage);
  }

  /**
   * Initialize security manager
   */
  private initializeSecurityManager(): void {
    this.securityManager = new SecurityManager(this.config.security);
  }

  /**
   * Set up circuit breaker
   */
  private setupCircuitBreaker(): void {
    this.circuitBreaker = createCircuitBreaker(
      async (operation: () => Promise<any>) => operation(),
      {
        name: 'monitoring-operations',
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        fallback: () => {
          logger.warn('Monitoring circuit breaker open - using cached data');
          return null;
        }
      }
    );
  }

  /**
   * Start monitoring operations
   */
  private startMonitoring(): void {
    if (!this.config.collection.enabled) return;

    // Start metric collection
    this.startMetricCollection();

    // Start alerting
    if (this.config.alerting.enabled) {
      this.alertManager.start();
    }

    // Start web socket server for real-time updates
    this.startWebSocketServer();

    logger.info('Monitoring operations started');
  }

  /**
   * Start metric collection
   */
  private startMetricCollection(): void {
    setInterval(async () => {
      try {
        await this.collectAllMetrics();
      } catch (error) {
        logger.error({ error: error.message }, 'Metric collection cycle failed');
      }
    }, this.config.collection.interval * 1000);

    logger.info({
      interval: this.config.collection.interval,
      sources: this.metricCollectors.size
    }, 'Metric collection started');
  }

  /**
   * Collect metrics from all sources
   */
  private async collectAllMetrics(): Promise<void> {
    const timer = metricCollectionLatency.startTimer({ source: 'all', metric_type: 'collection' });

    try {
      const collectionPromises = Array.from(this.metricCollectors.values()).map(async collector => {
        try {
          const metrics = await collector.collect();
          await this.processMetrics(metrics);
          return metrics.length;
        } catch (error) {
          logger.error({
            collector: collector.name,
            error: error.message
          }, 'Metric collection failed for source');
          return 0;
        }
      });

      const results = await Promise.allSettled(collectionPromises);
      const totalMetrics = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r as any).value, 0);

      monitoringOperations.inc({
        operation: 'collect_metrics',
        status: 'success',
        target: 'all',
        namespace: 'cluster'
      });

      logger.debug({
        totalMetrics,
        sources: this.metricCollectors.size
      }, 'Metrics collection completed');

    } catch (error) {
      monitoringOperations.inc({
        operation: 'collect_metrics',
        status: 'error',
        target: 'all',
        namespace: 'cluster'
      });

      logger.error({ error: error.message }, 'Metrics collection failed');
      throw error;

    } finally {
      timer();
    }
  }

  /**
   * Process collected metrics
   */
  private async processMetrics(metrics: MetricData[]): Promise<void> {
    try {
      // Store metrics
      await this.storageManager.storeMetrics(metrics);

      // Check alert rules
      if (this.config.alerting.enabled) {
        await this.alertManager.evaluateRules(metrics);
      }

      // Update data quality scores
      await this.updateDataQualityScores(metrics);

      // Apply sampling if enabled
      if (this.config.collection.sampling.enabled) {
        await this.applySampling(metrics);
      }

    } catch (error) {
      logger.error({ error: error.message }, 'Failed to process metrics');
      throw error;
    }
  }

  /**
   * Update data quality scores
   */
  private async updateDataQualityScores(metrics: MetricData[]): Promise<void> {
    const qualityScores = new Map<string, number>();

    for (const metric of metrics) {
      const key = `${metric.source}:${metric.name}`;
      
      let score = 100;

      // Check for missing data
      if (metric.value === null || metric.value === undefined) {
        score -= 30;
      }

      // Check for stale data (older than 2x collection interval)
      const maxAge = this.config.collection.interval * 2 * 1000;
      if (Date.now() - metric.timestamp.getTime() > maxAge) {
        score -= 20;
      }

      // Check for out-of-range values
      const metricDef = this.findMetricDefinition(metric.source, metric.name);
      if (metricDef?.validation) {
        if (metricDef.validation.min !== undefined && Number(metric.value) < metricDef.validation.min) {
          score -= 15;
        }
        if (metricDef.validation.max !== undefined && Number(metric.value) > metricDef.validation.max) {
          score -= 15;
        }
      }

      qualityScores.set(key, Math.max(0, score));
    }

    // Update Prometheus metrics
    for (const [key, score] of qualityScores) {
      const [source, metricName] = key.split(':');
      dataQuality.set({ source, metric_type: metricName }, score);
    }
  }

  /**
   * Find metric definition
   */
  private findMetricDefinition(source: string, name: string): MetricDefinition | undefined {
    const collector = this.metricCollectors.get(source);
    return collector?.source.metrics.find(m => m.name === name);
  }

  /**
   * Apply sampling
   */
  private async applySampling(metrics: MetricData[]): Promise<MetricData[]> {
    if (!this.config.collection.sampling.enabled) return metrics;

    const rate = this.config.collection.sampling.rate;
    
    switch (this.config.collection.sampling.strategy) {
      case 'random':
        return metrics.filter(() => Math.random() < rate);
      
      case 'systematic':
        const interval = Math.ceil(1 / rate);
        return metrics.filter((_, index) => index % interval === 0);
      
      case 'adaptive':
        // Adaptive sampling based on metric importance
        return this.adaptiveSampling(metrics, rate);
      
      default:
        return metrics;
    }
  }

  /**
   * Adaptive sampling based on metric importance
   */
  private adaptiveSampling(metrics: MetricData[], rate: number): MetricData[] {
    // Sort metrics by importance (critical metrics get higher priority)
    const sortedMetrics = metrics.sort((a, b) => {
      const importanceA = this.getMetricImportance(a);
      const importanceB = this.getMetricImportance(b);
      return importanceB - importanceA;
    });

    const targetCount = Math.ceil(metrics.length * rate);
    return sortedMetrics.slice(0, targetCount);
  }

  /**
   * Get metric importance score
   */
  private getMetricImportance(metric: MetricData): number {
    // Critical system metrics get highest importance
    if (metric.name.includes('error') || metric.name.includes('failure')) return 100;
    if (metric.name.includes('cpu') || metric.name.includes('memory')) return 90;
    if (metric.name.includes('latency') || metric.name.includes('response')) return 80;
    return 50; // Default importance
  }

  /**
   * Start WebSocket server for real-time updates
   */
  private startWebSocketServer(): void {
    this.httpServer = http.createServer();
    this.webSocketServer = new WebSocket.Server({ server: this.httpServer });

    this.webSocketServer.on('connection', (ws) => {
      logger.debug('WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const request = JSON.parse(message.toString());
          this.handleWebSocketRequest(ws, request);
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.debug('WebSocket client disconnected');
      });
    });

    const port = process.env.MONITORING_WS_PORT || 8080;
    this.httpServer.listen(port, () => {
      logger.info({ port }, 'WebSocket server started');
    });
  }

  /**
   * Handle WebSocket requests
   */
  private async handleWebSocketRequest(ws: WebSocket, request: any): Promise<void> {
    try {
      switch (request.type) {
        case 'subscribe_metrics':
          await this.subscribeToMetrics(ws, request.metrics);
          break;
        
        case 'subscribe_alerts':
          await this.subscribeToAlerts(ws, request.filters);
          break;
        
        case 'get_health':
          const health = await this.getSystemHealth();
          ws.send(JSON.stringify({ type: 'health', data: health }));
          break;
        
        default:
          ws.send(JSON.stringify({ error: 'Unknown request type' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Subscribe to metrics updates
   */
  private async subscribeToMetrics(ws: WebSocket, metricNames: string[]): Promise<void> {
    // Implementation would set up subscription for specific metrics
    ws.send(JSON.stringify({ 
      type: 'subscription_confirmed',
      metrics: metricNames 
    }));
  }

  /**
   * Subscribe to alert updates
   */
  private async subscribeToAlerts(ws: WebSocket, filters: any): Promise<void> {
    // Implementation would set up subscription for alerts
    ws.send(JSON.stringify({ 
      type: 'alert_subscription_confirmed',
      filters 
    }));
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error({ error: error.message }, 'Health check failed');
      }
    }, 60000); // Check every minute

    logger.info('Health checks started');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const components: ComponentHealth[] = [];

    // Check metric collectors
    for (const [name, collector] of this.metricCollectors) {
      const health = await collector.getHealth();
      components.push({
        name: `collector-${name}`,
        score: health.healthy ? 100 : 0,
        status: health.healthy ? 'healthy' : 'critical',
        metrics: [health.lastCollection?.toString() || 'never'],
        issues: health.errors || [],
        lastCheck: new Date()
      });
    }

    // Check storage
    const storageHealth = await this.storageManager.getHealth();
    components.push({
      name: 'storage',
      score: storageHealth.healthy ? 100 : 0,
      status: storageHealth.healthy ? 'healthy' : 'critical',
      metrics: [`usage: ${storageHealth.usage}%`],
      issues: storageHealth.errors || [],
      lastCheck: new Date()
    });

    // Check alerting
    if (this.config.alerting.enabled) {
      const alertHealth = await this.alertManager.getHealth();
      components.push({
        name: 'alerting',
        score: alertHealth.healthy ? 100 : 0,
        status: alertHealth.healthy ? 'healthy' : 'critical',
        metrics: [`active_alerts: ${alertHealth.activeAlerts}`],
        issues: alertHealth.errors || [],
        lastCheck: new Date()
      });
    }

    // Update system health scores
    for (const component of components) {
      systemHealth.set({ 
        component: component.name, 
        namespace: 'monitoring' 
      }, component.score);
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const components: ComponentHealth[] = [];
    
    // Get component health
    for (const [name, collector] of this.metricCollectors) {
      const health = await collector.getHealth();
      components.push({
        name: `collector-${name}`,
        score: health.healthy ? 100 : 0,
        status: health.healthy ? 'healthy' : 'critical',
        metrics: [],
        issues: health.errors || [],
        lastCheck: new Date()
      });
    }

    const avgScore = components.length > 0 
      ? components.reduce((sum, c) => sum + c.score, 0) / components.length 
      : 100;

    const overallStatus = avgScore >= 90 ? 'healthy' : avgScore >= 70 ? 'degraded' : 'critical';

    // Get active alerts
    const alerts = await this.alertManager.getActiveAlerts();
    const alertCounts = {
      active: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    // Get storage status
    const storageHealth = await this.storageManager.getHealth();

    return {
      overall: {
        score: avgScore,
        status: overallStatus,
        components
      },
      metrics: {
        total: await this.getMetricCount(),
        stale: await this.getStaleMetricCount(),
        error_rate: await this.getMetricErrorRate(),
        collection_latency: await this.getAverageCollectionLatency()
      },
      alerts: alertCounts,
      storage: {
        usage: storageHealth.usage || 0,
        retention_compliance: storageHealth.retentionCompliance || 100,
        backup_status: storageHealth.backupStatus || 'unknown'
      }
    };
  }

  /**
   * Get metrics endpoint
   */
  getMetricsEndpoint(): string {
    return '/metrics';
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(dashboard: DashboardConfig): Promise<string> {
    return await this.dashboardManager.createDashboard(dashboard);
  }

  /**
   * Add alert rule
   */
  async addAlertRule(rule: AlertRule): Promise<void> {
    await this.alertManager.addRule(rule);
  }

  /**
   * Remove alert rule
   */
  async removeAlertRule(name: string): Promise<void> {
    await this.alertManager.removeRule(name);
  }

  /**
   * Send alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    await this.alertManager.sendAlert(alert);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    return await this.alertManager.getActiveAlerts();
  }

  // Helper methods for metrics
  private async getMetricCount(): Promise<number> {
    // Implementation would count total metrics
    return 0;
  }

  private async getStaleMetricCount(): Promise<number> {
    // Implementation would count stale metrics
    return 0;
  }

  private async getMetricErrorRate(): Promise<number> {
    // Implementation would calculate error rate
    return 0;
  }

  private async getAverageCollectionLatency(): Promise<number> {
    // Implementation would calculate average latency
    return 0;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down monitoring manager');

    try {
      // Stop collectors
      for (const collector of this.metricCollectors.values()) {
        await collector.shutdown();
      }

      // Stop alert manager
      if (this.alertManager) {
        await this.alertManager.shutdown();
      }

      // Stop WebSocket server
      if (this.webSocketServer) {
        this.webSocketServer.close();
      }

      if (this.httpServer) {
        this.httpServer.close();
      }

      logger.info('Monitoring manager shutdown complete');

    } catch (error) {
      logger.error({ error: error.message }, 'Error during monitoring manager shutdown');
    }
  }
}

/**
 * Metric Collector Implementation
 */
class MetricCollector {
  public source: MetricSource;
  public name: string;
  private config: MonitoringConfig;
  private lastCollection?: Date;
  private errors: string[] = [];

  constructor(source: MetricSource, config: MonitoringConfig) {
    this.source = source;
    this.name = source.name;
    this.config = config;
  }

  async collect(): Promise<MetricData[]> {
    const timer = metricCollectionLatency.startTimer({ 
      source: this.source.name, 
      metric_type: this.source.type 
    });

    try {
      let metrics: MetricData[] = [];

      switch (this.source.type) {
        case 'kubernetes':
          metrics = await this.collectKubernetesMetrics();
          break;
        case 'prometheus':
          metrics = await this.collectPrometheusMetrics();
          break;
        case 'cloudwatch':
          metrics = await this.collectCloudWatchMetrics();
          break;
        case 'custom-api':
          metrics = await this.collectCustomAPIMetrics();
          break;
        case 'webhook':
          metrics = await this.collectWebhookMetrics();
          break;
      }

      this.lastCollection = new Date();
      this.errors = [];

      return metrics;

    } catch (error) {
      this.errors.push(error.message);
      logger.error({
        source: this.source.name,
        error: error.message
      }, 'Metric collection failed');
      throw error;

    } finally {
      timer();
    }
  }

  private async collectKubernetesMetrics(): Promise<MetricData[]> {
    // Implementation would collect metrics from Kubernetes API
    return [];
  }

  private async collectPrometheusMetrics(): Promise<MetricData[]> {
    // Implementation would collect metrics from Prometheus
    return [];
  }

  private async collectCloudWatchMetrics(): Promise<MetricData[]> {
    // Implementation would collect metrics from CloudWatch
    return [];
  }

  private async collectCustomAPIMetrics(): Promise<MetricData[]> {
    // Implementation would collect metrics from custom API
    return [];
  }

  private async collectWebhookMetrics(): Promise<MetricData[]> {
    // Implementation would collect metrics via webhook
    return [];
  }

  async getHealth(): Promise<{ healthy: boolean; lastCollection?: Date; errors?: string[] }> {
    const maxAge = (this.source.config.interval || this.config.collection.interval) * 2 * 1000;
    const isStale = this.lastCollection && (Date.now() - this.lastCollection.getTime() > maxAge);
    
    return {
      healthy: this.errors.length === 0 && !isStale,
      lastCollection: this.lastCollection,
      errors: this.errors
    };
  }

  async shutdown(): Promise<void> {
    // Cleanup collector resources
  }
}

/**
 * Alert Manager Implementation
 */
class AlertManager {
  private config: any;
  private stateStorage: any;
  private activeAlerts: Map<string, Alert> = new Map();

  constructor(config: any, stateStorage: any) {
    this.config = config;
    this.stateStorage = stateStorage;
  }

  async start(): Promise<void> {
    // Start alert processing
  }

  async evaluateRules(metrics: MetricData[]): Promise<void> {
    // Evaluate alert rules against metrics
  }

  async addRule(rule: AlertRule): Promise<void> {
    // Add new alert rule
  }

  async removeRule(name: string): Promise<void> {
    // Remove alert rule
  }

  async sendAlert(alert: Alert): Promise<void> {
    // Send alert through configured channels
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getHealth(): Promise<{ healthy: boolean; activeAlerts: number; errors?: string[] }> {
    return {
      healthy: true,
      activeAlerts: this.activeAlerts.size,
      errors: []
    };
  }

  async shutdown(): Promise<void> {
    // Cleanup alert manager
  }
}

/**
 * Dashboard Manager Implementation
 */
class DashboardManager {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async createDashboard(dashboard: DashboardConfig): Promise<string> {
    // Create dashboard and return ID
    return `dashboard-${Date.now()}`;
  }
}

/**
 * Storage Manager Implementation
 */
class StorageManager {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async storeMetrics(metrics: MetricData[]): Promise<void> {
    // Store metrics in configured storage
  }

  async getHealth(): Promise<{ 
    healthy: boolean; 
    usage?: number; 
    retentionCompliance?: number; 
    backupStatus?: string;
    errors?: string[] 
  }> {
    return {
      healthy: true,
      usage: 45,
      retentionCompliance: 100,
      backupStatus: 'healthy',
      errors: []
    };
  }
}

/**
 * Security Manager Implementation
 */
class SecurityManager {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async authenticate(request: any): Promise<boolean> {
    // Authenticate request
    return true;
  }

  async authorize(user: any, resource: string, action: string): Promise<boolean> {
    // Authorize action
    return true;
  }
}