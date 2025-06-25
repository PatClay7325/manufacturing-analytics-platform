/**
 * Orchestrator Agent
 * Coordinates the execution of the manufacturing analysis pipeline
 */

import { BaseAgent } from './BaseAgent';
import { 
  IOrchestrator, 
  IAgent, 
  AgentType, 
  AgentStatus, 
  AgentContext, 
  PipelineResult, 
  PipelineStage,
  AgentResult,
  DataCollectionResult,
  QualityAnalysisResult,
  PerformanceAnalysisResult,
  MaintenancePredictionResult,
  RootCauseAnalysisResult,
  VisualizationConfig
} from './types';
import { CommunicationManager } from './CommunicationManager';
import { logger } from '@/lib/logger';

// Import all agents
import { DataCollectorAgent } from './agents/DataCollectorAgent';
import { QualityAnalyzerAgent } from './agents/QualityAnalyzerAgent';
import { PerformanceOptimizerAgent } from './agents/PerformanceOptimizerAgent';
import { MaintenancePredictorAgent } from './agents/MaintenancePredictorAgent';
import { RootCauseAnalyzerAgent } from './agents/RootCauseAnalyzerAgent';
import { VisualizationGeneratorAgent } from './agents/VisualizationGeneratorAgent';
import { ReportGeneratorAgent } from './agents/ReportGeneratorAgent';

export class OrchestratorAgent extends BaseAgent implements IOrchestrator {
  private agents: Map<AgentType, IAgent> = new Map();
  private communication: CommunicationManager;
  private currentStage: PipelineStage | null = null;
  private abortSignal: boolean = false;

  constructor() {
    super('orchestrator', {
      type: 'orchestrator',
      enabled: true,
      timeout: 120000, // 2 minutes for full pipeline
      retries: 1,
      priority: 0
    });

    this.communication = new CommunicationManager();
    this.initializeAgents();
  }

  /**
   * Initialize all agents
   */
  private initializeAgents(): void {
    // Create agent instances
    const agents: IAgent[] = [
      new DataCollectorAgent(),
      new QualityAnalyzerAgent(),
      new PerformanceOptimizerAgent(),
      new MaintenancePredictorAgent(),
      new RootCauseAnalyzerAgent(),
      new VisualizationGeneratorAgent(),
      new ReportGeneratorAgent()
    ];

    // Register agents
    agents.forEach(agent => {
      this.registerAgent(agent);
    });
  }

  /**
   * Register an agent in the pipeline
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.type, agent);
    
    // Set communication channel
    if ('setCommunication' in agent && typeof agent.setCommunication === 'function') {
      (agent as any).setCommunication(this.communication);
    }
    
    logger.info(`Registered agent: ${agent.type}`);
  }

  /**
   * Unregister an agent from the pipeline
   */
  unregisterAgent(agentType: AgentType): void {
    this.agents.delete(agentType);
    logger.info(`Unregistered agent: ${agentType}`);
  }

  /**
   * Execute the main orchestration logic
   */
  async execute(context: AgentContext): Promise<AgentResult<PipelineResult>> {
    this.logStart(context);
    this.abortSignal = false;
    
    const pipelineStartTime = new Date();
    const pipelineResult: PipelineResult = {
      sessionId: context.sessionId,
      query: context.query,
      startTime: pipelineStartTime,
      endTime: new Date(),
      totalExecutionTime: 0,
      stages: {},
      finalResult: {
        content: '',
        confidence: 0,
        visualizations: [],
        references: [],
        recommendations: []
      },
      errors: [],
      warnings: []
    };

    try {
      // Initialize all agents
      await this.initializeAllAgents();

      // Execute pipeline stages
      const stageResults = {
        dataCollection: await this.executeDataCollection(context, pipelineResult),
        analysis: await this.executeAnalysis(context, pipelineResult),
        visualization: await this.executeVisualization(context, pipelineResult),
        reporting: await this.executeReporting(context, pipelineResult)
      };

      // Compile final result
      this.compileFinalResult(pipelineResult, stageResults);

      // Calculate total execution time
      pipelineResult.endTime = new Date();
      pipelineResult.totalExecutionTime = 
        pipelineResult.endTime.getTime() - pipelineResult.startTime.getTime();

      const result = this.createResult(pipelineResult);
      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      pipelineResult.errors.push(error as Error);
      
      return this.createResult(
        pipelineResult,
        [error as Error]
      );
    } finally {
      // Shutdown all agents
      await this.shutdownAllAgents();
    }
  }

