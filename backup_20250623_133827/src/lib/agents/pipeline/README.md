# Manufacturing Agent Pipeline

A sophisticated multi-agent system for advanced manufacturing analytics, providing comprehensive analysis through specialized agents working in coordination.

## Overview

The Manufacturing Agent Pipeline is a modular, extensible system that breaks down complex manufacturing analysis tasks into specialized sub-agents, each focusing on specific aspects of manufacturing intelligence:

- **Data Collection**: Gathering and aggregating manufacturing data
- **Quality Analysis**: Analyzing defects, quality metrics, and trends
- **Performance Optimization**: OEE analysis, bottleneck identification, and productivity metrics
- **Maintenance Prediction**: Predictive maintenance and failure risk assessment
- **Root Cause Analysis**: Fishbone diagrams and systematic problem solving
- **Visualization Generation**: Creating insightful charts and dashboards
- **Report Generation**: Comprehensive reports with recommendations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Manufacturing Pipeline                     │
├─────────────────────────────────────────────────────────────┤
│                      Orchestrator Agent                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Communication Manager                    │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                         Agents                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Data         │  │Quality      │  │Performance  │        │
│  │Collector    │  │Analyzer     │  │Optimizer    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Maintenance  │  │Root Cause   │  │Visualization│        │
│  │Predictor    │  │Analyzer     │  │Generator    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                    ┌─────────────┐                          │
│                    │Report       │                          │
│                    │Generator    │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { manufacturingPipeline } from '@/lib/agents/pipeline';

// Simple query
const response = await manufacturingPipeline.execute(
  "What is the current OEE performance?"
);

console.log(response.content);
console.log('Confidence:', response.confidence);
console.log('Visualizations:', response.visualizations);
```

### Advanced Usage

```typescript
import { ManufacturingPipeline } from '@/lib/agents/pipeline';

// Create custom pipeline with specific configuration
const pipeline = new ManufacturingPipeline({
  enableLegacyAgent: false,
  timeout: 180000, // 3 minutes
  reportFormat: 'executive',
  visualizationPreferences: ['gauge_chart', 'pareto_chart']
});

// Execute with context
const response = await pipeline.execute(
  "Perform root cause analysis for quality issues",
  {
    userId: 'user123',
    tenantId: 'tenant456',
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    },
    analysisType: 'root_cause_analysis'
  }
);
```

## Agents

### Data Collector Agent
Collects and aggregates manufacturing data from various sources:
- Performance metrics
- Quality measurements  
- Maintenance records
- Equipment alerts
- Data quality assessment

### Quality Analyzer Agent
Analyzes quality metrics and patterns:
- Overall quality rate calculation
- Defect rate (DPMO) analysis
- Scrap and rework rate assessment
- Parameter conformance analysis
- Quality trend identification

### Performance Optimizer Agent  
Optimizes manufacturing performance:
- OEE calculation (Availability × Performance × Quality)
- Productivity analysis
- Bottleneck identification
- Improvement opportunity assessment

### Maintenance Predictor Agent
Predicts equipment failures and optimizes maintenance:
- Failure probability calculation
- Time to failure estimation
- Maintenance schedule generation
- Cost-benefit analysis

### Root Cause Analyzer Agent
Performs systematic root cause analysis:
- Problem identification
- Fishbone diagram generation (6M categories)
- Root cause probability assessment
- Prioritized recommendations

### Visualization Generator Agent
Creates data visualizations:
- Gauge charts for KPIs
- Pareto charts for prioritization
- Trend lines and area charts
- Scatter plots for correlations
- Fishbone diagrams

### Report Generator Agent
Generates comprehensive reports:
- Executive summaries
- Detailed analysis sections
- Visualization integration
- Recommendations and action items
- ISO standard compliance references

## Configuration

### Pipeline Configuration

```typescript
interface ManufacturingPipelineConfig {
  enableLegacyAgent?: boolean;      // Enable fallback to legacy agent
  timeout?: number;                  // Pipeline execution timeout (ms)
  retries?: number;                  // Number of retry attempts
  visualizationPreferences?: VisualizationType[];  // Preferred chart types
  reportFormat?: 'detailed' | 'summary' | 'executive';  // Report format
}
```

### Agent Configuration

Each agent can be configured individually:

```typescript
interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  timeout?: number;
  retries?: number;
  priority?: number;
  dependencies?: AgentType[];
  config?: Record<string, any>;
}
```

## Analysis Types

The pipeline supports various analysis types:

- `oee_analysis`: Overall Equipment Effectiveness analysis
- `downtime_analysis`: Downtime contributors and patterns
- `quality_analysis`: Quality metrics and defect analysis
- `maintenance_analysis`: Maintenance requirements and predictions
- `production_analysis`: Production rate and efficiency
- `root_cause_analysis`: Systematic problem analysis
- `performance_trending`: Historical performance trends

## Inter-Agent Communication

Agents communicate through a centralized Communication Manager:

```typescript
// Send message to specific agent
await this.sendMessage('visualization_generator', {
  type: 'quality_data',
  data: qualityAnalysis
});

// Broadcast to all agents
await this.communication.broadcast({
  type: 'status_update',
  content: { stage: 'analysis_complete' }
});

// Subscribe to messages
this.communication.subscribe('report_generator', (message) => {
  console.log('Received:', message);
});
```

## Error Handling

The pipeline includes comprehensive error handling:

- Agent-level error recovery
- Pipeline-level fallback mechanisms
- Legacy agent fallback option
- Detailed error reporting

## Performance Considerations

- Agents execute in parallel where possible
- Data collection is optimized with batch queries
- Communication is asynchronous
- Results are cached where appropriate

## Extending the Pipeline

### Creating a Custom Agent

```typescript
import { BaseAgent } from '@/lib/agents/pipeline';

export class CustomAgent extends BaseAgent {
  constructor() {
    super('custom_agent', {
      type: 'custom_agent',
      enabled: true,
      timeout: 30000
    });
  }

  async execute(context: AgentContext, data?: any): Promise<AgentResult> {
    this.logStart(context);
    
    try {
      // Your agent logic here
      const result = await this.performAnalysis(data);
      
      return this.createResult(result);
    } catch (error) {
      this.handleError(error as Error);
      return this.createResult(null, [error as Error]);
    }
  }
}
```

### Registering Custom Agent

```typescript
const orchestrator = new OrchestratorAgent();
const customAgent = new CustomAgent();

orchestrator.registerAgent(customAgent);
```

## Best Practices

1. **Query Clarity**: Provide clear, specific queries for better analysis
2. **Time Ranges**: Specify appropriate time ranges for data collection
3. **Analysis Type**: Explicitly set analysis type when known
4. **Error Handling**: Always handle pipeline errors gracefully
5. **Resource Management**: Monitor pipeline execution time and abort if needed

## Examples

See the `examples/usage-example.ts` file for comprehensive usage examples covering:
- Basic pipeline usage
- Advanced configuration
- Quality analysis
- Maintenance prediction
- Performance trending
- Pipeline monitoring
- Aborting execution
- Legacy agent usage

## ISO Standards Compliance

The pipeline follows these ISO standards:
- **ISO 22400-2:2014**: Manufacturing Operations Management KPIs
- **ISO 14224:2016**: Reliability Data Collection and Exchange
- **ISO 9001:2015**: Quality Management Systems

## License

This manufacturing agent pipeline is part of the Manufacturing Analytics Platform.