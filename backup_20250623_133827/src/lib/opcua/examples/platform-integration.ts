/**
 * OPC UA Integration with Manufacturing AnalyticsPlatform
 * Shows how to integrate OPC UA data collection with the existing platform
 */

import { OPCUAClient, ManufacturingDataValue } from '../index';
import { prisma } from '../../prisma';
import { logger } from '../../logger';

/**
 * Service to integrate OPC UA data with the platform
 */
export class OPCUAIntegrationService {
  private client: OPCUAClient;
  private dataBuffer: ManufacturingDataValue[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor() {
    this.client = new OPCUAClient(
      {
        connectionPool: {
          maxConnections: 5,
          minConnections: 1,
          connectionIdleTimeout: 300000,
          healthCheckInterval: 30000
        },
        metrics: {
          enabled: true,
          prefix: 'mfg_opcua_'
        }
      },
      {
        onDataChange: this.handleDataChange.bind(this),
        onError: this.handleError.bind(this)
      }
    );
  }

  /**
   * Start the integration service
   */
  async start(): Promise<void> {
    try {
      // Get OPC UA endpoints from database
      const equipment = await prisma.equipment.findMany({
        where: {
          opcuaEndpoint: { not: null }
        }
      });

      if (equipment.length === 0) {
        logger.warn('No equipment with OPC UA endpoints found');
        return;
      }

      // Create connection configurations
      const connections = equipment.map(eq => ({
        endpointUrl: eq.opcuaEndpoint!,
        applicationName: 'ManufacturingAnalyticsPlatform'
      }));

      // Initialize client
      await this.client.initialize(connections);

      // Configure equipment mappings
      const equipmentMappings = equipment.map(eq => ({
        equipmentId: eq.id,
        equipmentName: eq.name,
        nodes: JSON.parse(eq.opcuaNodes || '{}')
      }));

      this.client.configureEquipment(equipmentMappings);

      // Create subscriptions and monitor equipment
      for (const eq of equipment) {
        if (!eq.opcuaEndpoint) continue;

        const subscriptionId = `sub_${eq.id}`;
        
        await this.client.createSubscription(
          eq.opcuaEndpoint,
          subscriptionId,
          {
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10
          }
        );

        await this.client.monitorEquipment(
          eq.opcuaEndpoint,
          eq.id,
          subscriptionId
        );

        logger.info('Monitoring equipment via OPC UA', {
          equipmentId: eq.id,
          name: eq.name,
          endpoint: eq.opcuaEndpoint
        });
      }

      // Start data flush interval
      this.startDataFlush();

      logger.info('OPC UA integration service started');
    } catch (error) {
      logger.error('Failed to start OPC UA integration', { error });
      throw error;
    }
  }

  /**
   * Handle incoming data changes
   */
  private async handleDataChange(data: ManufacturingDataValue): Promise<void> {
    // Add to buffer for batch processing
    this.dataBuffer.push(data);

    // Flush if buffer is getting large
    if (this.dataBuffer.length >= 100) {
      await this.flushData();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    logger.error('OPC UA error', { error });
    
    // Could implement alerting here
    // await createAlert({
    //   type: 'OPC_UA_ERROR',
    //   severity: 'high',
    //   message: error.message
    // });
  }

  /**
   * Start periodic data flush
   */
  private startDataFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushData().catch(error => {
        logger.error('Error flushing OPC UA data', { error });
      });
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush buffered data to database
   */
  private async flushData(): Promise<void> {
    if (this.dataBuffer.length === 0) return;

    const dataToFlush = [...this.dataBuffer];
    this.dataBuffer = [];

    try {
      // Group data by equipment
      const dataByEquipment = new Map<string, ManufacturingDataValue[]>();
      
      for (const data of dataToFlush) {
        if (!data.equipmentId) continue;
        
        if (!dataByEquipment.has(data.equipmentId)) {
          dataByEquipment.set(data.equipmentId, []);
        }
        dataByEquipment.get(data.equipmentId)!.push(data);
      }

      // Process each equipment's data
      for (const [equipmentId, values] of dataByEquipment) {
        await this.processEquipmentData(equipmentId, values);
      }

      logger.info('Flushed OPC UA data', {
        totalValues: dataToFlush.length,
        equipmentCount: dataByEquipment.size
      });
    } catch (error) {
      logger.error('Failed to flush OPC UA data', { error });
      // Re-add failed data to buffer
      this.dataBuffer.unshift(...dataToFlush);
    }
  }

  /**
   * Process data for a specific equipment
   */
  private async processEquipmentData(
    equipmentId: string,
    values: ManufacturingDataValue[]
  ): Promise<void> {
    // Create metrics records
    const metrics = values.map(value => ({
      equipmentId,
      metric: value.parameterName || value.nodeId,
      value: Number(value.value) || 0,
      unit: value.unit || '',
      quality: value.quality.isGood ? 'GOOD' : 'BAD',
      timestamp: value.timestamp
    }));

    // Batch insert metrics
    await prisma.metric.createMany({
      data: metrics,
      skipDuplicates: true
    });

    // Update equipment status based on latest values
    const statusValue = values.find(v => v.parameterName === 'status');
    if (statusValue) {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          status: this.mapStatus(statusValue.value),
          lastDataReceived: new Date()
        }
      });
    }

    // Check for alerts
    await this.checkAlertConditions(equipmentId, values);
  }

  /**
   * Map OPC UA status to equipment status
   */
  private mapStatus(opcuaStatus: any): string {
    const statusMap: Record<string, string> = {
      'RUNNING': 'operational',
      'STOPPED': 'idle',
      'ERROR': 'maintenance',
      'MAINTENANCE': 'maintenance'
    };

    return statusMap[String(opcuaStatus)] || 'unknown';
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(
    equipmentId: string,
    values: ManufacturingDataValue[]
  ): Promise<void> {
    // Check temperature alerts
    const temperature = values.find(v => v.parameterName === 'temperature');
    if (temperature && Number(temperature.value) > 80) {
      await prisma.alert.create({
        data: {
          equipmentId,
          type: 'high_temperature',
          severity: 'warning',
          message: `High temperature detected: ${temperature.value}°C`,
          metadata: {
            temperature: temperature.value,
            threshold: 80
          }
        }
      });
    }

    // Check vibration alerts
    const vibration = values.find(v => v.parameterName === 'vibration');
    if (vibration && Number(vibration.value) > 10) {
      await prisma.alert.create({
        data: {
          equipmentId,
          type: 'high_vibration',
          severity: 'warning',
          message: `High vibration detected: ${vibration.value} mm/s`,
          metadata: {
            vibration: vibration.value,
            threshold: 10
          }
        }
      });
    }
  }

  /**
   * Get current metrics
   */
  async getMetrics() {
    return this.client.getMetrics();
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.client.getPrometheusMetrics();
  }

  /**
   * Stop the integration service
   */
  async stop(): Promise<void> {
    logger.info('Stopping OPC UA integration service');

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush remaining data
    await this.flushData();

    // Shutdown client
    await this.client.shutdown();

    logger.info('OPC UA integration service stopped');
  }
}

// Example usage in API route
export async function createOPCUAIntegrationRoute(app: any) {
  const integrationService = new OPCUAIntegrationService();

  // Start service
  await integrationService.start();

  // Metrics endpoint
  app.get('/api/opcua/metrics', async (req: any, res: any) => {
    try {
      const metrics = await integrationService.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Status endpoint
  app.get('/api/opcua/status', async (req: any, res: any) => {
    try {
      const metrics = await integrationService.getMetrics();
      res.json({ status: 'running', metrics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await integrationService.stop();
  });
}