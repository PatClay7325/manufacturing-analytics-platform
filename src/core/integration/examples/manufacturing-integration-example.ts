/**
 * Manufacturing Integration Example
 * 
 * This example demonstrates how to use the integration framework to connect to a 
 * manufacturing system, process data, and integrate with other platform services.
 */

import { initializePlatform } from './index';
import { IntegrationService } from './service/IntegrationService';
import { IntegrationAdapter } from './interfaces/IntegrationAdapter';
import { DataTransformer } from './interfaces/DataTransformer';
import { DataValidator } from './interfaces/DataValidator';
import { IntegrationSystemType, IntegrationDataPacket } from './types';
import { JsonTransformer } from './transformers/JsonTransformer';
import { SchemaValidator } from './validation/SchemaValidator';
import { ISO22400Validator } from './validation/standards/ISO22400Validator';
import { IntegrationPipeline } from './pipeline/IntegrationPipeline';
import { OpcUaAdapter } from './adapters/opcua/OpcUaAdapter';
import { MqttAdapter } from './adapters/mqtt/MqttAdapter';
import { DeploymentEnvironment, LogLevel } from './architecture/types';
import { EventBus } from './events/interfaces';

// Example machine data schema
const machineDataSchema = {
  type: 'object',
  required: ['machineId', 'timestamp', 'status', 'temperature', 'pressure'],
  properties: {
    machineId: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['RUNNING', 'IDLE', 'ERROR', 'MAINTENANCE'] },
    temperature: { type: 'number' },
    pressure: { type: 'number' },
    vibration: { type: 'number' },
    productionRate: { type: 'number' },
    qualityRate: { type: 'number' },
    errorCode: { type: 'string' },
    maintenanceNeeded: { type: 'boolean' }
  }
};

/**
 * Main example function
 */
