/**
 * Manufacturing Pipeline
 * Main entry point for the multi-agent manufacturing analysis system
 */

import { OrchestratorAgent } from './OrchestratorAgent';
import { ManufacturingEngineeringAgent } from '../ManufacturingEngineeringAgent';
import { 
  AgentContext, 
  PipelineResult, 
  AnalysisType,
  VisualizationType,
  AgentResponse 
} from './types';
import { logger } from '@/lib/logger';

export interface ManufacturingPipelineConfig {
  enableLegacyAgent?: boolean;
  timeout?: number;
  retries?: number;
  visualizationPreferences?: VisualizationType[];
  reportFormat?: 'detailed' | 'summary' | 'executive';
}

export class ManufacturingPipeline {
  private orchestrator: OrchestratorAgent;
  private legacyAgent?: ManufacturingEngineeringAgent;
  private config: ManufacturingPipelineConfig;

  constructor(config: ManufacturingPipelineConfig = {}) {
    this.config = {
      enableLegacyAgent: false,
      timeout: 120000, // 2 minutes
      retries: 1,
      reportFormat: 'detailed',
      ...config
    };

    this.orchestrator = new OrchestratorAgent();
    
    if (this.config.enableLegacyAgent) {
      this.legacyAgent = new ManufacturingEngineeringAgent();
    }
  }

