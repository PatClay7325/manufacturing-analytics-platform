/**
 * Production Orchestrator - Master Controller
 * Coordinates all production-ready components for 10/10 manufacturing analyticsPlatform
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { healthCheckManager } from '../health/HealthCheckManager';
import { autoRecoveryManager } from '../recovery/AutoRecoveryManager';
import { productionConfigManager } from '../config/ProductionConfigManager';
import { apmIntegration } from '../performance/APMIntegration';
import { manufacturingDataPipeline } from '../data/ManufacturingDataPipeline';
import { WorkflowEngineFixed } from '../orchestration/WorkflowEngineFixed';
import { resourceManager } from '../orchestration/ResourceManager';
import { Gauge, Counter, register } from 'prom-client';

export interface ProductionStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'starting' | 'stopping';
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    details?: any;
  }>;
  uptime: number;
  version: string;
  environment: string;
  timestamp: Date;
}

export interface StartupOptions {
  skipHealthChecks?: boolean;
  skipConfigValidation?: boolean;
  skipDataPipeline?: boolean;
  skipWorkflowEngine?: boolean;
  skipAPM?: boolean;
  configPath?: string;
}

// Production orchestrator metrics
const systemStatus = new Gauge({
  name: 'system_status',
  help: 'Overall system status (1=healthy, 0.5=degraded, 0=unhealthy)',
});

const componentStatus = new Gauge({
  name: 'component_status',
  help: 'Individual component status',
  labelNames: ['component'],
});

const startupDuration = new Gauge({
  name: 'system_startup_duration_seconds',
  help: 'Time taken for system startup',
});

const shutdownCounter = new Counter({
  name: 'system_shutdowns_total',
  help: 'Total number of system shutdowns',
  labelNames: ['reason'],
});

register.registerMetric(systemStatus);
register.registerMetric(componentStatus);
register.registerMetric(startupDuration);
register.registerMetric(shutdownCounter);

export class ProductionOrchestrator extends EventEmitter {
  private static instance: ProductionOrchestrator;
  private components = new Map<string, {
    instance: any;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    required: boolean;
  }>();
  private isStarted = false;
  private isShuttingDown = false;
  private startTime = Date.now();
  private shutdownPromise?: Promise<void>;

  constructor() {
    super();
    this.setupShutdownHandlers();
  }

  static getInstance(): ProductionOrchestrator {
    if (!ProductionOrchestrator.instance) {
      ProductionOrchestrator.instance = new ProductionOrchestrator();
    }
    return ProductionOrchestrator.instance;
  }

  /**
   * Start the complete production system
   */
  async start(options: StartupOptions = {}): Promise<void> {
    if (this.isStarted) {
      logger.warn('Production orchestrator already started');
      return;
    }

    const startupTimer = Date.now();
    
    try {
      logger.info({
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version,
        options,
      }, 'Starting production orchestrator');

      this.emit('startup:started');

      // Phase 1: Configuration Management
      if (!options.skipConfigValidation) {
        await this.startComponent('config', productionConfigManager, {
          initialize: async () => {
            await productionConfigManager.initialize(options.configPath);
          },
          required: true,
        });
      }

      // Phase 2: Infrastructure Services
      await this.startComponent('resource-manager', resourceManager, {
        initialize: async () => {
          // Resource manager is already initialized in constructor
        },
        required: true,
      });

      // Phase 3: Monitoring and Observability
      if (!options.skipAPM) {
        await this.startComponent('apm', apmIntegration, {
          initialize: async () => {
            apmIntegration.startMonitoring();
          },
          required: false,
        });
      }

      if (!options.skipHealthChecks) {
        await this.startComponent('health-checks', healthCheckManager, {
          initialize: async () => {
            healthCheckManager.start();
          },
          required: true,
        });

        await this.startComponent('auto-recovery', autoRecoveryManager, {
          initialize: async () => {
            autoRecoveryManager.start();
          },
          required: false,
        });
      }

      // Phase 4: Data Pipeline
      if (!options.skipDataPipeline) {
        await this.startComponent('data-pipeline', manufacturingDataPipeline, {
          initialize: async () => {
            // Data pipeline is initialized in constructor
            manufacturingDataPipeline.emit('started');
          },
          required: true,
        });
      }

      // Phase 5: Workflow Engine
      if (!options.skipWorkflowEngine) {
        await this.startComponent('workflow-engine', WorkflowEngineFixed.getInstance(), {
          initialize: async () => {
            await WorkflowEngineFixed.getInstance().start();
          },
          required: true,
        });
      }

      // Phase 6: Final System Validation
      await this.validateSystemReadiness();

      this.isStarted = true;
      const startupTime = (Date.now() - startupTimer) / 1000;
      startupDuration.set(startupTime);

      logger.info({
        startupTime,
        components: Array.from(this.components.keys()),
      }, 'Production orchestrator started successfully');

      this.emit('startup:completed', {
        startupTime,
        components: this.getComponentStatus(),
      });

      // Start periodic status monitoring
      this.startStatusMonitoring();

    } catch (error) {
      logger.error({ error }, 'Production orchestrator startup failed');
      
      // Attempt graceful cleanup on startup failure
      await this.stop('startup_failure');
      
      throw error;
    }
  }

  /**
   * Stop the complete production system
   */
  async stop(reason: string = 'manual'): Promise<void> {
    if (this.isShuttingDown) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    shutdownCounter.inc({ reason });

    this.shutdownPromise = this.performShutdown(reason);
    return this.shutdownPromise;
  }

  /**
   * Get current production status
   */
  async getStatus(): Promise<ProductionStatus> {
    const components: Record<string, any> = {};
    let overallHealthy = 0;
    let totalComponents = 0;

    for (const [name, component] of this.components) {
      components[name] = {
        status: component.status,
        lastCheck: component.lastCheck,
        required: component.required,
      };

      totalComponents++;
      if (component.status === 'healthy') {
        overallHealthy++;
      } else if (component.status === 'degraded') {
        overallHealthy += 0.5;
      }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!this.isStarted) {
      status = 'starting';
    } else if (this.isShuttingDown) {
      status = 'stopping';
    } else {
      const healthRatio = totalComponents > 0 ? overallHealthy / totalComponents : 0;
      if (healthRatio >= 0.9) {
        status = 'healthy';
      } else if (healthRatio >= 0.6) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
    }

    // Update metrics
    const statusValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
    systemStatus.set(statusValue);

    return {
      status: status as any,
      components,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
    };
  }

  /**
   * Get detailed system diagnostics
   */
  async getDiagnostics(): Promise<Record<string, any>> {
    const diagnostics: Record<string, any> = {};

    // System metrics
    diagnostics.system = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    };

    // Component diagnostics
    diagnostics.components = {};
    for (const [name, component] of this.components) {
      try {
        if (typeof component.instance.getDiagnostics === 'function') {
          diagnostics.components[name] = await component.instance.getDiagnostics();
        } else {
          diagnostics.components[name] = {
            status: component.status,
            lastCheck: component.lastCheck,
          };
        }
      } catch (error) {
        diagnostics.components[name] = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Health check results
    if (this.components.has('health-checks')) {
      try {
        diagnostics.health = await healthCheckManager.getHealth();
      } catch (error) {
        diagnostics.health = { error: 'Health check failed' };
      }
    }

    // Performance metrics
    if (this.components.has('apm')) {
      try {
        diagnostics.performance = {
          metrics: apmIntegration.getCurrentMetrics(),
          memoryLeak: apmIntegration.detectMemoryLeaks(),
          activeTraces: apmIntegration.getActiveTraces().length,
        };
      } catch (error) {
        diagnostics.performance = { error: 'APM data unavailable' };
      }
    }

    return diagnostics;
  }

  /**
   * Force restart of a specific component
   */
  async restartComponent(componentName: string): Promise<boolean> {
    const component = this.components.get(componentName);
    if (!component) {
      logger.warn({ componentName }, 'Component not found for restart');
      return false;
    }

    try {
      logger.info({ componentName }, 'Restarting component');

      // Stop component
      if (typeof component.instance.stop === 'function') {
        await component.instance.stop();
      }

      // Start component
      if (typeof component.instance.start === 'function') {
        await component.instance.start();
      }

      component.status = 'healthy';
      component.lastCheck = new Date();
      componentStatus.set({ component: componentName }, 1);

      logger.info({ componentName }, 'Component restarted successfully');
      this.emit('component:restarted', { componentName });

      return true;
    } catch (error) {
      logger.error({ error, componentName }, 'Component restart failed');
      component.status = 'unhealthy';
      componentStatus.set({ component: componentName }, 0);
      return false;
    }
  }

  /**
   * Check if system is ready for production traffic
   */
  async isReady(): Promise<boolean> {
    if (!this.isStarted || this.isShuttingDown) {
      return false;
    }

    // Check all required components are healthy
    for (const [name, component] of this.components) {
      if (component.required && component.status !== 'healthy') {
        logger.warn({ componentName: name, status: component.status }, 'Required component not healthy');
        return false;
      }
    }

    return true;
  }

  /**
   * Check if system is alive (basic liveness check)
   */
  isAlive(): boolean {
    return this.isStarted && !this.isShuttingDown;
  }

  /**
   * Start a component with error handling
   */
  private async startComponent(
    name: string,
    instance: any,
    config: {
      initialize?: () => Promise<void>;
      required?: boolean;
    }
  ): Promise<void> {
    try {
      logger.info({ component: name }, 'Starting component');

      if (config.initialize) {
        await config.initialize();
      }

      this.components.set(name, {
        instance,
        status: 'healthy',
        lastCheck: new Date(),
        required: config.required || false,
      });

      componentStatus.set({ component: name }, 1);
      
      logger.info({ component: name }, 'Component started successfully');
      this.emit('component:started', { name, instance });
      
    } catch (error) {
      const isRequired = config.required || false;
      
      logger.error({ 
        error, 
        component: name, 
        required: isRequired 
      }, 'Component startup failed');

      this.components.set(name, {
        instance,
        status: 'unhealthy',
        lastCheck: new Date(),
        required: isRequired,
      });

      componentStatus.set({ component: name }, 0);
      this.emit('component:failed', { name, error });

      if (isRequired) {
        throw new Error(`Required component '${name}' failed to start: ${error.message}`);
      }
    }
  }

  /**
   * Validate system is ready for production
   */
  private async validateSystemReadiness(): Promise<void> {
    logger.info('Validating system readiness');

    // Check all required components are healthy
    const requiredComponents = Array.from(this.components.entries())
      .filter(([, component]) => component.required);

    for (const [name, component] of requiredComponents) {
      if (component.status !== 'healthy') {
        throw new Error(`Required component '${name}' is not healthy`);
      }
    }

    // Perform end-to-end health check
    if (this.components.has('health-checks')) {
      const systemHealth = await healthCheckManager.getHealth();
      if (systemHealth.status === 'unhealthy') {
        throw new Error('System health check failed');
      }
    }

    logger.info('System readiness validation passed');
  }

  /**
   * Start periodic status monitoring
   */
  private startStatusMonitoring(): void {
    setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const status = await this.getStatus();
        
        // Emit status event for monitoring
        this.emit('status:update', status);
        
        // Log if status is not healthy
        if (status.status !== 'healthy') {
          logger.warn({ status: status.status, components: status.components }, 'System status degraded');
        }
      } catch (error) {
        logger.error({ error }, 'Status monitoring failed');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get component status map
   */
  private getComponentStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [name, component] of this.components) {
      status[name] = {
        status: component.status,
        lastCheck: component.lastCheck,
        required: component.required,
      };
    }
    return status;
  }

  /**
   * Perform graceful shutdown
   */
  private async performShutdown(reason: string): Promise<void> {
    logger.info({ reason }, 'Starting production orchestrator shutdown');
    this.emit('shutdown:started', { reason });

    const shutdownPromises: Promise<void>[] = [];

    // Stop components in reverse order
    const componentNames = Array.from(this.components.keys()).reverse();
    
    for (const name of componentNames) {
      const component = this.components.get(name)!;
      
      shutdownPromises.push(
        (async () => {
          try {
            logger.debug({ component: name }, 'Stopping component');
            
            if (typeof component.instance.stop === 'function') {
              await component.instance.stop();
            }
            
            component.status = 'unhealthy';
            componentStatus.set({ component: name }, 0);
            
            logger.debug({ component: name }, 'Component stopped');
          } catch (error) {
            logger.error({ error, component: name }, 'Component shutdown failed');
          }
        })()
      );
    }

    // Wait for all components to shutdown
    await Promise.allSettled(shutdownPromises);

    this.isStarted = false;
    this.isShuttingDown = false;
    
    systemStatus.set(0);
    
    logger.info({ reason }, 'Production orchestrator shutdown completed');
    this.emit('shutdown:completed', { reason });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      try {
        await this.stop(signal.toLowerCase());
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Shutdown failed');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', async (error) => {
      logger.fatal({ error }, 'Uncaught exception, shutting down');
      await this.stop('uncaught_exception');
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      logger.fatal({ reason }, 'Unhandled rejection, shutting down');
      await this.stop('unhandled_rejection');
      process.exit(1);
    });
  }
}

// Export singleton instance
export const productionOrchestrator = ProductionOrchestrator.getInstance();