export async function runManufacturingIntegrationExample() {
  console.log('Starting Manufacturing Integration Example...');
  
  // Initialize the platform
  const app = await initializePlatform({
    name: 'Manufacturing Integration Example',
    version: '1.0.0',
    environment: DeploymentEnvironment.DEVELOPMENT,
    debug: true,
    logLevel: LogLevel.DEBUG,
    tracing: true,
    settings: {
      integration: {
        enableAutoReconnect: true,
        defaultTimeout: 30000,
        batchProcessing: {
          enabled: true,
          maxBatchSize: 100,
          flushInterval: 5000
        },
        monitoring: {
          enabled: true,
          metricsInterval: 60000,
          enableProfiling: true
        }
      }
    }
  });
  
  try {
    // Get references to services
    const integrationService = app.getServiceByName('IntegrationService') as IntegrationService;
    const eventBus = app.getEventBus() as EventBus;
    
    if (!integrationService) {
      throw new Error('Integration Service not found');
    }
    
    console.log('Setting up integration adapters...');
    
    // Create an OPC UA adapter for the CNC machine
    const opcUaAdapter = await setupOpcUaAdapter();
    
    // Register the adapter with the integration service
    const registerResult = await integrationService.registerAdapter(opcUaAdapter);
    
    if (!registerResult.success) {
      throw new Error(`Failed to register OPC UA adapter: ${registerResult.message}`);
    }
    
    console.log('OPC UA adapter registered:', opcUaAdapter.id);
    
    // Create an MQTT adapter for the IoT sensors
    const mqttAdapter = await setupMqttAdapter();
    
    // Register the adapter with the integration service
    const mqttRegisterResult = await integrationService.registerAdapter(mqttAdapter);
    
    if (!mqttRegisterResult.success) {
      throw new Error(`Failed to register MQTT adapter: ${mqttRegisterResult.message}`);
    }
    
    console.log('MQTT adapter registered:', mqttAdapter.id);
    
    // Set up transformers and validators
    const jsonTransformer = new JsonTransformer();
    const schemaValidator = new SchemaValidator('machine-data-validator');
    schemaValidator.addSchema('machineData', machineDataSchema);
    
    // Set up ISO22400 validator for KPIs
    const kpiValidator = new ISO22400Validator();
    
    // Create an integration pipeline
    console.log('Creating integration pipeline...');
    
    const pipelineResult = await integrationService.createPipeline(
      'machine-data-pipeline',
      'Machine Data Processing Pipeline',
      {
        autoStart: true,
        bufferSize: 100,
        errorHandling: {
          retryCount: 3,
          retryDelay: 5000,
          errorQueue: 'error-queue'
        }
      }
    );
    
    if (!pipelineResult.success || !pipelineResult.data) {
      throw new Error(`Failed to create pipeline: ${pipelineResult.message}`);
    }
    
    const pipeline = pipelineResult.data;
    
    // Configure the pipeline
    pipeline.addAdapter(opcUaAdapter);
    pipeline.addAdapter(mqttAdapter);
    pipeline.addTransformer(jsonTransformer);
    pipeline.addValidator(schemaValidator);
    pipeline.addValidator(kpiValidator);
    
    // Set up event handling
    setupEventHandlers(eventBus);
    
    // Connect to the data sources
    console.log('Connecting to data sources...');
    
    const opcUaConnectResult = await integrationService.connect(opcUaAdapter.id);
    
    if (!opcUaConnectResult.success) {
      console.warn(`Warning: Failed to connect to OPC UA server: ${opcUaConnectResult.message}`);
    } else {
      console.log('Connected to OPC UA server');
    }
    
    const mqttConnectResult = await integrationService.connect(mqttAdapter.id);
    
    if (!mqttConnectResult.success) {
      console.warn(`Warning: Failed to connect to MQTT broker: ${mqttConnectResult.message}`);
    } else {
      console.log('Connected to MQTT broker');
    }
    
    // Set up data reception handlers
    await setupDataHandlers(integrationService, opcUaAdapter, mqttAdapter);
    
    // Start the pipeline
    console.log('Starting pipeline...');
    await pipeline.start();
    
    // Simulate sending some data
    await simulateDataSending(integrationService, opcUaAdapter.id);
    
    console.log('Integration example is running. Press Ctrl+C to stop...');
    
    // Keep the example running until interrupted
    return new Promise<void>((resolve) => {
      process.on('SIGINT', async () => {
        console.log('\nShutting down example...');
        
        // Stop the pipeline
        await pipeline.stop();
        
        // Disconnect from data sources
        await integrationService.disconnect(opcUaAdapter.id);
        await integrationService.disconnect(mqttAdapter.id);
        
        // Stop the application
        await app.stop();
        
        console.log('Example shutdown complete');
        resolve();
      });
    });
  } catch (error) {
    console.error('Error in integration example:', error);
    await app.stop();
    throw error;
  }
}

/**
 * Set up OPC UA adapter
 */
async function setupOpcUaAdapter(): Promise<IntegrationAdapter> {
  // In a real implementation, this would create a real OPC UA adapter
  // For this example, we're using mock adapter settings
  return new OpcUaAdapter({
    id: 'cnc-machine-opcua',
    name: 'CNC Machine OPC UA',
    description: 'OPC UA connection to the CNC machine',
    type: IntegrationSystemType.OPCUA,
    connectionParams: {
      endpoint: 'opc.tcp://machine.example.com:4840',
      securityMode: 'SignAndEncrypt',
      securityPolicy: 'Basic256Sha256',
      authentication: {
        type: 'username',
        username: 'opcuser',
        password: 'opcpassword'
      },
      nodeIds: [
        'ns=1;s=Machine1.Status',
        'ns=1;s=Machine1.Temperature',
        'ns=1;s=Machine1.Pressure',
        'ns=1;s=Machine1.ProductionRate'
      ],
      subscriptionInterval: 1000,
      reconnectInterval: 5000,
      maxRetries: 10
    }
  });
}

/**
 * Set up MQTT adapter
 */
async function setupMqttAdapter(): Promise<IntegrationAdapter> {
  // In a real implementation, this would create a real MQTT adapter
  // For this example, we're using mock adapter settings
  return new MqttAdapter({
    id: 'factory-sensors-mqtt',
    name: 'Factory Floor Sensors',
    description: 'MQTT connection to factory floor IoT sensors',
    type: IntegrationSystemType.MQTT,
    connectionParams: {
      brokerUrl: 'mqtt://broker.example.com:1883',
      clientId: 'manufacturing-platform-client',
      username: 'mqttuser',
      password: 'mqttpassword',
      topics: [
        'factory/sensors/temperature',
        'factory/sensors/humidity',
        'factory/sensors/vibration',
        'factory/sensors/presence'
      ],
      qos: 1,
      reconnectInterval: 5000,
      maxRetries: 10
    }
  });
}

