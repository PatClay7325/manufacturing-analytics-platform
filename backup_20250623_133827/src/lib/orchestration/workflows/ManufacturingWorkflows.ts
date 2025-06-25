/**
 * Pre-defined manufacturing workflow definitions
 * Production-ready workflows for common manufacturing scenarios
 */

import { 
  WorkflowDefinition, 
  WorkflowPriority, 
  WorkflowStep 
} from '../types';

/**
 * Equipment Health Monitoring Workflow
 * Monitors equipment data → analyzes quality → checks compliance → generates alerts
 */
export const EQUIPMENT_HEALTH_MONITORING: WorkflowDefinition = {
  id: 'equipment-health-monitoring',
  name: 'Equipment Health Monitoring',
  description: 'Continuous monitoring of equipment health with automated quality analysis and compliance checking',
  version: '1.0.0',
  priority: WorkflowPriority.HIGH,
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: '*/5 * * * *', // Every 5 minutes
        filter: { equipmentType: 'cnc_machine' },
      },
    },
    {
      type: 'event',
      config: {
        eventType: 'equipment.data.received',
        filter: { source: 'opcua' },
      },
    },
  ],
  steps: [
    {
      id: 'collect-equipment-data',
      name: 'Collect Equipment Data',
      type: 'agent',
      config: {
        agentType: 'opc-reader',
        agentConfig: {
          operation: 'read',
          nodeIds: [
            'ns=2;s=Temperature',
            'ns=2;s=Vibration', 
            'ns=2;s=Power',
            'ns=2;s=Status',
            'ns=2;s=ProductionCount',
          ],
        },
      },
      timeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffType: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        multiplier: 2,
      },
    },
    {
      id: 'analyze-quality-metrics',
      name: 'Analyze Quality Metrics',
      type: 'agent',
      config: {
        agentType: 'quality-analyzer',
        agentConfig: {
          analysisType: 'statistical',
          thresholds: {
            temperature: { min: 18, max: 85 },
            vibration: { max: 2.0 },
            power: { min: 50, max: 200 },
          },
        },
      },
      dependencies: ['collect-equipment-data'],
      timeout: 20000,
    },
    {
      id: 'check-iso-compliance',
      name: 'Check ISO Compliance',
      type: 'agent',
      config: {
        agentType: 'iso-compliance',
        agentConfig: {
          standardId: 'ISO22400-2',
          generateReport: false,
        },
      },
      dependencies: ['analyze-quality-metrics'],
      timeout: 15000,
    },
    {
      id: 'generate-health-alerts',
      name: 'Generate Health Alerts',
      type: 'agent',
      config: {
        agentType: 'alert-generator',
      },
      dependencies: ['check-iso-compliance'],
      condition: {
        expression: 'data.alerts && data.alerts.length > 0',
      },
      timeout: 10000,
    },
  ],
  retryPolicy: {
    maxAttempts: 2,
    backoffType: 'linear',
    initialDelay: 5000,
  },
  timeout: 120000, // 2 minutes total
  metadata: {
    category: 'monitoring',
    tags: ['equipment', 'health', 'quality', 'compliance'],
    owner: 'operations-team',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Production Quality Analysis Workflow
 * Analyzes production data → identifies defects → performs root cause analysis → updates reports
 */
export const PRODUCTION_QUALITY_ANALYSIS: WorkflowDefinition = {
  id: 'production-quality-analysis',
  name: 'Production Quality Analysis',
  description: 'Comprehensive quality analysis of production data with automated defect detection and root cause analysis',
  version: '1.0.0',
  priority: WorkflowPriority.MEDIUM,
  triggers: [
    {
      type: 'event',
      config: {
        eventType: 'production.batch.completed',
      },
    },
    {
      type: 'schedule',
      config: {
        schedule: '0 */2 * * *', // Every 2 hours
      },
    },
  ],
  steps: [
    {
      id: 'collect-production-data',
      name: 'Collect Production Data',
      type: 'parallel',
      config: {
        parallelSteps: [
          {
            id: 'collect-mqtt-sensor-data',
            name: 'Collect MQTT Sensor Data',
            type: 'agent',
            config: {
              agentType: 'mqtt-processor',
              agentConfig: {
                operation: 'get-data',
                topic: 'manufacturing/sensors/+/quality',
                limit: 1000,
                since: '2h',
              },
            },
          },
          {
            id: 'collect-opcua-process-data',
            name: 'Collect OPC UA Process Data',
            type: 'agent',
            config: {
              agentType: 'opc-reader',
              agentConfig: {
                operation: 'read',
                nodeIds: [
                  'ns=2;s=ProcessParameters',
                  'ns=2;s=QualityMetrics',
                  'ns=2;s=DefectCounts',
                ],
              },
            },
          },
        ],
      },
      timeout: 45000,
    },
    {
      id: 'merge-data-sources',
      name: 'Merge Data Sources',
      type: 'transform',
      config: {
        transformer: 'merge-time-series',
        transformConfig: {
          timeField: 'timestamp',
          toleranceMs: 30000, // 30 second tolerance
        },
      },
      dependencies: ['collect-production-data'],
      timeout: 10000,
    },
    {
      id: 'perform-quality-analysis',
      name: 'Perform Quality Analysis',
      type: 'agent',
      config: {
        agentType: 'quality-analyzer',
        agentConfig: {
          analysisType: 'comprehensive',
          enableSPC: true,
          spcRules: ['rule1', 'rule2', 'rule3', 'rule4'],
          controlLimits: {
            autoCalculate: true,
            sigma: 3,
          },
        },
      },
      dependencies: ['merge-data-sources'],
      timeout: 60000,
    },
    {
      id: 'detect-anomalies',
      name: 'Detect Anomalies',
      type: 'agent',
      config: {
        agentType: 'quality-analyzer',
        agentConfig: {
          analysisType: 'anomaly-detection',
          algorithm: 'isolation-forest',
          sensitivity: 0.1,
        },
      },
      dependencies: ['perform-quality-analysis'],
      timeout: 30000,
    },
    {
      id: 'root-cause-analysis',
      name: 'Root Cause Analysis',
      type: 'agent',
      config: {
        agentType: 'intent-classifier',
        agentConfig: {
          context: 'root-cause-analysis',
          includeHistoricalData: true,
        },
      },
      dependencies: ['detect-anomalies'],
      condition: {
        expression: 'data.anomalies && data.anomalies.length > 0',
      },
      timeout: 45000,
    },
    {
      id: 'update-quality-report',
      name: 'Update Quality Report',
      type: 'webhook',
      config: {
        url: '${INTERNAL_API_URL}/api/reports/quality',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '${INTERNAL_API_KEY}',
        },
      },
      dependencies: ['root-cause-analysis'],
      timeout: 20000,
    },
  ],
  retryPolicy: {
    maxAttempts: 3,
    backoffType: 'exponential',
    initialDelay: 2000,
    maxDelay: 30000,
    multiplier: 2,
  },
  timeout: 300000, // 5 minutes total
  metadata: {
    category: 'quality',
    tags: ['production', 'quality', 'analysis', 'spc', 'anomaly-detection'],
    owner: 'quality-team',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Predictive Maintenance Workflow
 * Monitors equipment conditions → predicts failures → schedules maintenance → updates systems
 */
export const PREDICTIVE_MAINTENANCE: WorkflowDefinition = {
  id: 'predictive-maintenance',
  name: 'Predictive Maintenance',
  description: 'AI-powered predictive maintenance using equipment sensor data and historical patterns',
  version: '1.0.0',
  priority: WorkflowPriority.HIGH,
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: '0 6 * * *', // Daily at 6 AM
      },
    },
    {
      type: 'event',
      config: {
        eventType: 'sensor.threshold.exceeded',
        filter: { category: 'vibration|temperature|power' },
      },
    },
  ],
  steps: [
    {
      id: 'collect-sensor-history',
      name: 'Collect Sensor History',
      type: 'agent',
      config: {
        agentType: 'mqtt-processor',
        agentConfig: {
          operation: 'get-data',
          topic: 'manufacturing/sensors/+/condition',
          limit: 10000,
          since: '7d', // Last 7 days
        },
      },
      timeout: 60000,
    },
    {
      id: 'collect-maintenance-history',
      name: 'Collect Maintenance History',
      type: 'webhook',
      config: {
        url: '${INTERNAL_API_URL}/api/maintenance/history',
        method: 'GET',
        headers: {
          'X-API-Key': '${INTERNAL_API_KEY}',
        },
      },
      timeout: 30000,
    },
    {
      id: 'analyze-equipment-condition',
      name: 'Analyze Equipment Condition',
      type: 'agent',
      config: {
        agentType: 'equipment-monitor',
        agentConfig: {
          analysisType: 'trend-analysis',
          predictiveModel: 'lstm',
          predictionHorizon: '30d',
        },
      },
      dependencies: ['collect-sensor-history', 'collect-maintenance-history'],
      timeout: 120000,
    },
    {
      id: 'predict-failures',
      name: 'Predict Failures',
      type: 'agent',
      config: {
        agentType: 'intent-classifier',
        agentConfig: {
          context: 'failure-prediction',
          confidenceThreshold: 0.7,
        },
      },
      dependencies: ['analyze-equipment-condition'],
      timeout: 60000,
    },
    {
      id: 'calculate-maintenance-priority',
      name: 'Calculate Maintenance Priority',
      type: 'transform',
      config: {
        transformer: 'maintenance-priority-calculator',
        transformConfig: {
          factors: ['failure-probability', 'criticality', 'cost', 'availability'],
          weights: [0.4, 0.3, 0.2, 0.1],
        },
      },
      dependencies: ['predict-failures'],
      timeout: 15000,
    },
    {
      id: 'schedule-maintenance',
      name: 'Schedule Maintenance',
      type: 'webhook',
      config: {
        url: '${MAINTENANCE_SYSTEM_URL}/api/schedules',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${MAINTENANCE_TOKEN}',
        },
      },
      dependencies: ['calculate-maintenance-priority'],
      condition: {
        expression: 'data.priority && data.priority >= 7', // High priority threshold
      },
      timeout: 30000,
    },
    {
      id: 'generate-maintenance-alert',
      name: 'Generate Maintenance Alert',
      type: 'agent',
      config: {
        agentType: 'alert-generator',
        agentConfig: {
          alertType: 'PREDICTIVE_MAINTENANCE',
          severity: 'MEDIUM',
          recipients: ['maintenance-team', 'operations-manager'],
        },
      },
      dependencies: ['schedule-maintenance'],
      timeout: 10000,
    },
  ],
  retryPolicy: {
    maxAttempts: 2,
    backoffType: 'exponential',
    initialDelay: 5000,
    maxDelay: 60000,
    multiplier: 3,
  },
  timeout: 480000, // 8 minutes total
  metadata: {
    category: 'maintenance',
    tags: ['predictive', 'maintenance', 'ai', 'sensors', 'scheduling'],
    owner: 'maintenance-team',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Real-time Production Optimization Workflow
 * Monitors production KPIs → identifies bottlenecks → optimizes parameters → applies changes
 */
export const PRODUCTION_OPTIMIZATION: WorkflowDefinition = {
  id: 'production-optimization',
  name: 'Real-time Production Optimization',
  description: 'Continuous optimization of production parameters based on real-time KPI monitoring',
  version: '1.0.0',
  priority: WorkflowPriority.CRITICAL,
  triggers: [
    {
      type: 'event',
      config: {
        eventType: 'production.kpi.threshold',
        filter: { metric: 'oee|throughput|efficiency' },
      },
    },
    {
      type: 'schedule',
      config: {
        schedule: '*/15 * * * *', // Every 15 minutes
      },
    },
  ],
  steps: [
    {
      id: 'monitor-production-kpis',
      name: 'Monitor Production KPIs',
      type: 'agent',
      config: {
        agentType: 'equipment-monitor',
        agentConfig: {
          metrics: ['oee', 'availability', 'performance', 'quality', 'throughput'],
          realtime: true,
        },
      },
      timeout: 30000,
    },
    {
      id: 'identify-bottlenecks',
      name: 'Identify Bottlenecks',
      type: 'agent',
      config: {
        agentType: 'quality-analyzer',
        agentConfig: {
          analysisType: 'bottleneck-detection',
          algorithm: 'constraint-theory',
        },
      },
      dependencies: ['monitor-production-kpis'],
      timeout: 45000,
    },
    {
      id: 'calculate-optimization',
      name: 'Calculate Optimization',
      type: 'agent',
      config: {
        agentType: 'intent-classifier',
        agentConfig: {
          context: 'production-optimization',
          includeConstraints: true,
          optimizationGoal: 'maximize-oee',
        },
      },
      dependencies: ['identify-bottlenecks'],
      timeout: 60000,
    },
    {
      id: 'validate-optimization',
      name: 'Validate Optimization',
      type: 'agent',
      config: {
        agentType: 'iso-compliance',
        agentConfig: {
          standardId: 'ISO22400-2',
          validateChanges: true,
        },
      },
      dependencies: ['calculate-optimization'],
      timeout: 30000,
    },
    {
      id: 'apply-optimization',
      name: 'Apply Optimization',
      type: 'agent',
      config: {
        agentType: 'opc-reader',
        agentConfig: {
          operation: 'write',
          safetyChecks: true,
          confirmationRequired: true,
        },
      },
      dependencies: ['validate-optimization'],
      condition: {
        expression: 'data.compliance && data.compliance.status === "compliant"',
      },
      timeout: 45000,
    },
    {
      id: 'monitor-optimization-results',
      name: 'Monitor Optimization Results',
      type: 'delay',
      config: {
        duration: 300000, // Wait 5 minutes
      },
      dependencies: ['apply-optimization'],
    },
    {
      id: 'verify-improvement',
      name: 'Verify Improvement',
      type: 'agent',
      config: {
        agentType: 'equipment-monitor',
        agentConfig: {
          compareBaseline: true,
          improvementThreshold: 5, // 5% improvement required
        },
      },
      dependencies: ['monitor-optimization-results'],
      timeout: 30000,
    },
    {
      id: 'generate-optimization-report',
      name: 'Generate Optimization Report',
      type: 'webhook',
      config: {
        url: '${INTERNAL_API_URL}/api/reports/optimization',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '${INTERNAL_API_KEY}',
        },
      },
      dependencies: ['verify-improvement'],
      timeout: 20000,
    },
  ],
  retryPolicy: {
    maxAttempts: 1, // Critical workflow - minimal retries
    backoffType: 'fixed',
    initialDelay: 1000,
  },
  timeout: 600000, // 10 minutes total
  metadata: {
    category: 'optimization',
    tags: ['production', 'optimization', 'real-time', 'kpi', 'bottleneck'],
    owner: 'production-team',
    safety: {
      requiresApproval: true,
      maxImpact: 'medium',
      rollbackProcedure: 'automatic',
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * ISO Compliance Audit Workflow
 * Scheduled compliance checking → generates reports → identifies gaps → creates action plans
 */
export const ISO_COMPLIANCE_AUDIT: WorkflowDefinition = {
  id: 'iso-compliance-audit',
  name: 'ISO Compliance Audit',
  description: 'Automated ISO compliance auditing with gap analysis and action plan generation',
  version: '1.0.0',
  priority: WorkflowPriority.MEDIUM,
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: '0 9 1 * *', // First day of month at 9 AM
      },
    },
    {
      type: 'http',
      config: {
        endpoint: '/api/workflows/compliance-audit/trigger',
      },
    },
  ],
  steps: [
    {
      id: 'collect-audit-data',
      name: 'Collect Audit Data',
      type: 'parallel',
      config: {
        parallelSteps: [
          {
            id: 'collect-process-data',
            name: 'Collect Process Data',
            type: 'agent',
            config: {
              agentType: 'opc-reader',
              agentConfig: {
                operation: 'browse',
                includeHistorical: true,
                timeRange: '30d',
              },
            },
          },
          {
            id: 'collect-quality-records',
            name: 'Collect Quality Records',
            type: 'webhook',
            config: {
              url: '${QUALITY_SYSTEM_URL}/api/records',
              method: 'GET',
              headers: {
                'Authorization': 'Bearer ${QUALITY_TOKEN}',
              },
            },
          },
          {
            id: 'collect-maintenance-records',
            name: 'Collect Maintenance Records',
            type: 'webhook',
            config: {
              url: '${MAINTENANCE_SYSTEM_URL}/api/records',
              method: 'GET',
            },
          },
        ],
      },
      timeout: 120000,
    },
    {
      id: 'check-iso22400-compliance',
      name: 'Check ISO 22400 Compliance',
      type: 'agent',
      config: {
        agentType: 'iso-compliance',
        agentConfig: {
          standardId: 'ISO22400-2',
          generateReport: true,
          includeEvidence: true,
        },
      },
      dependencies: ['collect-audit-data'],
      timeout: 180000,
    },
    {
      id: 'check-iso9001-compliance',
      name: 'Check ISO 9001 Compliance',
      type: 'agent',
      config: {
        agentType: 'iso-compliance',
        agentConfig: {
          standardId: 'ISO9001',
          generateReport: true,
          includeEvidence: true,
        },
      },
      dependencies: ['collect-audit-data'],
      timeout: 180000,
    },
    {
      id: 'analyze-compliance-gaps',
      name: 'Analyze Compliance Gaps',
      type: 'agent',
      config: {
        agentType: 'intent-classifier',
        agentConfig: {
          context: 'compliance-gap-analysis',
          includePrioritization: true,
        },
      },
      dependencies: ['check-iso22400-compliance', 'check-iso9001-compliance'],
      timeout: 90000,
    },
    {
      id: 'generate-action-plan',
      name: 'Generate Action Plan',
      type: 'agent',
      config: {
        agentType: 'intent-classifier',
        agentConfig: {
          context: 'compliance-action-planning',
          includeTimelines: true,
          includeResources: true,
        },
      },
      dependencies: ['analyze-compliance-gaps'],
      timeout: 60000,
    },
    {
      id: 'create-audit-report',
      name: 'Create Audit Report',
      type: 'webhook',
      config: {
        url: '${DOCUMENT_SYSTEM_URL}/api/reports/compliance',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${DOCUMENT_TOKEN}',
        },
      },
      dependencies: ['generate-action-plan'],
      timeout: 45000,
    },
    {
      id: 'notify-stakeholders',
      name: 'Notify Stakeholders',
      type: 'agent',
      config: {
        agentType: 'alert-generator',
        agentConfig: {
          alertType: 'COMPLIANCE_AUDIT_COMPLETE',
          severity: 'MEDIUM',
          recipients: ['compliance-team', 'quality-manager', 'operations-director'],
          includeAttachments: true,
        },
      },
      dependencies: ['create-audit-report'],
      timeout: 15000,
    },
  ],
  retryPolicy: {
    maxAttempts: 2,
    backoffType: 'linear',
    initialDelay: 10000,
  },
  timeout: 1800000, // 30 minutes total
  metadata: {
    category: 'compliance',
    tags: ['iso', 'audit', 'compliance', 'quality', 'gap-analysis'],
    owner: 'compliance-team',
    confidentiality: 'internal',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Export all workflow definitions
 */
export const MANUFACTURING_WORKFLOWS = {
  EQUIPMENT_HEALTH_MONITORING,
  PRODUCTION_QUALITY_ANALYSIS,
  PREDICTIVE_MAINTENANCE,
  PRODUCTION_OPTIMIZATION,
  ISO_COMPLIANCE_AUDIT,
};

/**
 * Helper function to get all workflow definitions as array
 */
export function getAllWorkflowDefinitions(): WorkflowDefinition[] {
  return Object.values(MANUFACTURING_WORKFLOWS);
}