# Manufacturing Analytics Platform - Integration Framework

## 1. Overview

### Purpose and Goals

The Integration Framework is a core component of the Manufacturing Analytics Platform designed to provide a flexible, robust, and extensible system for connecting to various external manufacturing systems. Its primary goals are:

- **Seamless connectivity**: Connect to a wide range of manufacturing equipment, sensors, and systems using standard protocols
- **Data standardization**: Transform diverse data formats into a consistent internal representation
- **Data validation**: Ensure data quality and conformance to industry standards
- **Flexible processing**: Support complex data processing pipelines with multiple stages
- **Operational resilience**: Handle connection failures and errors gracefully with automatic recovery
- **Monitoring and management**: Provide visibility into integration health and performance

### Key Concepts

The Integration Framework is built on several key concepts:

- **Integration Adapters**: Pluggable components that handle protocol-specific communication with external systems
- **Data Transformers**: Convert between external data formats and internal standardized formats
- **Data Validators**: Ensure data integrity and compliance with schemas and industry standards
- **Integration Pipelines**: Configurable workflows that process data through multiple stages
- **Integration Manager**: Central service that coordinates and monitors all integration components
- **Integration Registry**: Repository of available integration adapters and configurations
- **Health Monitoring**: Continuous monitoring of connections and automatic recovery from failures

### Architecture Diagram

```
                                 ┌───────────────────────────────────────────────┐
                                 │            Integration Framework               │
                                 └───────────────────────────────────────────────┘
                                                       │
                                                       │
              ┌────────────────────────────────────────┼────────────────────────────────────────┐
              │                                         │                                        │
              ▼                                         ▼                                        ▼
    ┌───────────────────┐                    ┌───────────────────┐                   ┌───────────────────┐
    │ Integration       │                    │ Integration       │                   │ Integration       │
    │ Manager           │◄───────────────────► Registry          │                   │ Config            │
    └───────────────────┘                    └───────────────────┘                   └───────────────────┘
              │                                         ▲                                        ▲
              │                                         │                                        │
              ▼                                         │                                        │
    ┌───────────────────┐                               │                                        │
    │ Integration       │                               │                                        │
    │ Pipelines         │                               │                                        │
    └───────────────────┘                               │                                        │
              │                                         │                                        │
              ▼                                         │                                        │
┌─────────────────────────┐                             │                                        │
│                         │                             │                                        │
│   ┌─────────────────┐   │                             │                                        │
│   │  Source         │   │                             │                                        │
│   │  Adapters       │◄──┼─────────────────────────────┘                                        │
│   └─────────────────┘   │                                                                      │
│                         │                                                                      │
│   ┌─────────────────┐   │                                                                      │
│   │  Transformers   │◄──┼──────────────────────────────────────────────────────────────────────┘
│   └─────────────────┘   │
│                         │
│   ┌─────────────────┐   │
│   │  Validators     │◄──┼─────────────┐
│   └─────────────────┘   │             │
│                         │             │
│   ┌─────────────────┐   │             │              ┌───────────────────────┐
│   │  Sink           │   │             └──────────────► Industry Standards     │
│   │  Adapters       │◄──┼────────────────────────────► (ISO 14224, ISO 22400) │
│   └─────────────────┘   │                            └───────────────────────┘
│                         │
└─────────────────────────┘
        │         │
        │         │
        ▼         ▼
┌──────────┐ ┌───────────┐
│ External │ │ External  │
│ System 1 │ │ System 2  │
└──────────┘ └───────────┘
```

The Integration Framework follows a hexagonal architecture pattern, allowing for clean separation of concerns and easy addition of new components.

## 2. Components

### Integration Adapters

Integration Adapters are responsible for establishing and managing connections to external manufacturing systems using specific protocols.

#### MQTT Adapter

The MQTT Adapter connects to MQTT brokers commonly used in IoT and manufacturing environments.

```typescript
// Connect to an MQTT broker
const mqttAdapter = await integrationManager.registerIntegrationConfig({
  id: 'factory-floor-mqtt',
  name: 'Factory Floor MQTT',
  type: IntegrationSystemType.MQTT,
  description: 'Connection to factory floor MQTT broker',
  connectionParams: {
    brokerUrl: 'mqtt://broker.factory.example.com',
    port: 1883,
    clientId: 'manufacturing-analytics-platform',
    keepalive: 60,
    qos: 1
  },
  authParams: {
    username: 'mqtt-user',
    password: 'mqtt-password'
  }
});
```

#### OPC UA Adapter

The OPC UA Adapter connects to OPC UA servers prevalent in industrial automation systems.

```typescript
// Connect to an OPC UA server
const opcuaAdapter = await integrationManager.registerIntegrationConfig({
  id: 'assembly-line-opcua',
  name: 'Assembly Line OPC UA',
  type: IntegrationSystemType.OPC_UA,
  description: 'Connection to assembly line OPC UA server',
  connectionParams: {
    endpointUrl: 'opc.tcp://opcua.factory.example.com:4840',
    securityMode: 'SignAndEncrypt',
    securityPolicy: 'Basic256Sha256',
    defaultSubscription: {
      publishingInterval: 1000,
      lifetimeCount: 100
    }
  },
  authParams: {
    type: 'username',
    username: 'opcua-user',
    password: 'opcua-password'
  }
});
```

