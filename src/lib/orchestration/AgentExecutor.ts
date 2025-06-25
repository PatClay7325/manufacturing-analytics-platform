/**
 * Agent execution service for workflow orchestration
 * Coordinates different types of agents (AI, OPC UA, MQTT, etc.)
 */

import { logger } from '@/lib/logger';
import { IAgentExecutor, AgentExecutionRequest, AgentExecutionResponse, WorkflowError } from './types';
import { IntentClassifierAgentV2 } from '@/lib/agents/IntentClassifierAgentV2';
import { ISOComplianceEngine } from '@/lib/compliance/ISOComplianceEngine';
import { MemoryPrunerAgent } from '@/lib/agents/MemoryPrunerAgent';
import { CircuitBreakerFactory } from '@/lib/resilience/circuitBreaker';
import { 
  agentOperationDuration,
  agentOperationCounter,
  agentErrorCounter
} from '@/lib/observability/workflowMetrics';

// Import manufacturing integrations
import { OpcUaClient } from '@/lib/opcua/client/opcua-client';
import { MqttService } from '@/services/mqtt/MqttService';

export class AgentExecutor implements IAgentExecutor {
  private circuitBreaker;
  private opcuaClient?: OpcUaClient;
  private mqttService?: MqttService;
  private isInitialized = false;

  constructor() {
    this.circuitBreaker = CircuitBreakerFactory.getOrCreate('agent-executor', {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
    });
  }

  /**
   * Initialize agent connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize OPC UA client if configured
      if (process.env.OPCUA_ENDPOINT_URL) {
        this.opcuaClient = new OpcUaClient({
          endpointUrl: process.env.OPCUA_ENDPOINT_URL,
          securityMode: process.env.OPCUA_SECURITY_MODE as any || 'SignAndEncrypt',
          securityPolicy: process.env.OPCUA_SECURITY_POLICY as any || 'Basic256Sha256',
          applicationUri: 'urn:manufacturing-analytics:client',
          applicationName: 'Manufacturing AnalyticsPlatform',
          connectionStrategy: {
            maxRetryDelay: 30000,
            initialDelay: 1000,
            maxRetryCount: 5,
          },
        });

        await this.opcuaClient.connect();
        logger.info('OPC UA client initialized');
      }

      // Initialize MQTT service if configured
      if (process.env.MQTT_BROKER_URL) {
        this.mqttService = new MqttService({
          brokerUrl: process.env.MQTT_BROKER_URL,
          clientId: 'manufacturing-analytics-orchestrator',
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
          enableTLS: process.env.MQTT_ENABLE_TLS === 'true',
          topics: [], // Will be configured per request
          transformers: [],
          bufferConfig: {
            maxSize: 1000,
            flushInterval: 5000,
            enablePersistence: true,
          },
          deadLetterQueue: {
            enabled: true,
            maxRetries: 3,
            retryDelay: 5000,
          },
        });

        await this.mqttService.connect();
        logger.info('MQTT service initialized');
      }

      this.isInitialized = true;
      logger.info('Agent executor initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize agent executor');
      throw error;
    }
  }

  /**
   * Execute an agent with the given request
   */
  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const timer = agentOperationDuration.startTimer({ 
      agent: request.agentType, 
      operation: 'execute' 
    });

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.circuitBreaker.execute(async () => {
        return await this.executeAgent(request);
      });

      agentOperationCounter.inc({ 
        agent: request.agentType, 
        operation: 'execute', 
        status: 'success' 
      });

      logger.debug({
        agentType: request.agentType,
        traceId: request.context.traceId,
        duration: timer(),
      }, 'Agent execution completed');

