/**
 * Production Metric Collector - Real metric collection from Kubernetes and Prometheus
 */

import { KubeConfig, CoreV1Api, MetricsV1beta1Api } from '@kubernetes/client-node';
import { PrometheusDriver } from 'prometheus-query';
import { logger } from '@/lib/logger';
import { Counter, Histogram, Gauge } from 'prom-client';
import axios from 'axios';

// Collection metrics
const metricsCollected = new Counter({
  name: 'metrics_collected_total',
  help: 'Total metrics collected',
  labelNames: ['source', 'type', 'namespace']
});

const collectionDuration = new Histogram({
  name: 'metric_collection_duration_seconds',
  help: 'Metric collection duration',
  labelNames: ['source', 'type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const collectionErrors = new Counter({
  name: 'metric_collection_errors_total',
  help: 'Total metric collection errors',
  labelNames: ['source', 'type', 'error']
});

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  type: 'gauge' | 'counter' | 'histogram';
  unit?: string;
  description?: string;
}

export interface CollectionConfig {
  kubernetes: {
    enabled: boolean;
    namespaces: string[];
    metrics: string[];
    interval: number;
  };
  prometheus: {
    enabled: boolean;
    url: string;
    queries: PrometheusQuery[];
    timeout: number;
  };
  custom: {
    enabled: boolean;
    endpoints: CustomEndpoint[];
  };
}

interface PrometheusQuery {
  name: string;
  query: string;
  type: 'instant' | 'range';
  step?: string;
  labels?: Record<string, string>;
}

interface CustomEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  transform?: string; // JSONPath expression
}

export class MetricCollector {
  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private metricsApi: MetricsV1beta1Api;
  private prometheusClient?: PrometheusDriver;
  private config: CollectionConfig;
  private cache: Map<string, MetricData[]> = new Map();
  private cacheTTL = 60000; // 1 minute

  constructor(config: CollectionConfig, kubeconfigPath?: string) {
    this.config = config;
    this.initializeClients(kubeconfigPath);
  }

  /**
   * Initialize Kubernetes and Prometheus clients
   */
  private initializeClients(kubeconfigPath?: string): void {
    try {
      // Initialize Kubernetes clients
      this.kubeConfig = new KubeConfig();
      
      if (kubeconfigPath) {
        this.kubeConfig.loadFromFile(kubeconfigPath);
      } else {
        try {
          this.kubeConfig.loadFromCluster();
        } catch {
          this.kubeConfig.loadFromDefault();
        }
      }

      this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
      this.metricsApi = this.kubeConfig.makeApiClient(MetricsV1beta1Api);

      // Initialize Prometheus client if configured
      if (this.config.prometheus.enabled && this.config.prometheus.url) {
        this.prometheusClient = new PrometheusDriver({
          endpoint: this.config.prometheus.url,
          baseURL: '/api/v1'
        });
      }

    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize metric collector clients');
    }
  }

  /**
   * Collect all metrics
   */
  async collectAll(): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    // Collect from all sources in parallel
    const promises: Promise<MetricData[]>[] = [];

    if (this.config.kubernetes.enabled) {
      promises.push(this.collectKubernetesMetrics());
    }

    if (this.config.prometheus.enabled && this.prometheusClient) {
      promises.push(this.collectPrometheusMetrics());
    }