#### REST API Adapter

The REST API Adapter connects to HTTP-based APIs used in enterprise systems and cloud services.

```typescript
// Connect to a REST API
const restAdapter = await integrationManager.registerIntegrationConfig({
  id: 'erp-rest-api',
  name: 'ERP System REST API',
  type: IntegrationSystemType.REST_API,
  description: 'Connection to enterprise ERP system',
  connectionParams: {
    baseUrl: 'https://erp.example.com/api/v1',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  authParams: {
    type: 'oauth2',
    tokenUrl: 'https://erp.example.com/oauth/token',
    clientId: 'client-id',
    clientSecret: 'client-secret'
  }
});
```

### Data Transformers

Data Transformers convert between external data formats and the platform's internal standardized format.

#### JSON Transformer

The JSON Transformer handles JSON data commonly used in modern APIs and messaging systems.

```typescript
// Example of a JSON transformer converting external data to internal format
class JsonTransformer implements DataTransformer {
  async transformInbound(data: unknown, options?: Record<string, unknown>): Promise<TransformationResult> {
    try {
      // Parse JSON if it's a string
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Map to internal structure
      const transformedData: IntegrationDataPacket = {
        id: jsonData.id || uuidv4(),
        source: jsonData.source || options?.source || 'unknown',
        timestamp: new Date(jsonData.timestamp) || new Date(),
        payload: jsonData.data || jsonData,
        schemaVersion: jsonData.schema_version || '1.0',
        metadata: {
          originalFormat: 'json',
          ...jsonData.metadata
        }
      };
      
      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: IntegrationErrorType.TRANSFORMATION,
          message: `JSON transformation failed: ${error.message}`,
          originalError: error,
          timestamp: new Date(),
          integrationId: options?.integrationId as string || 'unknown'
        }
      };
    }
  }
  
  // Additional methods for outbound transformation
}
```

#### XML Transformer

The XML Transformer handles XML data commonly used in industrial systems and enterprise applications.

#### CSV Transformer

The CSV Transformer processes comma-separated values often used for bulk data transfer and legacy systems.

### Schema Mappers

Schema Mappers define how data structures from external systems map to internal data models.

```typescript
// Example schema mapping configuration
const temperatureSensorMapping = {
  sourceSchema: 'temperature_sensor_v1',
  targetSchema: 'manufacturing_sensor_reading',
  mappings: [
    { source: 'sensor_id', target: 'source' },
    { source: 'reading_time', target: 'timestamp', transformer: 'isoDateTransformer' },
    { source: 'temp_c', target: 'payload.temperature' },
    { source: 'humidity_pct', target: 'payload.humidity' },
    { source: 'battery_level', target: 'payload.batteryLevel' },
    { source: 'status_code', target: 'quality.status' },
    {
      source: 'status_code',
      target: 'quality.reliable',
      transformer: (value) => parseInt(value) === 0
    }
  ]
};
```

### Validators

Validators ensure data integrity and compliance with schemas and industry standards.

```typescript
// Example of a schema validator
class SchemaValidator implements DataValidator {
  constructor(private schema: JSONSchema7, private logger: LoggerService) {}
  
  async validateInbound(data: unknown, options?: Record<string, unknown>): Promise<ValidationResult> {
    try {
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(this.schema);
      const valid = validate(data);
      
      if (!valid) {
        return {
          valid: false,
          errors: validate.errors?.map(err => ({
            path: err.dataPath,
            message: err.message || 'Unknown validation error',
            code: err.keyword
          }))
        };
      }
      
      return { valid: true };
    } catch (error) {
      this.logger.error(`Schema validation error: ${error.message}`, error);
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Validation error: ${error.message}`,
          code: 'exception'
        }]
      };
    }
  }
  
  // Additional validation methods
}
```

### Integration Manager

The Integration Manager is the central orchestrator that manages all adapters, handles lifecycle events, and monitors health.

```typescript
// Initialize the integration manager
const integrationManager = new IntegrationManager(
  logger,
  configService,
  eventBus,
  eventProducer
);

// Configure the integration manager
await integrationManager.initialize({
  enableAutoReconnect: true,
  defaultTimeout: 30000,
  healthCheck: {
    interval: 60000,
    timeout: 5000,
    retries: 3
  },
  recovery: {
    maxAttempts: 5,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerResetTimeout: 300000
  }
});
```

### Integration Registry

The Integration Registry maintains a catalog of all available adapters and their metadata.

```typescript
// Register a factory for MQTT adapters
integrationManager.registerAdapterFactory(
  IntegrationSystemType.MQTT,
  async (config: IntegrationConfig) => {
    return new MqttAdapter(
      config,
      new JsonTransformer(),
      new SchemaValidator(mqttDataSchema, logger),
      logger
    );
  }
);
```

### Integration Pipelines

Integration Pipelines provide a flexible framework for processing data through multiple stages.

```typescript
// Create a data processing pipeline
const pipeline = integrationManager.createPipeline(
  'temperature-monitoring-pipeline',
  'Temperature Monitoring Pipeline',
  {
    autoStart: true,
    stages: [
      {
        id: 'source',
        name: 'MQTT Source',
        type: PipelineStageType.SOURCE,
        componentId: 'factory-floor-mqtt',
        config: {
          topics: ['factory/sensors/temperature/+/data']
        }
      },
      {
        id: 'transform',
        name: 'JSON Transform',
        type: PipelineStageType.TRANSFORMER,
        componentId: 'json-transformer',
        config: {
          mapping: temperatureSensorMapping
        }
      },
      {
        id: 'validate',
        name: 'Schema Validation',
        type: PipelineStageType.VALIDATOR,
        componentId: 'temperature-schema-validator'
      },
      {
        id: 'filter',
        name: 'Temperature Filter',
        type: PipelineStageType.FILTER,
        componentId: 'threshold-filter',
        config: {
          condition: 'data.payload.temperature > 80'
        }
      },
      {
        id: 'sink',
        name: 'Alert System',
        type: PipelineStageType.SINK,
        componentId: 'alert-system-rest-api',
        config: {
          endpoint: '/alerts/temperature'
        }
      }
    ],
    errorHandling: {
      defaultStrategy: 'retry',
      maxRetries: 3,
      retryDelay: 1000
    }
  }
);

