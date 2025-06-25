import { logger } from '@/lib/logger';

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  url?: string;
}

export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private services: Map<string, ServiceHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  private readonly serviceConfigs = [
    {
      name: 'Loki',
      url: process.env.LOKI_URL || 'http://localhost:3100',
      healthEndpoint: '/ready',
    },
    {
      name: 'Jaeger',
      url: process.env.JAEGER_URL || 'http://localhost:16686',
      healthEndpoint: '/api/services',
    },
    {
      name: 'Prometheus',
      url: process.env.PROMETHEUS_URL || 'http://localhost:9090',
      healthEndpoint: '/-/healthy',
    },
    {
      name: 'AnalyticsPlatform',
      url: process.env.ANALYTICS_PLATFORM_URL || 'http://localhost:3003',
      healthEndpoint: '/api/health',
    },
  ];

  private constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  private initializeServices(): void {
    for (const config of this.serviceConfigs) {
      this.services.set(config.name, {
        name: config.name,
        status: 'unknown',
        lastChecked: new Date(),
        url: config.url,
      });
    }
  }

  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const config = this.serviceConfigs.find(c => c.name === serviceName);
    if (!config) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const startTime = Date.now();
    const health: ServiceHealth = {
      name: serviceName,
      status: 'down',
      lastChecked: new Date(),
      url: config.url,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${config.url}${config.healthEndpoint}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      health.responseTime = Date.now() - startTime;

      if (response.ok) {
        health.status = 'up';
      } else {
        health.status = 'down';
        health.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      health.status = 'down';
      health.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't log connection errors for optional services in development
      if (process.env.NODE_ENV !== 'development' || !health.error.includes('ECONNREFUSED')) {
        logger.error(`Health check failed for ${serviceName}:`, error);
      }
    }

    this.services.set(serviceName, health);
    return health;
  }

  async checkAllServices(): Promise<Map<string, ServiceHealth>> {
    const checks = this.serviceConfigs.map(config => 
      this.checkServiceHealth(config.name)
    );

    await Promise.allSettled(checks);
    return new Map(this.services);
  }

  getServiceStatus(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }

  getAllStatuses(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  private startHealthChecks(): void {
    // Initial check
    this.checkAllServices().catch(error => {
      logger.error('Initial health check failed:', error);
    });

    // Schedule periodic checks (every 30 seconds)
    this.checkInterval = setInterval(() => {
      this.checkAllServices().catch(error => {
        logger.error('Periodic health check failed:', error);
      });
    }, 30000);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Get formatted status for display
  getFormattedStatus(serviceName: string): string {
    const health = this.services.get(serviceName);
    if (!health) return '❓ Unknown';

    switch (health.status) {
      case 'up':
        return `✅ ${serviceName}\n${new Date(health.lastChecked).toLocaleTimeString()}\nUp`;
      case 'down':
        return `❌ ${serviceName}\n${new Date(health.lastChecked).toLocaleTimeString()}\nDown`;
      case 'unknown':
        return `❓ ${serviceName}\n${new Date(health.lastChecked).toLocaleTimeString()}\nUnknown`;
      default:
        return `❓ ${serviceName}`;
    }
  }

  // Get all statuses formatted for display
  getAllFormattedStatuses(): string[] {
    return this.serviceConfigs.map(config => 
      this.getFormattedStatus(config.name)
    );
  }
}

// Export singleton instance
export const serviceHealthMonitor = ServiceHealthMonitor.getInstance();