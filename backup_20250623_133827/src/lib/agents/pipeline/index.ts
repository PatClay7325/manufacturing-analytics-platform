/**
 * Manufacturing Agent Pipeline
 * Multi-agent system for advanced manufacturing analytics
 */

// Export main pipeline
export { ManufacturingPipeline, manufacturingPipeline } from './ManufacturingPipeline';

// Export types
export * from './types';

// Export agents (for advanced usage)
export { DataCollectorAgent } from './agents/DataCollectorAgent';
export { QualityAnalyzerAgent } from './agents/QualityAnalyzerAgent';
export { PerformanceOptimizerAgent } from './agents/PerformanceOptimizerAgent';
export { MaintenancePredictorAgent } from './agents/MaintenancePredictorAgent';
export { RootCauseAnalyzerAgent } from './agents/RootCauseAnalyzerAgent';
export { VisualizationGeneratorAgent } from './agents/VisualizationGeneratorAgent';
export { ReportGeneratorAgent } from './agents/ReportGeneratorAgent';

// Export orchestrator and communication (for advanced usage)
export { OrchestratorAgent } from './OrchestratorAgent';
export { CommunicationManager } from './CommunicationManager';
export { BaseAgent } from './BaseAgent';