    if (this.config.custom.enabled) {
      promises.push(this.collectCustomMetrics());
    }

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        metrics.push(...result.value);
      } else {
        logger.error({ 
          reason: result.reason 
        }, 'Metric collection failed');
      }
    }

    return metrics;
  }

  /**
   * Collect Kubernetes metrics
   */
  async collectKubernetesMetrics(): Promise<MetricData[]> {
    const timer = collectionDuration.startTimer({ 
      source: 'kubernetes', 
      type: 'resources' 
    });

    try {
      const metrics: MetricData[] = [];

      // Collect node metrics
      const nodeMetrics = await this.collectNodeMetrics();
      metrics.push(...nodeMetrics);

      // Collect pod metrics for each namespace
      for (const namespace of this.config.kubernetes.namespaces) {
        const podMetrics = await this.collectPodMetrics(namespace);
        metrics.push(...podMetrics);

        const resourceMetrics = await this.collectResourceMetrics(namespace);
        metrics.push(...resourceMetrics);
      }

      // Collect cluster-wide metrics
      const clusterMetrics = await this.collectClusterMetrics();
      metrics.push(...clusterMetrics);

      metricsCollected.inc({ 
        source: 'kubernetes', 
        type: 'resources',
        namespace: 'all'
      }, metrics.length);

      logger.debug({
        count: metrics.length,
        source: 'kubernetes'
      }, 'Collected Kubernetes metrics');

      return metrics;

    } catch (error) {
      collectionErrors.inc({ 
        source: 'kubernetes', 
        type: 'resources',
        error: error.message 
      });
      
      logger.error({ 
        error: error.message 
      }, 'Failed to collect Kubernetes metrics');
      
      return [];
      
    } finally {
      timer();
    }
  }

  /**
   * Collect node metrics
   */
  private async collectNodeMetrics(): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    try {
      // Get node metrics from metrics API
      const nodeMetrics = await this.metricsApi.listNodeMetrics();
      
      for (const node of nodeMetrics.body.items) {
        const nodeName = node.metadata?.name || 'unknown';
        const timestamp = new Date(node.timestamp || Date.now());

        // CPU usage
        if (node.usage?.cpu) {
          const cpuNanos = this.parseCpuValue(node.usage.cpu);
          metrics.push({
            name: 'node_cpu_usage_cores',
            value: cpuNanos / 1e9, // Convert to cores
            timestamp,
            labels: { 
              node: nodeName,
              type: 'usage'
            },
            type: 'gauge',
            unit: 'cores',
            description: 'Current CPU usage in cores'
          });
        }

        // Memory usage
        if (node.usage?.memory) {
          const memoryBytes = this.parseMemoryValue(node.usage.memory);
          metrics.push({
            name: 'node_memory_usage_bytes',
            value: memoryBytes,
            timestamp,
            labels: { 
              node: nodeName,
              type: 'usage' 
            },
            type: 'gauge',
            unit: 'bytes',
            description: 'Current memory usage in bytes'
          });
        }
      }

      // Get node conditions
      const nodes = await this.coreApi.listNode();
      for (const node of nodes.body.items) {
        const nodeName = node.metadata?.name || 'unknown';
        const conditions = node.status?.conditions || [];

        // Node ready status
        const readyCondition = conditions.find(c => c.type === 'Ready');
        metrics.push({
          name: 'node_ready',
          value: readyCondition?.status === 'True' ? 1 : 0,
          timestamp: new Date(),
          labels: { 
            node: nodeName,
            reason: readyCondition?.reason || 'unknown'
          },
          type: 'gauge',
          description: 'Node ready status (1 = ready, 0 = not ready)'
        });

        // Node pressure conditions
        const pressureConditions = ['MemoryPressure', 'DiskPressure', 'PIDPressure'];
        for (const conditionType of pressureConditions) {
          const condition = conditions.find(c => c.type === conditionType);
          metrics.push({
            name: `node_${conditionType.toLowerCase()}`,
            value: condition?.status === 'True' ? 1 : 0,
            timestamp: new Date(),
            labels: { node: nodeName },
            type: 'gauge',
            description: `Node ${conditionType} status`
          });
        }

        // Node capacity and allocatable
        if (node.status?.capacity) {
          const cpuCapacity = this.parseCpuValue(node.status.capacity.cpu || '0');
          const memoryCapacity = this.parseMemoryValue(node.status.capacity.memory || '0');
          
          metrics.push({
            name: 'node_cpu_capacity_cores',
            value: cpuCapacity / 1e9,
            timestamp: new Date(),
            labels: { node: nodeName },
            type: 'gauge',
            unit: 'cores'
          });

          metrics.push({
            name: 'node_memory_capacity_bytes',
            value: memoryCapacity,
            timestamp: new Date(),
            labels: { node: nodeName },
            type: 'gauge',
            unit: 'bytes'
          });
        }
      }

    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to collect node metrics');
    }

    return metrics;
  }

  /**
   * Collect pod metrics for namespace
   */
  private async collectPodMetrics(namespace: string): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    try {
      // Get pod metrics from metrics API
      const podMetrics = await this.metricsApi.listNamespacedPodMetrics(namespace);
      
      for (const pod of podMetrics.body.items) {
        const podName = pod.metadata?.name || 'unknown';
        const timestamp = new Date(pod.timestamp || Date.now());

        // Container metrics
        for (const container of pod.containers || []) {
          const containerName = container.name;

          // CPU usage
          if (container.usage?.cpu) {
            const cpuNanos = this.parseCpuValue(container.usage.cpu);
            metrics.push({
              name: 'container_cpu_usage_cores',
              value: cpuNanos / 1e9,
              timestamp,
              labels: { 
                namespace,
                pod: podName,
                container: containerName
              },
              type: 'gauge',
              unit: 'cores'
            });
          }

          // Memory usage
          if (container.usage?.memory) {
            const memoryBytes = this.parseMemoryValue(container.usage.memory);
            metrics.push({
              name: 'container_memory_usage_bytes',
              value: memoryBytes,
              timestamp,
              labels: { 
                namespace,
                pod: podName,
                container: containerName
              },
              type: 'gauge',
              unit: 'bytes'
            });
          }
        }
      }

      // Get pod status information
      const pods = await this.coreApi.listNamespacedPod(namespace);
      
      // Pod phase metrics
      const phaseCounts: Record<string, number> = {};
      for (const pod of pods.body.items) {
        const phase = pod.status?.phase || 'Unknown';
        phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
      }

      for (const [phase, count] of Object.entries(phaseCounts)) {
        metrics.push({
          name: 'pods_phase_count',
          value: count,
          timestamp: new Date(),
          labels: { 
            namespace,
            phase 
          },
          type: 'gauge',
          description: `Number of pods in ${phase} phase`
        });
      }

      // Container restart counts
      for (const pod of pods.body.items) {
        const podName = pod.metadata?.name || 'unknown';
        
        for (const containerStatus of pod.status?.containerStatuses || []) {
          metrics.push({
            name: 'container_restart_count',
            value: containerStatus.restartCount || 0,
            timestamp: new Date(),
            labels: { 
              namespace,
              pod: podName,
              container: containerStatus.name
            },
            type: 'counter',
            description: 'Container restart count'
          });
        }
      }

    } catch (error) {
      logger.warn({ 
        namespace,
        error: error.message 
      }, 'Failed to collect pod metrics');
    }

    return metrics;
  }

  /**
   * Collect resource metrics (deployments, services, etc)
   */
  private async collectResourceMetrics(namespace: string): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    try {
      // Deployment metrics
      const k8sAppsApi = this.kubeConfig.makeApiClient(AppsV1Api);
      const deployments = await k8sAppsApi.listNamespacedDeployment(namespace);
      
      for (const deployment of deployments.body.items) {
        const name = deployment.metadata?.name || 'unknown';
        const spec = deployment.spec || {};
        const status = deployment.status || {};

        metrics.push({
          name: 'deployment_replicas_desired',
          value: spec.replicas || 0,
          timestamp: new Date(),
          labels: { namespace, deployment: name },
          type: 'gauge'
        });

        metrics.push({
          name: 'deployment_replicas_ready',
          value: status.readyReplicas || 0,
          timestamp: new Date(),
          labels: { namespace, deployment: name },
          type: 'gauge'
        });

        metrics.push({
          name: 'deployment_replicas_available',
          value: status.availableReplicas || 0,
          timestamp: new Date(),
          labels: { namespace, deployment: name },
          type: 'gauge'
        });
      }

      // Service metrics
      const services = await this.coreApi.listNamespacedService(namespace);
      metrics.push({
        name: 'services_count',
        value: services.body.items.length,
        timestamp: new Date(),
        labels: { namespace },
        type: 'gauge'
      });

      // PVC metrics
      const pvcs = await this.coreApi.listNamespacedPersistentVolumeClaim(namespace);
      
      for (const pvc of pvcs.body.items) {
        const name = pvc.metadata?.name || 'unknown';
        const phase = pvc.status?.phase || 'Unknown';
        
        metrics.push({
          name: 'pvc_status',
          value: phase === 'Bound' ? 1 : 0,
          timestamp: new Date(),
          labels: { 
            namespace, 
            pvc: name,
            phase 
          },
          type: 'gauge'
        });

        // PVC capacity
        if (pvc.status?.capacity?.storage) {
          const bytes = this.parseMemoryValue(pvc.status.capacity.storage);
          metrics.push({
            name: 'pvc_capacity_bytes',
            value: bytes,
            timestamp: new Date(),
            labels: { namespace, pvc: name },
            type: 'gauge',
            unit: 'bytes'
          });
        }
      }

    } catch (error) {
      logger.warn({ 
        namespace,
        error: error.message 
      }, 'Failed to collect resource metrics');
    }

    return metrics;
  }

  /**
   * Collect cluster-wide metrics
   */
  private async collectClusterMetrics(): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    try {
      // Namespace count
      const namespaces = await this.coreApi.listNamespace();
      metrics.push({
        name: 'cluster_namespace_count',
        value: namespaces.body.items.length,
        timestamp: new Date(),
        labels: {},
        type: 'gauge'
      });

      // Total pod count
      const allPods = await this.coreApi.listPodForAllNamespaces();
      metrics.push({
        name: 'cluster_pod_count',
        value: allPods.body.items.length,
        timestamp: new Date(),
        labels: {},
        type: 'gauge'
      });

      // Node count and status
      const nodes = await this.coreApi.listNode();
      const readyNodes = nodes.body.items.filter(node => {
        const ready = node.status?.conditions?.find(c => c.type === 'Ready');
        return ready?.status === 'True';
      });

      metrics.push({
        name: 'cluster_node_count',
        value: nodes.body.items.length,
        timestamp: new Date(),
        labels: { status: 'total' },
        type: 'gauge'
      });

      metrics.push({
        name: 'cluster_node_ready_count',
        value: readyNodes.length,
        timestamp: new Date(),
        labels: { status: 'ready' },
        type: 'gauge'
      });

      // API server health
      try {
        const healthz = await this.coreApi.getAPIVersions();
        metrics.push({
          name: 'cluster_api_server_up',
          value: 1,
          timestamp: new Date(),
          labels: {},
          type: 'gauge'
        });
      } catch {
        metrics.push({
          name: 'cluster_api_server_up',
          value: 0,
          timestamp: new Date(),
          labels: {},
          type: 'gauge'
        });
      }

    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to collect cluster metrics');
    }

    return metrics;
  }

  /**
   * Collect Prometheus metrics
   */
  async collectPrometheusMetrics(): Promise<MetricData[]> {
    if (!this.prometheusClient) {
      return [];
    }

    const timer = collectionDuration.startTimer({ 
      source: 'prometheus', 
      type: 'queries' 
    });

    try {
      const metrics: MetricData[] = [];

      for (const query of this.config.prometheus.queries) {
        try {
          const result = await this.executePrometheusQuery(query);
          metrics.push(...result);
        } catch (error) {
          logger.warn({
            query: query.name,
            error: error.message
          }, 'Failed to execute Prometheus query');
        }
      }

      metricsCollected.inc({ 
        source: 'prometheus', 
        type: 'queries',
        namespace: 'all'
      }, metrics.length);

      return metrics;

    } catch (error) {
      collectionErrors.inc({ 
        source: 'prometheus', 
        type: 'queries',
        error: error.message 
      });
      
      logger.error({ 
        error: error.message 
      }, 'Failed to collect Prometheus metrics');
      
      return [];
      
    } finally {
      timer();
    }
  }

  /**
   * Execute single Prometheus query
   */
  private async executePrometheusQuery(query: PrometheusQuery): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    if (query.type === 'instant') {
      const result = await this.prometheusClient!.instantQuery(query.query);
      
      if (result.result) {
        for (const series of result.result) {
          const value = parseFloat(series.value?.value || '0');
          const timestamp = new Date((series.value?.time || Date.now() / 1000) * 1000);
          
          metrics.push({
            name: query.name,
            value,
            timestamp,
            labels: { 
              ...series.metric,
              ...query.labels 
            },
            type: 'gauge'
          });
        }
      }
      
    } else if (query.type === 'range') {
      const end = new Date();
      const start = new Date(end.getTime() - 3600000); // 1 hour ago
      
      const result = await this.prometheusClient!.rangeQuery(
        query.query,
        start,
        end,
        query.step || '60s'
      );
      
      if (result.result) {
        for (const series of result.result) {
          for (const [timestamp, valueStr] of series.values || []) {
            const value = parseFloat(valueStr);
            
            metrics.push({
              name: query.name,
              value,
              timestamp: new Date(timestamp * 1000),
              labels: { 
                ...series.metric,
                ...query.labels 
              },
              type: 'gauge'
            });
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Collect custom metrics from endpoints
   */
  async collectCustomMetrics(): Promise<MetricData[]> {
    const timer = collectionDuration.startTimer({ 
      source: 'custom', 
      type: 'endpoints' 
    });

    try {
      const metrics: MetricData[] = [];

      for (const endpoint of this.config.custom.endpoints) {
        try {
          const endpointMetrics = await this.collectFromEndpoint(endpoint);
          metrics.push(...endpointMetrics);
        } catch (error) {
          logger.warn({
            endpoint: endpoint.name,
            error: error.message
          }, 'Failed to collect from custom endpoint');
        }
      }

      metricsCollected.inc({ 
        source: 'custom', 
        type: 'endpoints',
        namespace: 'all'
      }, metrics.length);

      return metrics;

    } catch (error) {
      collectionErrors.inc({ 
        source: 'custom', 
        type: 'endpoints',
        error: error.message 
      });
      
      return [];
      
    } finally {
      timer();
    }
  }

  /**
   * Collect from custom endpoint
   */
  private async collectFromEndpoint(endpoint: CustomEndpoint): Promise<MetricData[]> {
    const response = await axios({
      method: endpoint.method,
      url: endpoint.url,
      headers: endpoint.headers,
      timeout: 30000
    });

    const metrics: MetricData[] = [];

    // Parse response based on transform
    if (endpoint.transform) {
      // Use JSONPath to extract metrics
      // This is simplified - in production you'd use a proper JSONPath library
      const data = response.data;
      
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item.value === 'number') {
            metrics.push({
              name: item.name || endpoint.name,
              value: item.value,
              timestamp: new Date(item.timestamp || Date.now()),
              labels: item.labels || {},
              type: 'gauge'
            });
          }
        }
      }
    } else {
      // Assume response is already in metric format
      if (response.data && typeof response.data.value === 'number') {
        metrics.push({
          name: endpoint.name,
          value: response.data.value,
          timestamp: new Date(),
          labels: response.data.labels || {},
          type: 'gauge'
        });
      }
    }

    return metrics;
  }

  /**
   * Parse CPU value (handles different formats)
   */
  private parseCpuValue(cpu: string): number {
    // Handle different CPU formats: "100m", "0.1", "1000000n"
    if (cpu.endsWith('m')) {
      return parseFloat(cpu.slice(0, -1)) * 1e6; // millicores to nanocores
    } else if (cpu.endsWith('n')) {
      return parseFloat(cpu.slice(0, -1)); // already nanocores
    } else {
      return parseFloat(cpu) * 1e9; // cores to nanocores
    }
  }

  /**
   * Parse memory value (handles different formats)
   */
  private parseMemoryValue(memory: string): number {
    // Handle different memory formats: "1Gi", "1024Mi", "1073741824"
    const units: Record<string, number> = {
      'Ki': 1024,
      'Mi': 1024 * 1024,
      'Gi': 1024 * 1024 * 1024,
      'Ti': 1024 * 1024 * 1024 * 1024,
      'K': 1000,
      'M': 1000 * 1000,
      'G': 1000 * 1000 * 1000,
      'T': 1000 * 1000 * 1000 * 1000
    };

    for (const [unit, multiplier] of Object.entries(units)) {
      if (memory.endsWith(unit)) {
        return parseFloat(memory.slice(0, -unit.length)) * multiplier;
      }
    }

    return parseFloat(memory); // Assume bytes if no unit
  }

  /**
   * Get cached metrics
   */
  getCachedMetrics(key: string): MetricData[] | null {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached[0]?.timestamp.getTime();
      if (age < this.cacheTTL) {
        return cached;
      }
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cached metrics
   */
  setCachedMetrics(key: string, metrics: MetricData[]): void {
    this.cache.set(key, metrics);
    
    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }
}

// Add missing import
import { AppsV1Api } from '@kubernetes/client-node';