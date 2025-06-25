import { logger } from '@/lib/logger';
import { 
  initializeHealthChecks, 
  startHealthMonitoring,
  stopHealthMonitoring 
} from '@/lib/resilience';
import { mqttIngestionService } from '@/services/data-pipeline/MqttIngestionService';

interface ServiceInitializationOptions {
  enableMqttIngestion?: boolean;
  enableHealthMonitoring?: boolean;
  enableGracefulShutdown?: boolean;
}

export class ServiceManager {
  private isInitialized = false;
  private services: Map<string, ServiceDescriptor> = new Map();
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(private options: ServiceInitializationOptions = {}) {
    this.options = {
      enableMqttIngestion: true,
      enableHealthMonitoring: true,
      enableGracefulShutdown: true,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Services already initialized');
      return;
    }

    logger.info('Initializing application services...');

    try {
      // Initialize health checks first
      if (this.options.enableHealthMonitoring) {
        await this.initializeHealthSystem();
      }

      // Initialize MQTT ingestion service
      if (this.options.enableMqttIngestion && process.env.MQTT_URL) {
        await this.initializeMqttService();
      }

      // Setup graceful shutdown handling
      if (this.options.enableGracefulShutdown) {
        this.setupGracefulShutdown();
      }

      this.isInitialized = true;
      logger.info('All services initialized successfully', {
        services: Array.from(this.services.keys()),
        healthMonitoring: this.options.enableHealthMonitoring,
        mqttIngestion: this.options.enableMqttIngestion,
      });

    } catch (error) {
      logger.error('Failed to initialize services', { error: (error as Error).message });
      await this.shutdown();
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down application services...');

    // Stop health monitoring first
    stopHealthMonitoring();

    // Execute shutdown handlers in reverse order
    for (const handler of this.shutdownHandlers.reverse()) {
      try {
        await handler();
      } catch (error) {
        logger.error('Error during service shutdown', { error: (error as Error).message });
      }
    }

    this.services.clear();
    this.shutdownHandlers = [];
    this.isInitialized = false;

    logger.info('Application services shutdown complete');
  }

  getServiceStatus(): Record<string, ServiceStatus> {
    const status: Record<string, ServiceStatus> = {};
    
    for (const [name, descriptor] of this.services.entries()) {
      status[name] = {
        name,
        status: descriptor.status,
        startTime: descriptor.startTime,
        lastHealthCheck: descriptor.lastHealthCheck,
        metadata: descriptor.metadata,
      };
    }

    return status;
  }

  private async initializeHealthSystem(): Promise<void> {
    logger.info('Initializing health monitoring system');

    try {
      // Initialize health checks
      initializeHealthChecks();

      // Start periodic health monitoring
      startHealthMonitoring();

      this.services.set('health-monitoring', {
        name: 'health-monitoring',
        status: 'running',
        startTime: new Date(),
        lastHealthCheck: new Date(),
        metadata: {
          description: 'System health monitoring and circuit breakers',
        },
      });

      // Add shutdown handler
      this.shutdownHandlers.push(async () => {
        logger.info('Stopping health monitoring');
        stopHealthMonitoring();
        this.services.delete('health-monitoring');
      });

      logger.info('Health monitoring system initialized');
    } catch (error) {
      logger.error('Failed to initialize health monitoring', { error: (error as Error).message });
      throw error;
    }
  }

  private async initializeMqttService(): Promise<void> {
    logger.info('Initializing MQTT ingestion service');

    try {
      await mqttIngestionService.start();

      this.services.set('mqtt-ingestion', {
        name: 'mqtt-ingestion',
        status: 'running',
        startTime: new Date(),
        lastHealthCheck: new Date(),
        metadata: {
          description: 'MQTT data ingestion service',
          config: {
            mqttUrl: process.env.MQTT_URL,
            batchSize: 100,
            flushInterval: 5000,
          },
        },
      });

      // Add shutdown handler
      this.shutdownHandlers.push(async () => {
        logger.info('Stopping MQTT ingestion service');
        await mqttIngestionService.stop();
        this.services.delete('mqtt-ingestion');
      });

      logger.info('MQTT ingestion service initialized');
    } catch (error) {
      logger.error('Failed to initialize MQTT service', { error: (error as Error).message });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown`);
        
        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error: (error as Error).message });
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception, shutting down', { error: error.message, stack: error.stack });
      this.shutdown().finally(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection, shutting down', { reason, promise });
      this.shutdown().finally(() => process.exit(1));
    });

    logger.info('Graceful shutdown handlers registered');
  }
}

// Service descriptor interface
interface ServiceDescriptor {
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  lastHealthCheck: Date;
  metadata?: Record<string, any>;
}

interface ServiceStatus {
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  lastHealthCheck: Date;
  metadata?: Record<string, any>;
}

// Global service manager instance
export const serviceManager = new ServiceManager();

// Convenience functions
export async function initializeApplication(options?: ServiceInitializationOptions): Promise<void> {
  const manager = new ServiceManager(options);
  await manager.initialize();
  return;
}

export async function shutdownApplication(): Promise<void> {
  await serviceManager.shutdown();
}

export function getApplicationStatus(): Record<string, ServiceStatus> {
  return serviceManager.getServiceStatus();
}

// Initialize services when this module is imported (for Next.js)
if (process.env.NODE_ENV === 'production' || process.env.AUTO_INITIALIZE_SERVICES === 'true') {
  serviceManager.initialize().catch(error => {
    logger.error('Failed to auto-initialize services', { error: error.message });
  });
}

// Export for manual initialization in development
export { ServiceManager };