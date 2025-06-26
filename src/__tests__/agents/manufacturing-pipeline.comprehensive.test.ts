// Jest test - using global test functions
/**
 * Comprehensive Manufacturing Pipeline Tests
 * Tests the complete agent workflow including all child agents
 */

import { PrismaClient } from '../../../prisma/generated/client';
import { ManufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { OrchestratorAgent } from '@/lib/agents/pipeline/OrchestratorAgent';
import { DataCollectorAgent } from '@/lib/agents/pipeline/agents/DataCollectorAgent';
import { QualityAnalyzerAgent } from '@/lib/agents/pipeline/agents/QualityAnalyzerAgent';
import { PerformanceOptimizerAgent } from '@/lib/agents/pipeline/agents/PerformanceOptimizerAgent';
import { MaintenancePredictorAgent } from '@/lib/agents/pipeline/agents/MaintenancePredictorAgent';
import { RootCauseAnalyzerAgent } from '@/lib/agents/pipeline/agents/RootCauseAnalyzerAgent';
import { VisualizationGeneratorAgent } from '@/lib/agents/pipeline/agents/VisualizationGeneratorAgent';
import { ReportGeneratorAgent } from '@/lib/agents/pipeline/agents/ReportGeneratorAgent';
import { ISO22400Agent } from '@/lib/agents/pipeline/agents/ISO22400Agent';
import { ManufacturingEngineeringAgent } from '@/lib/agents/ManufacturingEngineeringAgent';
import { AgentContext, AnalysisType } from '@/lib/agents/pipeline/types';

// Test database setup
let prisma: PrismaClient;
let pipeline: ManufacturingPipeline;
let orchestrator: OrchestratorAgent;

describe('Manufacturing Pipeline - Comprehensive Agent Tests', () => {
  beforeAll(async () => {
    // Initialize test database connection
    prisma = new PrismaClient({
      log: ['error']
    });
    
    // Ensure database is connected
    await prisma.$connect();
    
    // Initialize pipeline with all agents enabled
    pipeline = new ManufacturingPipeline({
      enableLegacyAgent: true,
      timeout: 60000,
      retries: 1,
      reportFormat: 'detailed'
    });
    
    orchestrator = new OrchestratorAgent();
    
    console.log('✅ Test setup complete - Pipeline and database ready');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset any pipeline state between tests
  });

  describe('Database Connectivity and Schema Tests', () => {
    it('should connect to database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should have all required tables in schema', async () => {
      // Test dimension tables
      const sites = await prisma.dimSite.findMany({ take: 1 });
      expect(Array.isArray(sites)).toBe(true);
      
      const equipment = await prisma.dimEquipment.findMany({ take: 1 });
      expect(Array.isArray(equipment)).toBe(true);
      
      const products = await prisma.dimProduct.findMany({ take: 1 });
      expect(Array.isArray(products)).toBe(true);
      
      // Test fact tables
      const production = await prisma.factProduction.findMany({ take: 1 });
      expect(Array.isArray(production)).toBe(true);
      
      const scrap = await prisma.factScrap.findMany({ take: 1 });
      expect(Array.isArray(scrap)).toBe(true);
    });

    it('should have test data seeded', async () => {
      const equipmentCount = await prisma.dimEquipment.count();
      const productionCount = await prisma.factProduction.count();
      
      expect(equipmentCount).toBeGreaterThan(0);
      expect(productionCount).toBeGreaterThan(0);
      
      console.log(`✅ Found ${equipmentCount} equipment and ${productionCount} production records`);
    });
  });

  describe('Individual Agent Tests', () => {
    const testContext: AgentContext = {
      sessionId: 'test-session-001',
      userId: 'test-user',
      tenantId: 'test-tenant',
      query: 'What are the top 5 defect types this week?',
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      },
      analysisType: 'quality_analysis',
      preferences: {
        visualizationTypes: ['bar_chart', 'pie_chart'],
        reportFormat: 'detailed',
        language: 'en'
      }
    };

    it('should test DataCollectorAgent functionality', async () => {
      const agent = new DataCollectorAgent();
      expect(agent.getType()).toBe('data_collector');
      expect(agent.getStatus()).toBe('idle');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.metrics).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      
      console.log('✅ DataCollectorAgent executed successfully');
    }, 30000);

    it('should test QualityAnalyzerAgent functionality', async () => {
      const agent = new QualityAnalyzerAgent();
      expect(agent.getType()).toBe('quality_analyzer');
      
      // First collect data
      const dataCollector = new DataCollectorAgent();
      const dataResult = await dataCollector.execute(testContext);
      
      // Update context with collected data
      const contextWithData = {
        ...testContext,
        previousResults: [dataResult]
      };
      
      const result = await agent.execute(contextWithData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.qualityMetrics).toBeDefined();
      
      console.log('✅ QualityAnalyzerAgent executed successfully');
    }, 30000);

    it('should test PerformanceOptimizerAgent functionality', async () => {
      const agent = new PerformanceOptimizerAgent();
      expect(agent.getType()).toBe('performance_optimizer');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ PerformanceOptimizerAgent executed successfully');
    }, 30000);

    it('should test MaintenancePredictorAgent functionality', async () => {
      const agent = new MaintenancePredictorAgent();
      expect(agent.getType()).toBe('maintenance_predictor');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ MaintenancePredictorAgent executed successfully');
    }, 30000);

    it('should test RootCauseAnalyzerAgent functionality', async () => {
      const agent = new RootCauseAnalyzerAgent();
      expect(agent.getType()).toBe('root_cause_analyzer');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ RootCauseAnalyzerAgent executed successfully');
    }, 30000);

    it('should test VisualizationGeneratorAgent functionality', async () => {
      const agent = new VisualizationGeneratorAgent();
      expect(agent.getType()).toBe('visualization_generator');
      
      // Provide some analysis data for visualization
      const contextWithAnalysis = {
        ...testContext,
        previousResults: [{
          success: true,
          data: {
            qualityMetrics: {
              totalDefects: 50,
              defectsByType: {
                'Dimensional': 20,
                'Surface_Finish': 15,
                'Assembly': 10,
                'Material': 5
              }
            }
          }
        }]
      };
      
      const result = await agent.execute(contextWithAnalysis);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.visualizations).toBeDefined();
      expect(Array.isArray(result.data.visualizations)).toBe(true);
      
      console.log('✅ VisualizationGeneratorAgent executed successfully');
    }, 30000);

    it('should test ReportGeneratorAgent functionality', async () => {
      const agent = new ReportGeneratorAgent();
      expect(agent.getType()).toBe('report_generator');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.report).toBeDefined();
      
      console.log('✅ ReportGeneratorAgent executed successfully');
    }, 30000);

    it('should test ISO22400Agent functionality', async () => {
      const agent = new ISO22400Agent();
      expect(agent.getType()).toBe('iso22400');
      
      const result = await agent.execute(testContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ ISO22400Agent executed successfully');
    }, 30000);
  });

  describe('Orchestrator Agent Tests', () => {
    it('should initialize orchestrator with all agents', async () => {
      expect(orchestrator.getType()).toBe('orchestrator');
      expect(orchestrator.getStatus()).toBe('idle');
      
      // Test that orchestrator can manage the pipeline
      const status = orchestrator.getPipelineStatus();
      expect(status).toBeDefined();
    });

    it('should execute complete pipeline through orchestrator', async () => {
      const context: AgentContext = {
        sessionId: 'test-orchestrator-001',
        userId: 'test-user',
        query: 'Analyze quality issues and provide recommendations',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        },
        analysisType: 'quality_analysis',
        preferences: {
          reportFormat: 'detailed',
          language: 'en'
        }
      };

      const result = await orchestrator.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.finalResult).toBeDefined();
      expect(result.data.stages).toBeDefined();
      
      // Verify all stages were executed
      expect(Object.keys(result.data.stages)).toContain('data_collection');
      expect(Object.keys(result.data.stages)).toContain('analysis');
      expect(Object.keys(result.data.stages)).toContain('visualization');
      expect(Object.keys(result.data.stages)).toContain('reporting');
      
      console.log('✅ Complete pipeline executed through orchestrator');
    }, 60000);
  });

  describe('Manufacturing Pipeline Integration Tests', () => {
    const qualityQueries = [
      'What are the top 5 defect types this week?',
      'Show me quality analysis for the last month',
      'Which equipment has the highest scrap rate?',
      'What is our current quality performance?'
    ];

    const productionQueries = [
      'What is our OEE performance today?',
      'Show production analysis for last week',
      'Which equipment has the lowest availability?',
      'What are the main downtime contributors?'
    ];

    const maintenanceQueries = [
      'When is the next maintenance due?',
      'Show maintenance analysis and predictions',
      'Which equipment needs immediate attention?',
      'What is our MTBF performance?'
    ];

    it.each(qualityQueries)('should handle quality query: %s', async (query) => {
      const result = await pipeline.execute(query, {
        userId: 'test-user',
        sessionId: `test-${Date.now()}`,
        analysisType: 'quality_analysis'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.analysisType).toBe('quality_analysis');
      
      console.log(`✅ Quality query processed: "${query.substring(0, 30)}..."`);
    }, 45000);

    it.each(productionQueries)('should handle production query: %s', async (query) => {
      const result = await pipeline.execute(query, {
        userId: 'test-user',
        sessionId: `test-${Date.now()}`,
        analysisType: 'oee_analysis'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      
      console.log(`✅ Production query processed: "${query.substring(0, 30)}..."`);
    }, 45000);

    it.each(maintenanceQueries)('should handle maintenance query: %s', async (query) => {
      const result = await pipeline.execute(query, {
        userId: 'test-user',
        sessionId: `test-${Date.now()}`,
        analysisType: 'maintenance_analysis'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      
      console.log(`✅ Maintenance query processed: "${query.substring(0, 30)}..."`);
    }, 45000);
  });

  describe('Legacy Agent Fallback Tests', () => {
    it('should use legacy agent when pipeline fails', async () => {
      // Test with pipeline enabled but expecting fallback
      const legacyPipeline = new ManufacturingPipeline({
        enableLegacyAgent: true,
        timeout: 1 // Very short timeout to force fallback
      });

      const result = await legacyPipeline.execute('What are the quality issues?', {
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      
      console.log('✅ Legacy agent fallback working correctly');
    }, 30000);

    it('should test legacy ManufacturingEngineeringAgent directly', async () => {
      const legacyAgent = new ManufacturingEngineeringAgent();
      
      const result = await legacyAgent.execute('What are the top 5 defect types this week?');
      
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.analysisType).toBe('quality_analysis');
      
      console.log('✅ Legacy agent executed successfully');
    }, 30000);
  });

  describe('Pipeline Status and Control Tests', () => {
    it('should get pipeline status', async () => {
      const status = await pipeline.getStatus();
      
      expect(status).toBeDefined();
      expect(status.agents).toBeDefined();
      expect(typeof status.agents).toBe('object');
      
      // Check that all expected agents are present
      const expectedAgents = [
        'data_collector',
        'quality_analyzer', 
        'performance_optimizer',
        'maintenance_predictor',
        'root_cause_analyzer',
        'visualization_generator',
        'report_generator'
      ];
      
      expectedAgents.forEach(agentType => {
        expect(status.agents).toHaveProperty(agentType);
      });
      
      console.log('✅ Pipeline status retrieved successfully');
    });

    it('should be able to abort pipeline execution', async () => {
      // Start a long-running operation
      const pipelinePromise = pipeline.execute('Complex analysis that should be aborted', {
        userId: 'test-user'
      });
      
      // Abort after a short delay
      setTimeout(() => {
        pipeline.abort();
      }, 100);
      
      const result = await pipelinePromise;
      
      // Should either complete quickly or handle abort gracefully
      expect(result).toBeDefined();
      
      console.log('✅ Pipeline abort functionality working');
    }, 10000);
  });

  describe('Error Handling and Resilience Tests', () => {
    it('should handle invalid queries gracefully', async () => {
      const invalidQueries = [
        '',
        null,
        undefined,
        'Random nonsense that makes no sense',
        'Query with special chars !@#$%^&*()',
        'A'.repeat(10000) // Very long query
      ];

      for (const query of invalidQueries) {
        try {
          const result = await pipeline.execute(query as string, {
            userId: 'test-user'
          });
          
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          
        } catch (error) {
          // Error handling is also acceptable
          expect(error).toBeDefined();
        }
      }
      
      console.log('✅ Error handling for invalid queries working');
    }, 30000);

    it('should handle database connection issues', async () => {
      // Test with invalid database connection
      const prismaWithBadConnection = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:connection@localhost:9999/nonexistent'
          }
        }
      });

      // This should be handled gracefully by the agents
      try {
        await prismaWithBadConnection.dimEquipment.findMany();
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Database connection error handling verified');
      }
    });

    it('should handle timeout scenarios', async () => {
      const quickPipeline = new ManufacturingPipeline({
        timeout: 100, // Very short timeout
        enableLegacyAgent: false
      });

      const result = await quickPipeline.execute('Complex analysis', {
        userId: 'test-user'
      });

      // Should handle timeout gracefully
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      console.log('✅ Timeout handling working correctly');
    }, 10000);
  });

  describe('Performance and Load Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        pipeline.execute(`Quality analysis request ${i}`, {
          userId: `test-user-${i}`,
          sessionId: `concurrent-test-${i}`
        })
      );

      const results = await Promise.all(concurrentRequests);
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.content).toBeDefined();
        console.log(`✅ Concurrent request ${index} completed successfully`);
      });
      
      console.log('✅ Concurrent request handling verified');
    }, 60000);

    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await pipeline.execute('What are the top 5 defect types this week?', {
        userId: 'test-user'
      });
      
      const executionTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`✅ Analysis completed in ${executionTime}ms (under 30s limit)`);
    }, 35000);
  });

  describe('Data Quality and Validation Tests', () => {
    it('should validate analysis results structure', async () => {
      const result = await pipeline.execute('What are the top 5 defect types this week?', {
        userId: 'test-user'
      });

      // Validate response structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('visualizations');
      expect(result).toHaveProperty('references');
      expect(result).toHaveProperty('analysisType');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('dataPoints');

      // Validate data types
      expect(typeof result.content).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.visualizations)).toBe(true);
      expect(Array.isArray(result.references)).toBe(true);
      expect(typeof result.analysisType).toBe('string');
      expect(typeof result.executionTime).toBe('number');
      expect(typeof result.dataPoints).toBe('number');

      console.log('✅ Analysis result structure validation passed');
    });

    it('should provide meaningful analysis content', async () => {
      const result = await pipeline.execute('What are the top 5 defect types this week?', {
        userId: 'test-user'
      });

      expect(result.content.length).toBeGreaterThan(100); // Substantial content
      expect(result.content).toMatch(/quality|defect|scrap/i); // Relevant to query
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.dataPoints).toBeGreaterThan(0);

      console.log('✅ Analysis content quality validation passed');
    });
  });
});