// Start the pipeline
await pipeline.start();
```

## 3. Getting Started Guide

### Basic Setup

To integrate external manufacturing systems with the platform, follow these steps:

1. **Install Dependencies**

   Ensure all required dependencies are installed:

   ```bash
   npm install mqtt node-opcua axios jsonschema uuid
   ```

2. **Import Required Modules**

   ```typescript
   import { IntegrationManager } from '../core/integration/IntegrationManager';
   import { IntegrationSystemType } from '../core/integration/types';
   ```

3. **Initialize the Integration Manager**

   ```typescript
   const integrationManager = new IntegrationManager(
     logger,
     configService,
     eventBus,
     eventProducer
   );
   
   await integrationManager.initialize({
     enableAutoReconnect: true,
     defaultTimeout: 30000
   });
   
   await integrationManager.start();
   ```

### Configuration

Integration components are configured using JSON structures that define connection parameters, authentication, and behavior.

#### Example: MQTT Configuration

```typescript
const mqttConfig = {
  id: 'production-line-mqtt',
  name: 'Production Line MQTT',
  type: IntegrationSystemType.MQTT,
  description: 'Connection to production line MQTT broker',
  connectionParams: {
    brokerUrl: 'mqtt://broker.factory.example.com',
    port: 1883,
    clientId: 'map-client',
    keepalive: 60,
    qos: 1
  },
  authParams: {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  },
  retry: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  }
};
```

#### Example: OPC UA Configuration

```typescript
const opcuaConfig = {
  id: 'cnc-machine-opcua',
  name: 'CNC Machine OPC UA',
  type: IntegrationSystemType.OPC_UA,
  description: 'Connection to CNC machine OPC UA server',
  connectionParams: {
    endpointUrl: 'opc.tcp://machine.factory.example.com:4840',
    securityMode: 'SignAndEncrypt',
    securityPolicy: 'Basic256Sha256',
    defaultSubscription: {
      publishingInterval: 1000
    }
  },
  authParams: {
    type: 'username',
    username: process.env.OPCUA_USERNAME,
    password: process.env.OPCUA_PASSWORD
  }
};
```

### Creating a Simple Integration

Let's create a simple integration that reads temperature data from sensors via MQTT and logs it:

```typescript
async function setupTemperatureSensorIntegration() {
  // 1. Register the MQTT adapter
  const mqttAdapter = await integrationManager.registerIntegrationConfig(mqttConfig);
  
  // 2. Connect to the MQTT broker
  await integrationManager.connect('production-line-mqtt');
  
  // 3. Subscribe to temperature sensor data
  const subscriptionId = await integrationManager.receiveData(
    'production-line-mqtt',
    async (data) => {
      console.log(`Received temperature data: ${JSON.stringify(data)}`);
      
      // Process the data
      const temperature = data.payload.temperature;
      const sensorId = data.source;
      
      // Alert if temperature is too high
      if (temperature > 85) {
        console.warn(`High temperature alert: ${temperature}°C from sensor ${sensorId}`);
        // Send to alert system, database, etc.
      }
    },
    {
      topic: 'factory/sensors/temperature/+/data',
      qos: 1
    }
  );
  
  console.log(`Subscribed to temperature sensors with subscription ID: ${subscriptionId}`);
  
  return subscriptionId;
}

// Run the setup
setupTemperatureSensorIntegration()
  .then(subscriptionId => console.log(`Integration setup complete: ${subscriptionId}`))
  .catch(error => console.error(`Integration setup failed: ${error.message}`));
```

## 4. Advanced Usage

### Custom Adapters

You can create custom adapters for proprietary protocols or systems by extending the `AbstractIntegrationAdapter` class.

```typescript
// Custom adapter for a proprietary protocol
class ProprietaryProtocolAdapter extends AbstractIntegrationAdapter {
  private client: ProprietaryClient | null = null;
  
  protected async initializeAdapter(baseConfig: BaseConfig): Promise<void> {
    // Initialize adapter-specific resources
    this.logger.debug('Initializing proprietary protocol adapter');
  }
  
