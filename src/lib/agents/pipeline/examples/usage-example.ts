/**
 * Manufacturing Agent Pipeline Usage Examples
 * Demonstrates how to use the multi-agent manufacturing analytics system
 */

import { manufacturingPipeline, ManufacturingPipeline } from '../index';
import { AnalysisType } from '../types';

// Example 1: Basic usage with the singleton instance
async function basicUsageExample() {
  console.log('Example 1: Basic Pipeline Usage');
  
  try {
    // Simple OEE analysis query
    const response = await manufacturingPipeline.execute(
      "What is the current OEE performance and what are the main contributors to downtime?"
    );
    
    console.log('Analysis completed:');
    console.log('- Confidence:', response.confidence);
    console.log('- Data points analyzed:', response.dataPoints);
    console.log('- Execution time:', response.executionTime, 'ms');
    console.log('- Visualizations generated:', response.visualizations.length);
    console.log('\nContent:', response.content.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Example 2: Advanced usage with custom configuration
async function advancedUsageExample() {
  console.log('\nExample 2: Advanced Pipeline Usage');
  
  // Create custom pipeline instance
  const customPipeline = new ManufacturingPipeline({
    enableLegacyAgent: false, // Don't fallback to legacy agent
    timeout: 180000, // 3 minutes
    retries: 2,
    reportFormat: 'executive', // Executive summary format
    visualizationPreferences: ['gauge_chart', 'pareto_chart', 'fishbone_diagram']
  });
  
  try {
    // Complex root cause analysis
    const response = await customPipeline.execute(
      "Perform a root cause analysis for the high defect rate in Line A over the past week",
      {
        userId: 'user123',
        tenantId: 'tenant456',
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: new Date()
        },
        analysisType: 'root_cause_analysis' as AnalysisType,
        sessionId: 'session-12345'
      }
    );
    
    console.log('Root cause analysis completed:');
    console.log('- Analysis type:', response.analysisType);
    console.log('- Confidence:', response.confidence);
    console.log('- Visualizations:', response.visualizations.map(v => v.title));
    
    // Display recommendations
    if (response.content.includes('Recommendations')) {
      console.log('\nKey recommendations extracted from analysis');
    }
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Example 3: Quality-focused analysis
async function qualityAnalysisExample() {
  console.log('\nExample 3: Quality Analysis');
  
  try {
    const response = await manufacturingPipeline.execute(
      "Analyze quality metrics and defect patterns for all production lines this month",
      {
        analysisType: 'quality_analysis' as AnalysisType,
        timeRange: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date()
        }
      }
    );
    
    console.log('Quality analysis results:');
    console.log('- Data points:', response.dataPoints);
    
    // Find quality-related visualizations
    const qualityViz = response.visualizations.filter(v => 
      v.title.toLowerCase().includes('quality') || 
      v.title.toLowerCase().includes('defect')
    );
    console.log('- Quality visualizations:', qualityViz.map(v => v.title));
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Example 4: Maintenance prediction
async function maintenancePredictionExample() {
  console.log('\nExample 4: Maintenance Prediction');
  
  try {
    const response = await manufacturingPipeline.execute(
      "Which equipment is at risk of failure and what maintenance should be scheduled?",
      {
        analysisType: 'maintenance_analysis' as AnalysisType
      }
    );
    
    // Extract maintenance-specific visualizations
    const maintenanceViz = response.visualizations.find(v => 
      v.chartId === 'failure-risk-matrix' || 
      v.chartId === 'maintenance-schedule'
    );
    
    if (maintenanceViz) {
      console.log('Maintenance visualization found:', maintenanceViz.title);
      console.log('- Chart type:', maintenanceViz.chartType);
      console.log('- Data points:', maintenanceViz.data.length);
    }
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Example 5: Performance trending
async function performanceTrendingExample() {
  console.log('\nExample 5: Performance Trending');
  
  try {
    const response = await manufacturingPipeline.execute(
      "Show me the OEE trend over the last 30 days and identify any patterns",
      {
        analysisType: 'performance_trending' as AnalysisType,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    );
    
    // Find trend visualizations
    const trendViz = response.visualizations.filter(v => 
      v.chartType === 'line_chart' || 
      v.chartType === 'area_chart'
    );
    
    console.log('Trend analysis results:');
    console.log('- Trend visualizations:', trendViz.length);
    console.log('- Total data points:', response.dataPoints);
    console.log('- ISO references:', response.references.map(r => r.title));
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Example 6: Pipeline status monitoring
async function pipelineStatusExample() {
  console.log('\nExample 6: Pipeline Status Monitoring');
  
  // Start a long-running analysis
  const analysisPromise = manufacturingPipeline.execute(
    "Perform comprehensive analysis of all manufacturing KPIs for the past quarter"
  );
  
  // Monitor pipeline status
  const statusInterval = setInterval(async () => {
    const status = await manufacturingPipeline.getStatus();
    console.log('Pipeline status:', {
      stage: status.currentStage,
      activeAgents: Object.entries(status.agents)
        .filter(([, status]) => status === 'processing')
        .map(([agent]) => agent)
    });
  }, 2000); // Check every 2 seconds
  
  try {
    const response = await analysisPromise;
    clearInterval(statusInterval);
    console.log('Analysis completed successfully');
    console.log('- Execution time:', response.executionTime, 'ms');
    
  } catch (error) {
    clearInterval(statusInterval);
    console.error('Pipeline error:', error);
  }
}

// Example 7: Abort pipeline execution
async function abortPipelineExample() {
  console.log('\nExample 7: Abort Pipeline Execution');
  
  // Start analysis
  const analysisPromise = manufacturingPipeline.execute(
    "Analyze all historical data for the entire facility"
  );
  
  // Abort after 5 seconds
  setTimeout(async () => {
    console.log('Aborting pipeline...');
    await manufacturingPipeline.abort();
  }, 5000);
  
  try {
    await analysisPromise;
  } catch (error) {
    console.log('Pipeline aborted or failed:', error.message);
  }
}

// Example 8: Using the legacy agent directly
async function legacyAgentExample() {
  console.log('\nExample 8: Legacy Agent Usage');
  
  const { ManufacturingEngineeringAgent } = await import('../../ManufacturingEngineeringAgent');
  const legacyAgent = new ManufacturingEngineeringAgent();
  
  try {
    // Use legacy agent without pipeline
    const response = await legacyAgent.execute(
      "What is the current OEE?",
      { usePipeline: false } // Explicitly disable pipeline
    );
    
    console.log('Legacy agent response:');
    console.log('- Execution time:', response.executionTime, 'ms');
    console.log('- Confidence:', response.confidence);
    
  } catch (error) {
    console.error('Legacy agent error:', error);
  }
}

// Run examples
async function runExamples() {
  console.log('Manufacturing Agent Pipeline Examples\n');
  
  // Run examples sequentially
  await basicUsageExample();
  await advancedUsageExample();
  await qualityAnalysisExample();
  await maintenancePredictionExample();
  await performanceTrendingExample();
  await pipelineStatusExample();
  // await abortPipelineExample(); // Commented out to avoid interrupting other examples
  await legacyAgentExample();
  
  console.log('\nAll examples completed!');
}

// Export for use in other modules
export {
  basicUsageExample,
  advancedUsageExample,
  qualityAnalysisExample,
  maintenancePredictionExample,
  performanceTrendingExample,
  pipelineStatusExample,
  abortPipelineExample,
  legacyAgentExample,
  runExamples
};

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}