  /**
   * Initialize all agents
   */
  private async initializeAllAgents(): Promise<void> {
    const initPromises = Array.from(this.agents.values()).map(agent => 
      agent.initialize().catch(error => {
        logger.error(`Failed to initialize ${agent.type}:`, error);
        throw error;
      })
    );
    
    await Promise.all(initPromises);
    logger.info('All agents initialized successfully');
  }

  /**
   * Execute data collection stage
   */
  private async executeDataCollection(
    context: AgentContext, 
    pipelineResult: PipelineResult
  ): Promise<DataCollectionResult | null> {
    if (this.abortSignal) return null;
    
    this.currentStage = 'data_collection';
    const stageStart = new Date();
    
    try {
      const dataCollector = this.agents.get('data_collector');
      if (!dataCollector) {
        throw new Error('Data collector agent not found');
      }

      const result = await dataCollector.execute(context);
      
      pipelineResult.stages.data_collection = {
        status: result.status,
        executionTime: result.executionTime || 0,
        agents: [result]
      };

      if (result.errors && result.errors.length > 0) {
        pipelineResult.errors.push(...result.errors);
      }

      return result.data;

    } catch (error) {
      logger.error('Data collection stage failed:', error);
      pipelineResult.stages.data_collection = {
        status: 'failed',
        executionTime: new Date().getTime() - stageStart.getTime(),
        agents: []
      };
      throw error;
    }
  }

  /**
   * Execute analysis stage
   */
  private async executeAnalysis(
    context: AgentContext, 
    pipelineResult: PipelineResult
  ): Promise<{
    quality?: QualityAnalysisResult;
    performance?: PerformanceAnalysisResult;
    maintenance?: MaintenancePredictionResult;
    rootCause?: RootCauseAnalysisResult;
  }> {
    if (this.abortSignal) return {};
    
    this.currentStage = 'analysis';
    const stageStart = new Date();
    const analysisResults: any = {};
    const agents: AgentResult[] = [];

    try {
      const dataCollectionResult = pipelineResult.stages.data_collection?.agents[0]?.data;
      if (!dataCollectionResult) {
        throw new Error('No data collection results available');
      }

      // Execute analysis agents in parallel where possible
      const analysisPromises: Promise<void>[] = [];

      // Quality Analysis
      const qualityAnalyzer = this.agents.get('quality_analyzer');
      if (qualityAnalyzer && qualityAnalyzer.config.enabled) {
        analysisPromises.push(
          qualityAnalyzer.execute(context, dataCollectionResult).then(result => {
            agents.push(result);
            if (result.status === 'completed') {
              analysisResults.quality = result.data;
            }
          })
        );
      }

      // Performance Analysis
      const performanceOptimizer = this.agents.get('performance_optimizer');
      if (performanceOptimizer && performanceOptimizer.config.enabled) {
        analysisPromises.push(
          performanceOptimizer.execute(context, dataCollectionResult).then(result => {
            agents.push(result);
            if (result.status === 'completed') {
              analysisResults.performance = result.data;
            }
          })
        );
      }

      // Maintenance Prediction
      const maintenancePredictor = this.agents.get('maintenance_predictor');
      if (maintenancePredictor && maintenancePredictor.config.enabled) {
        analysisPromises.push(
          maintenancePredictor.execute(context, dataCollectionResult).then(result => {
            agents.push(result);
            if (result.status === 'completed') {
              analysisResults.maintenance = result.data;
            }
          })
        );
      }

      // Wait for parallel analyses to complete
      await Promise.all(analysisPromises);

      // Root Cause Analysis (depends on other analyses)
      const rootCauseAnalyzer = this.agents.get('root_cause_analyzer');
      if (rootCauseAnalyzer && rootCauseAnalyzer.config.enabled) {
        const rootCauseResult = await rootCauseAnalyzer.execute(context, {
          collectionData: dataCollectionResult,
          qualityAnalysis: analysisResults.quality,
          performanceAnalysis: analysisResults.performance
        });
        
        agents.push(rootCauseResult);
        if (rootCauseResult.status === 'completed') {
          analysisResults.rootCause = rootCauseResult.data;
        }
      }

      pipelineResult.stages.analysis = {
        status: 'completed',
        executionTime: new Date().getTime() - stageStart.getTime(),
        agents
      };

      return analysisResults;

    } catch (error) {
      logger.error('Analysis stage failed:', error);
      pipelineResult.stages.analysis = {
        status: 'failed',
        executionTime: new Date().getTime() - stageStart.getTime(),
        agents
      };
      throw error;
    }
  }