  public async connect(): Promise<void> {
    try {
      this.setConnectionStatus(ConnectionStatus.CONNECTING);
      
      // Connect using proprietary client library
      this.client = new ProprietaryClient(this.config.connectionParams);
      await this.client.connect({
        username: this.config.authParams?.username,
        password: this.config.authParams?.password
      });
      
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.clearLastError();
    } catch (error) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to connect: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  // Implement other required methods
  // ...
}

// Register the custom adapter factory
integrationManager.registerAdapterFactory(
  'proprietary_protocol',
  async (config: IntegrationConfig) => {
    return new ProprietaryProtocolAdapter(
      config,
      new JsonTransformer(),
      new SchemaValidator(proprietarySchema, logger),
      logger
    );
  }
);
```

### Custom Transformers

Create custom transformers for specific data formats by implementing the `DataTransformer` interface.

```typescript
// Custom transformer for a proprietary binary format
class BinaryFormatTransformer implements DataTransformer {
  async transformInbound(data: unknown, options?: Record<string, unknown>): Promise<TransformationResult> {
    try {
      // Handle binary data (e.g., Buffer)
      if (!(data instanceof Buffer)) {
        throw new Error('Expected binary data');
      }
      
      // Parse binary format based on known structure
      const buffer = data as Buffer;
      
      // Example: Reading a simple binary structure
      // Header (4 bytes) + Timestamp (8 bytes) + Value (4 bytes) + Status (1 byte)
      const header = buffer.readUInt32BE(0);
      const timestamp = new Date(Number(buffer.readBigUInt64BE(4)));
      const value = buffer.readFloatBE(12);
      const status = buffer.readUInt8(16);
      
      // Map to internal data structure
      const transformedData: IntegrationDataPacket = {
        id: uuidv4(),
        source: options?.source as string || 'binary-device',
        timestamp,
        payload: {
          header,
          value,
          status
        },
        quality: {
          reliable: status === 0,
          status: status.toString()
        },
        metadata: {
          originalFormat: 'binary',
          formatVersion: options?.formatVersion as string || '1.0'
        }
      };
      
      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: IntegrationErrorType.TRANSFORMATION,
          message: `Binary transformation failed: ${error.message}`,
          originalError: error,
          timestamp: new Date(),
          integrationId: options?.integrationId as string || 'unknown'
        }
      };
    }
  }
  
  // Implement outbound transformation
  async transformOutbound(data: IntegrationDataPacket, options?: Record<string, unknown>): Promise<TransformationResult> {
    // Convert internal data to binary format
    // ...
  }
}
```

### Complex Data Pipelines

For more complex scenarios, you can create sophisticated data processing pipelines with multiple stages.

```typescript
// Create a complex data processing pipeline
const complexPipeline = integrationManager.createPipeline(
  'machine-monitoring-pipeline',
  'Machine Monitoring Pipeline',
  {
    autoStart: true,
    stages: [
      // Stage 1: Source - Collect data from OPC UA server
      {
        id: 'opcua-source',
        name: 'OPC UA Source',
        type: PipelineStageType.SOURCE,
        componentId: 'cnc-machine-opcua',
        config: {
          nodeId: 'ns=2;s=Machine1.Status'
        }
      },
      
      // Stage 2: Transform - Convert data format
      {
        id: 'transform-opcua',
        name: 'OPC UA Transform',
        type: PipelineStageType.TRANSFORMER,
        componentId: 'opcua-transformer',
        config: {
          mapping: machineStatusMapping
        }
      },
      
      // Stage 3: Validate - Ensure data meets schema requirements
      {
        id: 'validate-schema',
        name: 'Schema Validation',
        type: PipelineStageType.VALIDATOR,
        componentId: 'machine-status-validator'
      },
      
      // Stage 4: Enrich - Add additional data from REST API
      {
        id: 'enrich-data',
        name: 'Data Enrichment',
        type: PipelineStageType.CUSTOM,
        componentId: 'data-enricher',
        config: {
          enrichmentSources: [
            {
              type: 'rest',
              url: 'https://api.example.com/machine-details/${data.source}',
              resultPath: 'payload.machineDetails'
            }
          ]
        }
      },
      
      // Stage 5: Filter - Only process critical status changes
      {
        id: 'status-filter',
        name: 'Status Filter',
        type: PipelineStageType.FILTER,
        componentId: 'condition-filter',
        config: {
          condition: 'data.payload.status === "ERROR" || data.payload.status === "WARNING"'
        }
      },
      
      // Stage 6: Fork - Send to multiple destinations
      {
        id: 'alert-sink',
        name: 'Alert System',
        type: PipelineStageType.SINK,
        componentId: 'alert-system-rest-api',
        config: {
          endpoint: '/alerts/machine-status'
        }
      },
      
      // Stage 7: Parallel destination
      {
        id: 'database-sink',
        name: 'Status Database',
        type: PipelineStageType.SINK,
        componentId: 'timeseries-db-adapter',
        config: {
          collection: 'machine_status',
          ttl: 2592000 // 30 days in seconds
        }
      }
    ],
    errorHandling: {
      defaultStrategy: 'retry',
      maxRetries: 3,
      retryDelay: 1000
    }
  }
);
```

### Error Handling

The framework provides comprehensive error handling mechanisms:

```typescript
// Configure error handling for an adapter
const mqttAdapter = await integrationManager.registerIntegrationConfig({
  id: 'production-line-mqtt',
  name: 'Production Line MQTT',
  type: IntegrationSystemType.MQTT,
  // ...connection params...
  retry: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  }
});