/**
 * Set up event handlers
 */
function setupEventHandlers(eventBus: EventBus): void {
  // Subscribe to integration events
  eventBus.subscribe('integration.adapter.connected', (event: any) => {
    console.log(`Event: Adapter connected - ${event.name} (${event.integrationId})`);
  });
  
  eventBus.subscribe('integration.adapter.disconnected', (event: any) => {
    console.log(`Event: Adapter disconnected - ${event.name} (${event.integrationId})`);
  });
  
  eventBus.subscribe('integration.adapter.error', (event: any) => {
    console.error(`Event: Adapter error - ${event.name} (${event.integrationId}): ${event.error}`);
  });
  
  eventBus.subscribe('integration.data.received', (event: any) => {
    console.log(`Event: Data received from dataId}`);
  });
  
  eventBus.subscribe('integration.data.processed', (event: any) => {
    console.log(`Event: Data processed - Pipeline: ${event.pipelineId}, Data ID: ${event.dataId}`);
  });
  
  eventBus.subscribe('integration.data.error', (event: any) => {
    console.error(`Event: Data processing error - ${event.error}`);
  });
}

/**
 * Set up data handlers
 */
async function setupDataHandlers(
  integrationService: IntegrationService,
  opcUaAdapter: IntegrationAdapter,
  mqttAdapter: IntegrationAdapter
): Promise<void> {
  // Set up OPC UA data handler
  await integrationService.receiveData(opcUaAdapter.id, async (data: IntegrationDataPacket<any>) => {
    console.log(`Received OPC UA data from payload);
    
    // Process the data (in a real implementation, this would do something useful)
    await processOpcUaData(data);
  });
  
  // Set up MQTT data handler
  await integrationService.receiveData(mqttAdapter.id, async (data: IntegrationDataPacket<any>) => {
    console.log(`Received MQTT data from payload);
    
    // Process the data (in a real implementation, this would do something useful)
    await processMqttData(data);
  });
}

/**
 * Process OPC UA data
 */
async function processOpcUaData(data: IntegrationDataPacket<any>): Promise<void> {
  // In a real implementation, this would process the data and potentially:
  // - Store it in a database
  // - Trigger alerts based on thresholds
  // - Update dashboards
  // - Calculate KPIs
  
  // For this example, we just log it
  console.log('Processing OPC UA data:', data.id);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Process MQTT data
 */
async function processMqttData(data: IntegrationDataPacket<any>): Promise<void> {
  // In a real implementation, this would process the data and potentially:
  // - Store it in a database
  // - Trigger alerts based on thresholds
  // - Update dashboards
  // - Calculate KPIs
  
  // For this example, we just log it
  console.log('Processing MQTT data:', data.id);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Simulate sending data
 */
async function simulateDataSending(
  integrationService: IntegrationService,
  adapterId: string
): Promise<void> {
  // Simulate sending a command to the CNC machine
  const command = {
    id: `cmd-${Date.now()}`,
    source: 'manufacturing-platform',
    timestamp: new Date().toISOString(),
    payload: {
      command: 'START_PRODUCTION',
      partNumber: 'ABC-123',
      quantity: 100,
      parameters: {
        speed: 1200,
        feedRate: 50,
        toolNumber: 5
      }
    }
  };
  
  console.log('Sending command to CNC machine:', command);
  
  try {
    const sendResult = await integrationService.sendData(adapterId, command);
    
    if (sendResult.success) {
      console.log('Command sent successfully');
    } else {
      console.error('Failed to send command:', sendResult.message);
    }
  } catch (error) {
    console.error('Error sending command:', error);
  }
}

// If this script is run directly
if (require.main === module) {
  runManufacturingIntegrationExample().catch(error => {
    console.error('Integration example failed:', error);
    process.exit(1);
  });
}