  /**
   * Execute visualization stage
   */
  private async executeVisualization(
    context: AgentContext, 
    pipelineResult: PipelineResult
  ): Promise<VisualizationConfig[]> {
    if (this.abortSignal) return [];
    
    this.currentStage = 'visualization';
    const stageStart = new Date();

    try {
      const visualizationGenerator = this.agents.get('visualization_generator');
      if (!visualizationGenerator) {
        throw new Error('Visualization generator agent not found');
      }

      const analysisResults = pipelineResult.stages.analysis?.agents
        .filter(a => a.status === 'completed')
        .reduce((acc, agent) => {
          switch (agent.agentType) {
            case 'quality_analyzer':
              acc.quality = agent.data;
              break;
            case 'performance_optimizer':
              acc.performance = agent.data;
              break;
            case 'maintenance_predictor':
              acc.maintenance = agent.data;
              break;
            case 'root_cause_analyzer':
              acc.rootCause = agent.data;
              break;
          }
          return acc;
        }, {} as any);

      const result = await visualizationGenerator.execute(context, analysisResults);
      
      pipelineResult.stages.visualization = {
        status: result.status,
        executionTime: result.executionTime || 0,
        agents: [result]
      };

      return result.status === 'completed' ? result.data : [];

    } catch (error) {
      logger.error('Visualization stage failed:', error);
      pipelineResult.stages.visualization = {
        status: 'failed',
        executionTime: new Date().getTime() - stageStart.getTime(),
        agents: []
      };
      return [];
    }
  }

  /**
   * Execute reporting stage
   */
  private async executeReporting(
    context: AgentContext, 
    pipelineResult: PipelineResult
  ): Promise<{ content: string; format: string; metadata: any } | null> {
    if (this.abortSignal) return null;
    
    this.currentStage = 'reporting';
    const stageStart = new Date();

    try {
      const reportGenerator = this.agents.get('report_generator');
      if (!reportGenerator) {
        throw new Error('Report generator agent not found');
      }

      const visualizations = pipelineResult.stages.visualization?.agents[0]?.data || [];
      const analysisResults = this.compileAnalysisResults(pipelineResult);

      const result = await reportGenerator.execute(context, {
        analysisResults,
        visualizations
      });
      
      pipelineResult.stages.reporting = {
        status: result.status,
        executionTime: result.executionTime || 0,
        agents: [result]
      };

      return result.status === 'completed' ? result.data : null;

    } catch (error) {
      logger.error('Reporting stage failed:', error);
      pipelineResult.stages.reporting = {
        status: 'failed',
        executionTime: new Date().getTime() - stageStart.getTime(),
        agents: []
      };
      return null;
    }
  }