      return {
        success: true,
        output: result,
        metadata: {
          agentType: request.agentType,
          executionTime: Date.now(),
          traceId: request.context.traceId,
        },
      };

    } catch (error) {
      agentErrorCounter.inc({ 
        agent: request.agentType, 
        error_type: 'execution_error' 
      });

      logger.error({
        error,
        agentType: request.agentType,
        traceId: request.context.traceId,
      }, 'Agent execution failed');

      const workflowError: WorkflowError = {
        code: 'AGENT_EXECUTION_ERROR',
        message: `Agent ${request.agentType} execution failed: ${error.message}`,
        details: error,
        retryable: this.isRetryableError(error),
      };

      return {
        success: false,
        error: workflowError,
      };
    } finally {
      timer();
    }
  }

  /**
   * Check if the executor is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && this.circuitBreaker.getState().state !== 'OPEN';
  }

  /**
   * Get executor metrics
   */
  getMetrics(): Record<string, number> {
    const circuitBreakerState = this.circuitBreaker.getState();
    
    return {
      isHealthy: this.isHealthy() ? 1 : 0,
      circuitBreakerFailures: circuitBreakerState.failureCount,
      circuitBreakerState: circuitBreakerState.state === 'CLOSED' ? 0 : 
                           circuitBreakerState.state === 'HALF_OPEN' ? 1 : 2,
      opcuaConnected: this.opcuaClient?.isConnected() ? 1 : 0,
      mqttConnected: this.mqttService?.isConnected() ? 1 : 0,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.opcuaClient) {
        await this.opcuaClient.disconnect();
        logger.info('OPC UA client disconnected');
      }

      if (this.mqttService) {
        await this.mqttService.disconnect();
        logger.info('MQTT service disconnected');
      }

      this.isInitialized = false;
      logger.info('Agent executor shutdown completed');
    } catch (error) {
      logger.error({ error }, 'Error during agent executor shutdown');
    }
  }

  private async executeAgent(request: AgentExecutionRequest): Promise<any> {
    switch (request.agentType) {
      case 'intent-classifier':
        return await this.executeIntentClassifier(request);

      case 'iso-compliance':
        return await this.executeISOCompliance(request);

      case 'memory-pruner':
        return await this.executeMemoryPruner(request);

      case 'opc-reader':
        return await this.executeOpcReader(request);

      case 'mqtt-processor':
        return await this.executeMqttProcessor(request);

      case 'quality-analyzer':
        return await this.executeQualityAnalyzer(request);

      case 'equipment-monitor':
        return await this.executeEquipmentMonitor(request);

      case 'alert-generator':
        return await this.executeAlertGenerator(request);

      default:
        throw new Error(`Unknown agent type: ${request.agentType}`);
    }
  }

  private async executeIntentClassifier(request: AgentExecutionRequest): Promise<any> {
    const agent = IntentClassifierAgentV2.getInstance();
    await agent.initialize();

    const classificationInput = {
      sessionId: request.context.sessionId || 'workflow-session',
      userId: request.context.userId,
      input: typeof request.input === 'string' ? request.input : JSON.stringify(request.input),
      ...request.config,
    };

    return await agent.classify(classificationInput);
  }

  private async executeISOCompliance(request: AgentExecutionRequest): Promise<any> {
    const engine = new ISOComplianceEngine();
    
    const { standardId, context, generateReport } = request.config || {};
    
    if (generateReport) {
      const standards = Array.isArray(standardId) ? standardId : [standardId || 'ISO22400-2'];
      return await engine.generateComplianceReport(standards, {
        ...context,
        ...request.input,
        workflowContext: request.context,
      });
    } else {
      return await engine.checkCompliance(standardId || 'ISO22400-2', {
        ...request.input,
        workflowContext: request.context,
      });
    }
  }

  private async executeMemoryPruner(request: AgentExecutionRequest): Promise<any> {
    const agent = MemoryPrunerAgent.getInstance();
    
    const pruneConfig = {
      retentionDays: 30,
      batchSize: 100,
      pruneSessionMemory: true,
      pruneAuditTrail: true,
      pruneMetrics: false,
      ...request.config,
    };

    return await agent.prune(pruneConfig);
  }

  private async executeOpcReader(request: AgentExecutionRequest): Promise<any> {
    if (!this.opcuaClient) {
      throw new Error('OPC UA client not initialized');
    }

    const { equipmentId, nodeIds, operation } = request.config || {};
    const equipment = equipmentId || request.context.equipmentId;

    if (!equipment) {
      throw new Error('Equipment ID required for OPC UA operations');
    }

    switch (operation) {
      case 'read':
        if (!nodeIds || nodeIds.length === 0) {
          throw new Error('Node IDs required for read operation');
        }
        return await this.opcuaClient.readValues(equipment, nodeIds);

      case 'subscribe':
        const subscriptionConfig = {
          samplingInterval: 1000,
          queueSize: 100,
          discardOldest: true,
          ...request.config?.subscriptionConfig,
        };
        return await this.opcuaClient.subscribeToNodes(equipment, nodeIds, subscriptionConfig);

      case 'browse':
        const browseConfig = {
          maxDepth: 3,
          includeSubtypes: true,
          ...request.config?.browseConfig,
        };
        return await this.opcuaClient.browseEquipment(equipment, browseConfig);

      default:
        throw new Error(`Unknown OPC UA operation: ${operation}`);
    }
  }

  private async executeMqttProcessor(request: AgentExecutionRequest): Promise<any> {
    if (!this.mqttService) {
      throw new Error('MQTT service not initialized');
    }

    const { topic, operation, message, subscriptionConfig } = request.config || {};

    switch (operation) {
      case 'publish':
        if (!topic || !message) {
          throw new Error('Topic and message required for publish operation');
        }
        return await this.mqttService.publish(topic, message);

      case 'subscribe':
        if (!topic) {
          throw new Error('Topic required for subscribe operation');
        }
        
        // Add topic to service configuration
        await this.mqttService.addTopicSubscription({
          pattern: topic,
          qos: subscriptionConfig.qos || 1,
          transformer: subscriptionConfig.transformer || 'json',
          enabled: true,
        });
        
        return { subscribed: true, topic };

      case 'get-data':
        // Get recent data from the topic
        const topicPattern = topic || request.input?.topic;
        if (!topicPattern) {
          throw new Error('Topic pattern required for get-data operation');
        }
        
        // This would typically return buffered data
        return await this.mqttService.getTopicData(topicPattern, {
          limit: request.config?.limit || 100,
          since: request.config?.since,
        });

      default:
        throw new Error(`Unknown MQTT operation: ${operation}`);
    }
  }

  private async executeQualityAnalyzer(request: AgentExecutionRequest): Promise<any> {
    // Implementation for quality analysis
    // This would analyze manufacturing data for quality metrics
    const { data, analysisType, thresholds } = request.input || {};
    
    if (!data) {
      throw new Error('Data required for quality analysis');
    }

    const analysis = {
      timestamp: new Date(),
      analysisType: analysisType || 'statistical',
      results: [],
      summary: {},
      alerts: [],
    };

    // Perform statistical analysis
    if (Array.isArray(data)) {
      const values = data.map(d => typeof d === 'number' ? d : d.value).filter(v => v != null);
      
      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        analysis.summary = {
          count: values.length,
          mean: Math.round(mean * 1000) / 1000,
          stdDev: Math.round(stdDev * 1000) / 1000,
          min: Math.min(...values),
          max: Math.max(...values),
        };

        // Check against thresholds
        if (thresholds) {
          if (thresholds.upperLimit && mean > thresholds.upperLimit) {
            analysis.alerts.push({
              type: 'UPPER_LIMIT_EXCEEDED',
              message: `Mean value ${mean} exceeds upper limit ${thresholds.upperLimit}`,
              severity: 'HIGH',
            });
          }
          
          if (thresholds.lowerLimit && mean < thresholds.lowerLimit) {
            analysis.alerts.push({
              type: 'LOWER_LIMIT_EXCEEDED',
              message: `Mean value ${mean} below lower limit ${thresholds.lowerLimit}`,
              severity: 'HIGH',
            });
          }
        }
      }
    }

    return analysis;
  }

  private async executeEquipmentMonitor(request: AgentExecutionRequest): Promise<any> {
    // Implementation for equipment monitoring
    const { equipmentId, metrics, duration } = request.config || {};
    const equipment = equipmentId || request.context.equipmentId;

    if (!equipment) {
      throw new Error('Equipment ID required for monitoring');
    }

    // This would typically collect real-time data from equipment
    const monitoringData = {
      equipmentId: equipment,
      timestamp: new Date(),
      status: 'operational',
      metrics: {
        availability: 95.5,
        performance: 87.2,
        quality: 98.1,
        oee: 81.7,
        temperature: 72.5,
        vibration: 0.8,
        power: 125.3,
      },
      alerts: [],
      duration: duration || 60000, // 1 minute default
    };

    // Check for alerts based on metrics
    if (monitoringData.metrics.temperature > 85) {
      monitoringData.alerts.push({
        type: 'HIGH_TEMPERATURE',
        message: `Equipment temperature ${monitoringData.metrics.temperature}°C exceeds threshold`,
        severity: 'HIGH',
        timestamp: new Date(),
      });
    }

    if (monitoringData.metrics.oee < 75) {
      monitoringData.alerts.push({
        type: 'LOW_OEE',
        message: `OEE ${monitoringData.metrics.oee}% below target`,
        severity: 'MEDIUM',
        timestamp: new Date(),
      });
    }

    return monitoringData;
  }

  private async executeAlertGenerator(request: AgentExecutionRequest): Promise<any> {
    // Implementation for alert generation
    const { alertType, severity, message, data, recipients } = request.input || {};

    const alert = {
      id: `alert-${Date.now()}`,
      type: alertType || 'GENERAL',
      severity: severity || 'MEDIUM',
      message: message || 'Alert generated by workflow',
      timestamp: new Date(),
      data: data || request.input,
      context: request.context,
      recipients: recipients || ['operations-team'],
      status: 'ACTIVE',
    };

    // Here you would typically:
    // 1. Store the alert in database
    // 2. Send notifications to recipients
    // 3. Trigger escalation workflows if needed

    logger.info({
      alertId: alert.id,
      alertType: alert.type,
      severity: alert.severity,
      equipmentId: request.context.equipmentId,
      traceId: request.context.traceId,
    }, 'Alert generated by workflow');

    return alert;
  }

  private isRetryableError(error: any): boolean {
    // Determine if the error is retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    if (error.message?.includes('timeout') || error.message?.includes('connection')) {
      return true;
    }
    
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }
    
    return false;
  }
}