// Set up error event listeners
eventBus.subscribe('integration.adapter.error', async (event) => {
  if (event.integrationId === 'production-line-mqtt') {
    console.error(`MQTT error: ${event.error}`);
    
    // Take remedial action
    if (event.errorType === IntegrationErrorType.CONNECTION) {
      await notifyOperator('MQTT connection issue', event.error);
    }
  }
});

// Handle circuit breaker events
eventBus.subscribe('integration.adapter.health_changed', async (event) => {
  if (event.status.circuitBreakerTripped) {
    console.error(`Circuit breaker tripped for ${event.status.name}`);
    await notifyAdmin(`Integration ${event.status.name} circuit breaker tripped`);
  }
});
```

### Monitoring and Metrics

The framework includes built-in monitoring capabilities:

```typescript
// Get health status of all integrations
const healthStatus = await integrationManager.getHealth();
console.log(`Overall integration status: ${healthStatus.status}`);

// Log details about each adapter
healthStatus.dependencies.forEach(dep => {
  console.log(`${dep.name}: ${dep.status} (response time: ${dep.responseTime}ms)`);
  if (dep.details) {
    console.log(`  Connection status: ${dep.details.connectionStatus}`);
    console.log(`  Success rate: ${dep.details.successRate}%`);
  }
});

// Get statistics for a specific pipeline
const pipelineStats = integrationManager.getPipeline('machine-monitoring-pipeline').getStats();
console.log(`Pipeline processed ${pipelineStats.processedCount} messages`);
console.log(`Average processing time: ${pipelineStats.averageProcessingTime.toFixed(2)}ms`);
console.log(`Error count: ${pipelineStats.errorCount}`);

// Log stage-specific statistics
Object.entries(pipelineStats.stageStats).forEach(([stageId, stats]) => {
  console.log(`Stage ${stageId}:`);
  console.log(`  Processed: ${stats.processedCount}`);
  console.log(`  Errors: ${stats.errorCount}`);
  console.log(`  Avg time: ${stats.averageProcessingTime.toFixed(2)}ms`);
});
```

## 5. Integration with Manufacturing Standards

### ISO 14224

The ISO 14224 standard (Petroleum, petrochemical and natural gas industries — Collection and exchange of reliability and maintenance data for equipment) provides a framework for collecting reliability and maintenance data.

```typescript
// Create an ISO 14224 validator
const iso14224Validator = new ISO14224Validator(logger);

// Register the validator with a pipeline
complexPipeline.addValidator('iso14224-validator', iso14224Validator);

// Add validation stage to a pipeline
const maintenancePipeline = integrationManager.createPipeline(
  'maintenance-data-pipeline',
  'Maintenance Data Pipeline',
  {
    // ...other configuration...
    stages: [
      // ...previous stages...
      {
        id: 'validate-iso14224',
        name: 'ISO 14224 Validation',
        type: PipelineStageType.VALIDATOR,
        componentId: 'iso14224-validator',
        config: {
          // Specify which ISO 14224 taxonomy to validate against
          taxonomySection: 'failure_mode',
          // Define validation options
          strictMode: true,
          allowExtensions: false
        }
      },
      // ...subsequent stages...
    ]
  }
);
```

### ISO 22400

The ISO 22400 standard (Automation systems and integration — Key performance indicators (KPIs) for manufacturing operations management) defines key performance indicators for manufacturing operations.

```typescript
// Create an ISO 22400 validator
const iso22400Validator = new ISO22400Validator(logger);

// Register the validator with a pipeline
complexPipeline.addValidator('iso22400-validator', iso22400Validator);

// Add validation stage to a pipeline
const kpiPipeline = integrationManager.createPipeline(
  'kpi-data-pipeline',
  'KPI Data Pipeline',
  {
    // ...other configuration...
    stages: [
      // ...previous stages...
      {
        id: 'validate-iso22400',
        name: 'ISO 22400 KPI Validation',
        type: PipelineStageType.VALIDATOR,
        componentId: 'iso22400-validator',
        config: {
          // Specify which KPIs to validate
          kpiCategories: ['production', 'quality', 'maintenance'],
          // Define validation options
          requireUnitOfMeasure: true,
          validateRanges: true
        }
      },
      // ...subsequent stages...
    ]
  }
);
```

### Custom Standards

The framework supports the implementation of custom standards validators for industry-specific or company-specific requirements.

```typescript
// Implement a custom standard validator
class CustomStandardValidator implements DataValidator {
  constructor(
    private standardDefinition: Record<string, unknown>,
    private logger: LoggerService
  ) {}
  
  async validateInbound(data: unknown, options?: Record<string, unknown>): Promise<ValidationResult> {
    // Implement custom validation logic
    // ...
    
    // Return validation result
    return {
      valid: true, // or false with errors
      errors: [] // validation errors if any
    };
  }
  
  async validateOutbound(data: IntegrationDataPacket, options?: Record<string, unknown>): Promise<ValidationResult> {
    // Implement custom validation logic for outbound data
    // ...
  }
}

// Create and use a custom standard validator
const companyStandardValidator = new CustomStandardValidator(
  companyStandardDefinition,
  logger
);