  /**
   * Compile analysis results from pipeline
   */
  private compileAnalysisResults(pipelineResult: PipelineResult): any {
    const results: any = {};
    
    // Add collection data
    if (pipelineResult.stages.data_collection?.agents[0]?.data) {
      results.collectionData = pipelineResult.stages.data_collection.agents[0].data;
    }

    // Add analysis results
    pipelineResult.stages.analysis?.agents.forEach(agent => {
      if (agent.status === 'completed') {
        switch (agent.agentType) {
          case 'quality_analyzer':
            results.quality = agent.data;
            break;
          case 'performance_optimizer':
            results.performance = agent.data;
            break;
          case 'maintenance_predictor':
            results.maintenance = agent.data;
            break;
          case 'root_cause_analyzer':
            results.rootCause = agent.data;
            break;
        }
      }
    });

    return results;
  }

  /**
   * Compile final pipeline result
   */
  private compileFinalResult(
    pipelineResult: PipelineResult, 
    stageResults: any
  ): void {
    // Get report content
    const reportData = stageResults.reporting;
    if (reportData) {
      pipelineResult.finalResult.content = reportData.content;
    }

    // Get visualizations
    const visualizations = stageResults.visualization || [];
    pipelineResult.finalResult.visualizations = visualizations;

    // Calculate overall confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    if (stageResults.dataCollection?.dataQuality) {
      const dq = stageResults.dataCollection.dataQuality;
      totalConfidence += (dq.completeness + dq.accuracy + dq.timeliness) / 3;
      confidenceCount++;
    }

    pipelineResult.finalResult.confidence = confidenceCount > 0 ? 
      Math.round((totalConfidence / confidenceCount) * 100) / 100 : 0.5;

    // Collect all recommendations
    const recommendations: string[] = [];
    
    if (stageResults.analysis?.quality?.recommendations) {
      recommendations.push(...stageResults.analysis.quality.recommendations);
    }
    
    if (stageResults.analysis?.performance?.improvements) {
      recommendations.push(...stageResults.analysis.performance.improvements
        .map((imp: any) => imp.opportunity));
    }
    
    if (stageResults.analysis?.rootCause?.recommendations) {
      recommendations.push(...stageResults.analysis.rootCause.recommendations
        .map((rec: any) => rec.action));
    }

    pipelineResult.finalResult.recommendations = recommendations;

    // Add references
    pipelineResult.finalResult.references = [
      {
        type: 'standard',
        id: 'iso-22400',
        title: 'ISO 22400-2:2014 Manufacturing Operations Management KPIs',
        url: 'https://www.iso.org/standard/56847.html'
      }
    ];
  }

  /**
   * Shutdown all agents
   */
  private async shutdownAllAgents(): Promise<void> {
    const shutdownPromises = Array.from(this.agents.values()).map(agent => 
      agent.shutdown().catch(error => {
        logger.error(`Failed to shutdown ${agent.type}:`, error);
      })
    );
    
    await Promise.all(shutdownPromises);
    logger.info('All agents shutdown successfully');
  }

  /**
   * Get the status of a specific agent
   */
  getAgentStatus(agentType: AgentType): AgentStatus {
    const agent = this.agents.get(agentType);
    return agent ? agent.getStatus() : 'idle';
  }

  /**
   * Get the current pipeline stage
   */
  getPipelineStatus(): PipelineStage | null {
    return this.currentStage;
  }

  /**
   * Abort the pipeline execution
   */
  async abort(): Promise<void> {
    logger.warn('Pipeline abort requested');
    this.abortSignal = true;
    this.currentStage = null;
    
    // Set all agents to idle
    this.agents.forEach(agent => {
      if (agent.status === 'processing') {
        agent.status = 'idle';
      }
    });
  }
}