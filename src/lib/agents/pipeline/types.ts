/**
 * Manufacturing Agent Pipeline Types
 * Defines interfaces and types for the multi-agent manufacturing analytics system
 */

import { AnalysisType, VisualizationType } from '../ManufacturingEngineeringAgent';

// Agent Types
export type AgentType = 
  | 'data_collector'
  | 'quality_analyzer'
  | 'performance_optimizer'
  | 'maintenance_predictor'
  | 'root_cause_analyzer'
  | 'visualization_generator'
  | 'report_generator'
  | 'orchestrator';

// Pipeline Stages
export type PipelineStage = 
  | 'data_collection'
  | 'data_validation'
  | 'analysis'
  | 'optimization'
  | 'visualization'
  | 'reporting';

// Agent Status
export type AgentStatus = 'idle' | 'processing' | 'completed' | 'failed';

// Base Agent Message Interface
export interface AgentMessage {
  id: string;
  timestamp: Date;
  fromAgent: AgentType;
  toAgent?: AgentType;
  stage: PipelineStage;
  type: 'request' | 'response' | 'error' | 'status';
  content: any;
  metadata?: Record<string, any>;
}

// Agent Context Interface
export interface AgentContext {
  sessionId: string;
  userId?: string;
  tenantId?: string;
  query: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  analysisType: AnalysisType;
  preferences?: {
    visualizationTypes?: VisualizationType[];
    reportFormat?: 'detailed' | 'summary' | 'executive';
    language?: string;
  };
  metadata?: Record<string, any>;
}

// Agent Result Interface
export interface AgentResult<T = any> {
  agentType: AgentType;
  status: AgentStatus;
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  data: T;
  errors?: Error[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

// Pipeline Result Interface
export interface PipelineResult {
  sessionId: string;
  query: string;
  startTime: Date;
  endTime: Date;
  totalExecutionTime: number;
  stages: {
    [key in PipelineStage]?: {
      status: AgentStatus;
      executionTime: number;
      agents: AgentResult[];
    };
  };
  finalResult: {
    content: string;
    confidence: number;
    visualizations: any[];
    references: any[];
    recommendations: string[];
  };
  errors: Error[];
  warnings: string[];
}

// Data Collection Result
export interface DataCollectionResult {
  metrics: {
    performance: any[];
    quality: any[];
    maintenance: any[];
    alerts: any[];
  };
  equipment: any[];
  timeRange: {
    start: Date;
    end: Date;
  };
  dataQuality: {
    completeness: number;
    accuracy: number;
    timeliness: number;
  };
}

// Quality Analysis Result
export interface QualityAnalysisResult {
  overallQualityRate: number;
  defectRate: number;
  scrapRate: number;
  reworkRate: number;
  qualityTrends: {
    timestamp: Date;
    qualityRate: number;
    defects: number;
  }[];
  parameterAnalysis: {
    parameter: string;
    conformanceRate: number;
    outOfSpecCount: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  recommendations: string[];
}

// Performance Analysis Result
export interface PerformanceAnalysisResult {
  oee: {
    overall: number;
    availability: number;
    performance: number;
    quality: number;
  };
  productivity: {
    actualOutput: number;
    targetOutput: number;
    efficiency: number;
  };
  bottlenecks: {
    equipment: string;
    impact: number;
    type: string;
  }[];
  improvements: {
    opportunity: string;
    potentialGain: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}

// Maintenance Prediction Result
export interface MaintenancePredictionResult {
  predictions: {
    equipmentId: string;
    equipmentName: string;
    failureProbability: number;
    estimatedTimeToFailure: number;
    recommendedAction: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }[];
  maintenanceSchedule: {
    equipmentId: string;
    scheduledDate: Date;
    type: 'preventive' | 'predictive' | 'corrective';
    estimatedDuration: number;
  }[];
  costAnalysis: {
    currentCost: number;
    projectedCost: number;
    savings: number;
  };
}

// Root Cause Analysis Result
export interface RootCauseAnalysisResult {
  problem: string;
  rootCauses: {
    cause: string;
    category: 'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment';
    probability: number;
    evidence: string[];
  }[];
  fishboneDiagram: {
    categories: Record<string, string[]>;
  };
  recommendations: {
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    priority: number;
  }[];
}

// Visualization Configuration
export interface VisualizationConfig {
  id: string;
  type: VisualizationType;
  title: string;
  description: string;
  data: any[];
  config: {
    xAxisKey?: string;
    yAxisKey?: string;
    dataKeys?: string[];
    colors?: string[];
    dimensions?: {
      width: number;
      height: number;
    };
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    annotations?: any[];
    thresholds?: any[];
  };
}

// Report Configuration
export interface ReportConfig {
  format: 'detailed' | 'summary' | 'executive';
  sections: {
    executive?: boolean;
    analysis?: boolean;
    visualizations?: boolean;
    recommendations?: boolean;
    appendix?: boolean;
  };
  branding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
}

// Agent Configuration
export interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  timeout?: number;
  retries?: number;
  priority?: number;
  dependencies?: AgentType[];
  config?: Record<string, any>;
}

// Pipeline Configuration
export interface PipelineConfig {
  name: string;
  description: string;
  stages: {
    [key in PipelineStage]?: {
      enabled: boolean;
      agents: AgentConfig[];
      timeout?: number;
      parallel?: boolean;
    };
  };
  errorHandling?: {
    retryAttempts?: number;
    fallbackBehavior?: 'continue' | 'abort' | 'partial';
  };
}

// Agent Communication Interface
export interface AgentCommunication {
  send(message: AgentMessage): Promise<void>;
  receive(agentType: AgentType): Promise<AgentMessage[]>;
  broadcast(message: AgentMessage): Promise<void>;
  subscribe(agentType: AgentType, callback: (message: AgentMessage) => void): void;
  unsubscribe(agentType: AgentType): void;
}

// Base Agent Interface
export interface IAgent {
  type: AgentType;
  status: AgentStatus;
  config: AgentConfig;
  
  initialize(): Promise<void>;
  execute(context: AgentContext, data?: any): Promise<AgentResult>;
  validate(data: any): boolean;
  handleError(error: Error): void;
  getStatus(): AgentStatus;
  shutdown(): Promise<void>;
}

// Orchestrator Interface
export interface IOrchestrator {
  registerAgent(agent: IAgent): void;
  unregisterAgent(agentType: AgentType): void;
  executePipeline(context: AgentContext): Promise<PipelineResult>;
  getAgentStatus(agentType: AgentType): AgentStatus;
  getPipelineStatus(): PipelineStage | null;
  abort(): Promise<void>;
}