// Add it to a pipeline
myPipeline.addValidator('company-standard-validator', companyStandardValidator);
```

## 6. Best Practices

### Security Considerations

1. **Secure Credentials Management**

   Never hardcode credentials in your configuration. Use environment variables, a secure credential store, or a secret management service.

   ```typescript
   // Bad practice
   const badConfig = {
     authParams: {
       username: 'admin',
       password: 'password123'  // Hardcoded password!
     }
   };
   
   // Good practice
   const goodConfig = {
     authParams: {
       username: process.env.MQTT_USERNAME,
       password: process.env.MQTT_PASSWORD
     }
   };
   ```

2. **Use TLS/SSL for All Communications**

   Always encrypt communications between the platform and external systems.

   ```typescript
   const secureConfig = {
     connectionParams: {
       brokerUrl: 'mqtts://broker.factory.example.com', // Note 'mqtts' protocol
       port: 8883 // TLS port
     },
     authParams: {
       tls: {
         enabled: true,
         rejectUnauthorized: true,
         ca: fs.readFileSync('/path/to/ca.crt'),
         cert: fs.readFileSync('/path/to/client.crt'),
         key: fs.readFileSync('/path/to/client.key')
       }
     }
   };
   ```

3. **Implement Proper Authentication**

   Use strong authentication methods appropriate for each protocol.

   ```typescript
   // OPC UA with certificate authentication
   const secureOpcuaConfig = {
     authParams: {
       type: 'certificate',
       certificatePath: '/path/to/client.crt',
       privateKeyPath: '/path/to/client.key',
       privateKeyPassword: process.env.KEY_PASSWORD
     }
   };
   
   // REST API with OAuth2
   const secureRestConfig = {
     authParams: {
       type: 'oauth2',
       tokenUrl: 'https://auth.example.com/oauth/token',
       clientId: process.env.OAUTH_CLIENT_ID,
       clientSecret: process.env.OAUTH_CLIENT_SECRET,
       scopes: ['read:data', 'write:data']
     }
   };
   ```

4. **Validate All Incoming Data**

   Always validate data before processing to prevent injection attacks and ensure data integrity.

   ```typescript
   // Add validation to all pipelines
   pipeline.addValidator('security-validator', new SecurityValidator(logger));
   ```

5. **Implement Rate Limiting**

   Protect external systems from accidental denial of service by implementing rate limiting.

   ```typescript
   const rateLimitedConfig = {
     connectionParams: {
       // ...other params...
       rateLimit: {
         maxRequestsPerMinute: 60,
         burstSize: 10
       }
     }
   };
   ```

### Performance Optimization

1. **Use Batching for High-Frequency Data**

   For high-frequency data sources, use batching to reduce network overhead.

   ```typescript
   const batchConfig = {
     connectionParams: {
       // ...other params...
       batchProcessing: {
         enabled: true,
         maxBatchSize: 100,
         flushInterval: 1000 // ms
       }
     }
   };
   ```

2. **Implement Filtering at Source**

   When possible, filter data at the source to reduce unnecessary data transfer.

   ```typescript
   // MQTT topic filtering
   await integrationManager.receiveData(
     'production-line-mqtt',
     dataHandler,
     {
       topic: 'factory/sensors/temperature/+/data',
       // Only receive data from specific sensors
       filter: 'data.payload.temperature > 50'
     }
   );
   
   // OPC UA value filtering
   await integrationManager.receiveData(
     'cnc-machine-opcua',
     dataHandler,
     {
       nodeId: 'ns=2;s=Machine1.Status',
       samplingInterval: 1000,
       filter: {
         deadbandType: 'percent',
         deadbandValue: 1.0 // Only send updates when value changes by 1%
       }
     }
   );
   ```

3. **Optimize Transformer Performance**

   Transformers can be performance bottlenecks. Optimize them for speed.

   ```typescript
   class OptimizedJsonTransformer implements DataTransformer {
     // Cache compiled mapping functions for better performance
     private mappingFunctions: Map<string, Function> = new Map();
     
     constructor() {
       // Pre-compile common mappings
       this.compileMappings();
     }
     
     private compileMappings(): void {
       // Compile and cache mapping functions
       // ...
     }
     
     async transformInbound(data: unknown, options?: Record<string, unknown>): Promise<TransformationResult> {
       // Use compiled mapping functions for better performance
       // ...
     }
   }
   ```

4. **Use Connection Pooling**

   For database or REST API adapters, implement connection pooling.

   ```typescript
   const pooledDbConfig = {
     connectionParams: {
       // ...other params...
       pool: {
         min: 2,
         max: 10,
         idleTimeoutMillis: 30000
       }
     }
   };
   ```

5. **Implement Caching Where Appropriate**

   Cache data that doesn't change frequently to reduce load on external systems.

   ```typescript
   // Create a cached REST adapter
   class CachedRestAdapter extends RestApiAdapter {
     private cache: Map<string, { data: any, timestamp: number }> = new Map();
     private cacheTTL: number;
     
     constructor(config: IntegrationConfig, transformer: DataTransformer, validator: DataValidator, logger: LoggerService) {
       super(config, transformer, validator, logger);
       this.cacheTTL = config.connectionParams.cacheTTL || 60000; // Default 1 minute
     }
     
     async fetchData(url: string, options?: Record<string, unknown>): Promise<any> {
       const cacheKey = url + JSON.stringify(options);
       const cachedItem = this.cache.get(cacheKey);
       
       // Return cached data if it exists and is not expired
       if (cachedItem && (Date.now() - cachedItem.timestamp) < this.cacheTTL) {
         this.logger.debug(`Using cached data for ${url}`);
         return cachedItem.data;
       }
       
       // Fetch fresh data
       const data = await super.fetchData(url, options);
       
       // Cache the result
       this.cache.set(cacheKey, {
         data,
         timestamp: Date.now()
       });
       
       return data;
     }
   }
   ```

### Testing Integrations

1. **Create Mock External Systems**

   Use mock servers to simulate external systems during development and testing.

   ```typescript
   // Create a mock MQTT broker for testing
   const aedes = require('aedes')();
   const server = require('net').createServer(aedes.handle);
   server.listen(1883, () => {
     console.log('Mock MQTT broker running on port 1883');
   });
   
   // Publish test data
   aedes.publish({
     topic: 'factory/sensors/temperature/sensor1/data',
     payload: Buffer.from(JSON.stringify({
       sensor_id: 'sensor1',
       reading_time: new Date().toISOString(),
       temp_c: 75.5,
       humidity_pct: 45.2
     }))
   });
   ```

2. **Create Integration Test Suites**

   Develop comprehensive test suites for each integration adapter.

   ```typescript
   describe('MQTT Adapter Tests', () => {
     let mockBroker;
     let integrationManager;
     let adapter;
     
     beforeAll(async () => {
       // Start mock broker
       mockBroker = setupMockMqttBroker();
       
       // Initialize integration manager
       integrationManager = new IntegrationManager(testLogger, testConfig, testEventBus, testEventProducer);
       await integrationManager.initialize({});
       
       // Register and connect adapter
       adapter = await integrationManager.registerIntegrationConfig(mqttTestConfig);
       await integrationManager.connect(adapter.id);
     });
     
     afterAll(async () => {
       // Clean up
       await integrationManager.disconnect(adapter.id);
       await integrationManager.deregisterAdapter(adapter.id);
       mockBroker.close();
     });
     
     test('Should connect to MQTT broker', async () => {
       expect(adapter.connectionStatus).toBe(ConnectionStatus.CONNECTED);
     });
     
     test('Should receive data from subscribed topic', async () => {
       // Set up a promise to resolve when data is received
       const dataReceived = new Promise(resolve => {
         integrationManager.receiveData(
           adapter.id,
           data => {
             expect(data.payload.temp_c).toBe(75.5);
             resolve(data);
           },
           { topic: 'factory/sensors/temperature/+/data' }
         );
       });
       
       // Publish test data to the mock broker
       mockBroker.publish({
         topic: 'factory/sensors/temperature/sensor1/data',
         payload: Buffer.from(JSON.stringify({
           sensor_id: 'sensor1',
           reading_time: new Date().toISOString(),
           temp_c: 75.5,
           humidity_pct: 45.2
         }))
       });
       
       // Wait for data to be received
       await dataReceived;
     });
     
     // More tests...
   });
   ```

3. **Test Error Handling**

   Verify that error handling mechanisms work correctly.

   ```typescript
   test('Should handle connection failures gracefully', async () => {
     // Stop the mock broker to simulate a connection failure
     mockBroker.close();
     
     // Wait for connection status to change
     await waitForCondition(() => adapter.connectionStatus === ConnectionStatus.ERROR);
     
     // Verify error is logged
     expect(testLogger.error).toHaveBeenCalled();
     
     // Restart the mock broker
     mockBroker = setupMockMqttBroker();
     
     // Test reconnection
     await integrationManager.reconnect(adapter.id);
     expect(adapter.connectionStatus).toBe(ConnectionStatus.CONNECTED);
   });
   ```

4. **Validate Data Transformations**

   Test data transformers with various input formats.

   ```typescript
   test('Should transform JSON data correctly', async () => {
     const transformer = new JsonTransformer();
     
     const inputData = {
       sensor_id: 'sensor1',
       reading_time: '2023-01-15T12:34:56Z',
       temp_c: 75.5,
       humidity_pct: 45.2
     };
     
     const result = await transformer.transformInbound(inputData);
     
     expect(result.success).toBe(true);
     expect(result.data).toBeDefined();
     expect(result.data.source).toBe('sensor1');
     expect(result.data.timestamp).toBeInstanceOf(Date);
     expect(result.data.payload.temperature).toBe(75.5);
     expect(result.data.payload.humidity).toBe(45.2);
   });
   ```

5. **Load Testing**

   Test the system under high load to ensure it can handle production volumes.

   ```typescript
   test('Should handle high message volume', async () => {
     // Configure test parameters
     const messageCount = 10000;
     const concurrency = 100;
     const startTime = Date.now();
     
     // Send messages in parallel
     const promises = Array.from({ length: messageCount }).map((_, i) => 
       integrationManager.sendData(
         adapter.id,
         {
           id: `test-${i}`,
           source: 'load-test',
           timestamp: new Date(),
           payload: { value: i, testData: 'load test' }
         }
       )
     );
     
     // Wait for all messages to be sent
     await Promise.all(promises);
     
     // Calculate throughput
     const duration = (Date.now() - startTime) / 1000; // seconds
     const throughput = messageCount / duration;
     
     console.log(`Sent ${messageCount} messages in ${duration.toFixed(2)}s (${throughput.toFixed(2)} msgs/sec)`);
     
     // Assert minimum throughput
     expect(throughput).toBeGreaterThan(500); // Adjust based on your requirements
   });
   ```

### Deployment Considerations

1. **Environment-Specific Configurations**

   Use different configurations for development, testing, and production environments.

   ```typescript
   // Load environment-specific configuration
   const envConfig = require(`./config/${process.env.NODE_ENV || 'development'}.json`);
   
   // Override with environment variables
   const mqttConfig = {
     ...envConfig.integrations.mqtt,
     connectionParams: {
       ...envConfig.integrations.mqtt.connectionParams,
       brokerUrl: process.env.MQTT_BROKER_URL || envConfig.integrations.mqtt.connectionParams.brokerUrl
     },
     authParams: {
       username: process.env.MQTT_USERNAME || envConfig.integrations.mqtt.authParams.username,
       password: process.env.MQTT_PASSWORD || envConfig.integrations.mqtt.authParams.password
     }
   };
   ```

2. **Graceful Startup and Shutdown**

   Ensure clean startup and shutdown processes to avoid data loss.

   ```typescript
   // Graceful shutdown handling
   process.on('SIGTERM', async () => {
     console.log('Received SIGTERM, shutting down gracefully...');
     
     try {
       // Stop all pipelines
       const pipelines = integrationManager.getAllPipelines();
       for (const pipeline of pipelines) {
         await pipeline.stop();
       }
       
       // Disconnect all adapters
       const adapters = integrationManager.getAllAdapters();
       for (const adapter of adapters) {
         await integrationManager.disconnect(adapter.id);
       }
       
       // Shut down the integration manager
       await integrationManager.shutdown();
       
       console.log('Graceful shutdown complete');
       process.exit(0);
     } catch (error) {
       console.error('Error during shutdown:', error);
       process.exit(1);
     }
   });
   ```

3. **Monitoring Integration Health**

   Implement health checks and monitoring for production deployments.

   ```typescript
   // Create a health check endpoint for Kubernetes or other orchestration systems
   app.get('/health', async (req, res) => {
     try {
       const health = await integrationManager.getHealth();
       
       // Determine overall health status
       const isHealthy = health.status !== ServiceStatus.ERROR &&
                        health.dependencies.filter(d => d.status === ServiceStatus.ERROR).length === 0;
       
       if (isHealthy) {
         res.status(200).json(health);
       } else {
         res.status(503).json(health);
       }
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

4. **Logging and Observability**

   Implement comprehensive logging and observability for production systems.

   ```typescript
   // Set up structured logging
   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     defaultMeta: { service: 'integration-framework' },
     transports: [
       new winston.transports.Console(),
       new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
       new winston.transports.File({ filename: 'logs/combined.log' })
     ]
   });
   
   // Configure metrics for Prometheus
   const integrationMetrics = {
     messagesProcessed: new prometheus.Counter({
       name: 'integration_messages_processed_total',
       help: 'Total number of messages processed',
       labelNames: ['adapter', 'status']
     }),
     processingTime: new prometheus.Histogram({
       name: 'integration_message_processing_seconds',
       help: 'Message processing time in seconds',
       labelNames: ['adapter', 'pipeline'],
       buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
     }),
     adapterStatus: new prometheus.Gauge({
       name: 'integration_adapter_status',
       help: 'Status of integration adapters (0=error, 1=disconnected, 2=connecting, 3=connected)',
       labelNames: ['adapter']
     })
   };
   
   // Update metrics when events occur
   eventBus.subscribe('integration.data.processed', (event) => {
     integrationMetrics.messagesProcessed.inc({ adapter: event.integrationId, status: 'success' });
     integrationMetrics.processingTime.observe(
       { adapter: event.integrationId, pipeline: event.pipelineId },
       event.processingTime / 1000 // Convert ms to seconds
     );
   });
   
   eventBus.subscribe('integration.adapter.health_changed', (event) => {
     const statusValue = {
       [ConnectionStatus.ERROR]: 0,
       [ConnectionStatus.DISCONNECTED]: 1,
       [ConnectionStatus.CONNECTING]: 2,
       [ConnectionStatus.CONNECTED]: 3
     }[event.status.connectionStatus] || 0;
     
     integrationMetrics.adapterStatus.set(
       { adapter: event.integrationId },
       statusValue
     );
   });
   ```

5. **Scalability Considerations**

   Plan for horizontal scaling in production deployments.

   ```typescript
   // Scale out horizontally by using a distributed event bus
   const redisEventBus = new RedisEventBus({
     host: process.env.REDIS_HOST || 'localhost',
     port: parseInt(process.env.REDIS_PORT || '6379'),
     prefix: 'integration-events:'
   });
   
   // Create the integration manager with the distributed event bus
   const integrationManager = new IntegrationManager(
     logger,
     configService,
     redisEventBus,
     new RedisEventProducer(redisEventBus)
   );
   ```

## Conclusion

The Integration Framework provides a robust foundation for connecting the Manufacturing Analytics Platform to external manufacturing systems. By following the guidelines and best practices outlined in this documentation, you can create reliable, secure, and high-performance integrations that bring valuable manufacturing data into the platform for analysis and optimization.

For additional support, refer to the code examples in the `examples` directory or contact the platform development team.