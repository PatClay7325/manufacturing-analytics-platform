/**
 * OPC UA Client Example for Manufacturing Equipment
 * Demonstrates production-ready usage of the OPC UA client
 */

import {
  OPCUAClient,
  OPCUAConnectionConfig,
  EquipmentNode,
  ManufacturingDataValue,
  MessageSecurityMode,
  SecurityPolicy
} from '../index';
import { logger } from '../../logger';

// Example configuration for a manufacturing facility
const MANUFACTURING_CONNECTIONS: OPCUAConnectionConfig[] = [
  {
    endpointUrl: 'opc.tcp://cnc-machine-01.factory.local:4840',
    applicationName: 'ManufacturingAnalyticsPlatform',
    applicationUri: 'urn:manufacturing:analytics:platform',
    securityMode: MessageSecurityMode.SignAndEncrypt,
    securityPolicy: SecurityPolicy.Basic256Sha256,
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    endpointUrl: 'opc.tcp://plc-line-01.factory.local:4840',
    applicationName: 'ManufacturingAnalyticsPlatform',
    applicationUri: 'urn:manufacturing:analytics:platform',
    securityMode: MessageSecurityMode.Sign,
    securityPolicy: SecurityPolicy.Basic256
  }
];

// Equipment configuration
const EQUIPMENT_MAPPINGS: EquipmentNode[] = [
  {
    equipmentId: 'CNC-001',
    equipmentName: 'CNC Machine 001',
    nodes: {
      status: 'ns=2;s=CNC001.Status',
      temperature: 'ns=2;s=CNC001.Temperature',
      vibration: 'ns=2;s=CNC001.Vibration',
      speed: 'ns=2;s=CNC001.SpindleSpeed',
      production: 'ns=2;s=CNC001.PartsProduced',
      quality: 'ns=2;s=CNC001.QualityScore',
      energy: 'ns=2;s=CNC001.PowerConsumption'
    }
  },
  {
    equipmentId: 'PLC-LINE-001',
    equipmentName: 'Production Line 001',
    nodes: {
      status: 'ns=3;s=Line001.Status',
      speed: 'ns=3;s=Line001.ConveyorSpeed',
      production: 'ns=3;s=Line001.ProductionCount',
      quality: 'ns=3;s=Line001.DefectRate',
      energy: 'ns=3;s=Line001.TotalEnergy'
    }
  }
];

/**
 * Example: Initialize and use OPC UA client for manufacturing
 */
export async function runManufacturingExample() {
  // Create client with production configuration
  const client = new OPCUAClient(
    {
      connectionPool: {
        maxConnections: 10,
        minConnections: 2,
        connectionIdleTimeout: 300000, // 5 minutes
        healthCheckInterval: 30000 // 30 seconds
      },
      security: {
        certificatePath: './pki/client_cert.pem',
        privateKeyPath: './pki/client_key.pem',
        rejectUnknownCertificates: false
      },
      metrics: {
        enabled: true,
        prefix: 'manufacturing_opcua_',
        defaultLabels: {
          facility: 'main_factory',
          region: 'us_east'
        }
      },
      typeMapping: {
        enumMappings: {
          'ns=2;s=CNC001.Status': {
            0: 'STOPPED',
            1: 'RUNNING',
            2: 'ERROR',
            3: 'MAINTENANCE'
          }
        }
      }
    },
    {
      // Event handlers
      onDataChange: async (data: ManufacturingDataValue) => {
        logger.info('Data received', {
          equipment: data.equipmentName,
          parameter: data.parameterName,
          value: data.value,
          quality: data.quality.isGood ? 'GOOD' : 'BAD',
          timestamp: data.timestamp
        });

        // Process data based on type
        if (data.parameterName === 'temperature' && data.value > 80) {
          logger.warn('High temperature detected', {
            equipment: data.equipmentName,
            temperature: data.value
          });
        }
      },
      onConnectionLost: (error: Error) => {
        logger.error('Connection lost', { error });
      },
      onConnectionRestored: () => {
        logger.info('Connection restored');
      },
      onError: (error: Error) => {
        logger.error('OPC UA error', { error });
      }
    }
  );

  try {
    // Initialize client
    logger.info('Initializing OPC UA client...');
    await client.initialize(MANUFACTURING_CONNECTIONS);

    // Configure equipment mappings
    client.configureEquipment(EQUIPMENT_MAPPINGS);

    // Create subscriptions for each endpoint
    for (const connection of MANUFACTURING_CONNECTIONS) {
      const subscriptionId = `sub_${connection.endpointUrl}`;
      
      await client.createSubscription(
        connection.endpointUrl,
        subscriptionId,
        {
          requestedPublishingInterval: 1000, // 1 second
          requestedLifetimeCount: 100,
          requestedMaxKeepAliveCount: 10,
          maxNotificationsPerPublish: 100,
          publishingEnabled: true,
          priority: 10
        }
      );

      logger.info('Subscription created', {
        endpoint: connection.endpointUrl,
        subscriptionId
      });
    }

    // Monitor CNC machine
    await client.monitorEquipment(
      'opc.tcp://cnc-machine-01.factory.local:4840',
      'CNC-001',
      'sub_opc.tcp://cnc-machine-01.factory.local:4840',
      ['status', 'temperature', 'vibration', 'speed', 'production']
    );

    // Monitor production line
    await client.monitorEquipment(
      'opc.tcp://plc-line-01.factory.local:4840',
      'PLC-LINE-001',
      'sub_opc.tcp://plc-line-01.factory.local:4840'
      // Monitor all parameters (no filter specified)
    );

    // Example: Read current values
    const currentValues = await client.readValues(
      'opc.tcp://cnc-machine-01.factory.local:4840',
      [
        'ns=2;s=CNC001.Status',
        'ns=2;s=CNC001.Temperature',
        'ns=2;s=CNC001.PartsProduced'
      ]
    );

    logger.info('Current values read', {
      values: currentValues.map(v => ({
        nodeId: v.nodeId,
        value: v.value,
        quality: v.quality.isGood ? 'GOOD' : 'BAD'
      }))
    });

    // Example: Write setpoint value
    const writeResults = await client.writeValues(
      'opc.tcp://cnc-machine-01.factory.local:4840',
      [
        {
          nodeId: 'ns=2;s=CNC001.SpeedSetpoint',
          value: 1500,
          dataType: DataType.Double
        }
      ]
    );

    logger.info('Write results', { success: writeResults });

    // Browse server nodes
    const browseResults = await client.browse(
      'opc.tcp://cnc-machine-01.factory.local:4840',
      'ns=2;s=CNC001'
    );

    logger.info('Browse results', {
      nodeCount: browseResults.length,
      nodes: browseResults.slice(0, 5).map(ref => ({
        browseName: ref.browseName.name,
        nodeId: ref.nodeId.toString()
      }))
    });

    // Get metrics
    const metrics = await client.getMetrics();
    logger.info('Client metrics', metrics);

    // Set up metrics endpoint (example with Express)
    // app.get('/metrics', async (req, res) => {
    //   const prometheusMetrics = await client.getPrometheusMetrics();
    //   res.set('Content-Type', 'text/plain');
    //   res.send(prometheusMetrics);
    // });

    // Run for demonstration
    logger.info('OPC UA client running. Press Ctrl+C to stop.');
    
    // Keep running
    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
      process.on('SIGTERM', resolve);
    });

  } catch (error) {
    logger.error('Example failed', { error });
  } finally {
    // Cleanup
    logger.info('Shutting down OPC UA client...');
    await client.shutdown();
    logger.info('Shutdown complete');
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  runManufacturingExample().catch(error => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}