  /**
   * Execute the manufacturing analysis pipeline
   */
  async execute(
    query: string, 
    options?: {
      userId?: string;
      tenantId?: string;
      timeRange?: { start: Date; end: Date };
      analysisType?: AnalysisType;
      sessionId?: string;
    }
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Create context
      const context = this.createContext(query, options);
      
      // Log pipeline execution start
      logger.info('Manufacturing pipeline execution started', {
        sessionId: context.sessionId,
        query: query.substring(0, 100),
        analysisType: context.analysisType
      });

      // Execute pipeline
      const result = await this.orchestrator.execute(context);
      
      if (result.status === 'failed' || result.errors?.length > 0) {
        throw new Error('Pipeline execution failed: ' + result.errors?.[0]?.message);
      }

      const pipelineResult = result.data;
      
      // Convert to AgentResponse format
      const response = this.convertToAgentResponse(pipelineResult, startTime);
      
      logger.info('Manufacturing pipeline execution completed', {
        sessionId: context.sessionId,
        executionTime: response.executionTime,
        dataPoints: response.dataPoints,
        confidence: response.confidence
      });

      return response;

    } catch (error) {
      logger.error('Manufacturing pipeline error:', error);
      
      // Fallback to legacy agent if enabled and pipeline fails
      if (this.config.enableLegacyAgent && this.legacyAgent) {
        logger.warn('Falling back to legacy agent');
        return await this.legacyAgent.execute(query, options);
      }

      // Return error response
      return {
        content: `I encountered an error analyzing your manufacturing data: ${error.message}. Please try again or contact support if the issue persists.`,
        confidence: 0,
        visualizations: [],
        references: [],
        analysisType: options.analysisType || 'oee_analysis',
        executionTime: Date.now() - startTime,
        dataPoints: 0
      };
    }
  }

  /**
   * Get pipeline status
   */
  async getStatus(): Promise<{
    currentStage: string | null;
    agents: Record<string, string>;
    queueStatus: Record<string, number>;
  }> {
    const currentStage = this.orchestrator.getPipelineStatus();
    
    const agents: Record<string, string> = {};
    const agentTypes = [
      'data_collector',
      'quality_analyzer',
      'performance_optimizer',
      'maintenance_predictor',
      'root_cause_analyzer',
      'visualization_generator',
      'report_generator'
    ] as const;

    agentTypes.forEach(type => {
      agents[type] = this.orchestrator.getAgentStatus(type);
    });

    // Get queue status from communication manager
    const queueStatus = {}; // Would need to expose this from orchestrator

    return {
      currentStage,
      agents,
      queueStatus
    };
  }

  /**
   * Abort pipeline execution
   */
  async abort(): Promise<void> {
    await this.orchestrator.abort();
  }

  /**
   * Create execution context
   */
  private createContext(query: string, options?: any): AgentContext {
    const now = new Date();
    const defaultTimeRange = {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: now
    };

    return {
      sessionId: options.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: options.userId,
      tenantId: options.tenantId,
      query,
      timeRange: options.timeRange || defaultTimeRange,
      analysisType: options.analysisType || this.classifyQuery(query),
      preferences: {
        visualizationTypes: this.config.visualizationPreferences,
        reportFormat: this.config.reportFormat,
        language: 'en'
      }
    };
  }

  /**
   * Classify query to determine analysis type
   */
  private classifyQuery(query: string): AnalysisType {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('oee') || queryLower.includes('overall equipment')) {
      return 'oee_analysis';
    } else if (queryLower.includes('downtime') || queryLower.includes('contributor')) {
      return 'downtime_analysis';
    } else if (queryLower.includes('quality') || queryLower.includes('defect')) {
      return 'quality_analysis';
    } else if (queryLower.includes('maintenance') || queryLower.includes('mtbf')) {
      return 'maintenance_analysis';
    } else if (queryLower.includes('production') || queryLower.includes('output')) {
      return 'production_analysis';
    } else if (queryLower.includes('root cause') || queryLower.includes('why')) {
      return 'root_cause_analysis';
    } else if (queryLower.includes('trend') || queryLower.includes('history')) {
      return 'performance_trending';
    }
    
    return 'oee_analysis'; // Default
  }

  /**
   * Convert pipeline result to agent response format
   */
  private convertToAgentResponse(
    pipelineResult: PipelineResult, 
    startTime: number
  ): AgentResponse {
    // Extract visualizations with proper typing
    const visualizations = pipelineResult.finalResult.visualizations.map(viz => ({
      chartType: viz.type as VisualizationType,
      chartId: viz.id,
      title: viz.title,
      description: viz.description,
      data: viz.data,
      config: {
        xAxisKey: viz.config.xAxisKey,
        yAxisKey: viz.config.yAxisKey,
        dataKey: viz.config.dataKeys?.[0],
        colors: Array.isArray(viz.config.colors) ? viz.config.colors : 
                Object.values(viz.config.colors || {}),
        width: viz.config.dimensions?.width,
        height: viz.config.dimensions?.height,
        margin: viz.config.margin
      }
    }));

    // Extract references
    const references = pipelineResult.finalResult.references.map(ref => ({
      type: ref.type as 'standard' | 'calculation' | 'benchmark' | 'recommendation',
      id: ref.id,
      title: ref.title,
      description: ref.description,
      url: ref.url
    }));

    // Calculate total data points
    let dataPoints = 0;
    Object.values(pipelineResult.stages).forEach(stage => {
      if (stage?.agents) {
        stage.agents.forEach(agent => {
          if (agent.agentType === 'data_collector' && agent.data) {
            const metrics = agent.data.metrics;
            dataPoints += (metrics.performance?.length || 0) +
                         (metrics.quality?.length || 0) +
                         (metrics.maintenance?.length || 0) +
                         (metrics.alerts?.length || 0);
          }
        });
      }
    });

    return {
      content: pipelineResult.finalResult.content || 'Analysis completed',
      confidence: pipelineResult.finalResult.confidence,
      visualizations,
      references,
      analysisType: this.extractAnalysisType(pipelineResult),
      executionTime: Date.now() - startTime,
      dataPoints
    };
  }

  /**
   * Extract analysis type from pipeline result
   */
  private extractAnalysisType(pipelineResult: PipelineResult): AnalysisType {
    // Try to determine from the content or stages
    const content = pipelineResult.finalResult.content.toLowerCase();
    
    if (content.includes('oee analysis')) return 'oee_analysis';
    if (content.includes('downtime analysis')) return 'downtime_analysis';
    if (content.includes('quality analysis')) return 'quality_analysis';
    if (content.includes('maintenance analysis')) return 'maintenance_analysis';
    if (content.includes('production analysis')) return 'production_analysis';
    if (content.includes('root cause analysis')) return 'root_cause_analysis';
    if (content.includes('performance trending')) return 'performance_trending';
    
    return 'oee_analysis'; // Default
  }
}

// Lazy initialization to avoid build-time issues
let _manufacturingPipeline: ManufacturingPipeline | null = null;

export const manufacturingPipeline = {
  execute: async (...args: Parameters<ManufacturingPipeline['execute']>) => {
    if (!_manufacturingPipeline) {
      _manufacturingPipeline = new ManufacturingPipeline({
        enableLegacyAgent: true, // Enable fallback to legacy agent
        reportFormat: 'detailed'
      });
    }
    return _manufacturingPipeline.execute(...args);
  }
};