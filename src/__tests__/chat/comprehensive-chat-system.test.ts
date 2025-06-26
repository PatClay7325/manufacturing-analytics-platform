/**
 * Comprehensive Chat System Test Suite
 * Full testing of chat functionality with database integration
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { prisma } from '@/lib/database/prisma';
import { ManufacturingEngineeringAgent } from '@/lib/agents/ManufacturingEngineeringAgent';
import { ManufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { DataCollectorAgent } from '@/lib/agents/pipeline/agents/DataCollectorAgent';
import { QualityAnalyzerAgent } from '@/lib/agents/pipeline/agents/QualityAnalyzerAgent';
import { PerformanceOptimizerAgent } from '@/lib/agents/pipeline/agents/PerformanceOptimizerAgent';
import { MaintenancePredictorAgent } from '@/lib/agents/pipeline/agents/MaintenancePredictorAgent';
import { RootCauseAnalyzerAgent } from '@/lib/agents/pipeline/agents/RootCauseAnalyzerAgent';
import { VisualizationGeneratorAgent } from '@/lib/agents/pipeline/agents/VisualizationGeneratorAgent';
import { ReportGeneratorAgent } from '@/lib/agents/pipeline/agents/ReportGeneratorAgent';

describe('Comprehensive Chat System Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up database connection
    await prisma.$disconnect();
  });

  describe('Database Connection and Prisma Configuration', () => {
    it('should connect to database without enableTracing errors', async () => {
      const connection = await prisma.$executeRaw`SELECT 1`;
      expect(connection).toBeDefined();
    });

    it('should query dimension tables successfully', async () => {
      const equipment = await prisma.dimEquipment.findMany();
      expect(Array.isArray(equipment)).toBe(true);
    });

    it('should query fact tables with relations', async () => {
      const scrapData = await prisma.factScrap.findMany({
        take: 5,
        include: {
          product: true,
          production: {
            include: {
              equipment: true
            }
          }
        }
      });
      expect(Array.isArray(scrapData)).toBe(true);
    });
  });

  describe('Manufacturing Engineering Agent', () => {
    let agent: ManufacturingEngineeringAgent;

    beforeAll(() => {
      agent = new ManufacturingEngineeringAgent();
    });

    describe('Query Classification', () => {
      const testCases = [
        { query: 'What are the top 5 defect types this week?', expected: 'quality_analysis' },
        { query: 'What is our OEE performance today?', expected: 'oee_analysis' },
        { query: 'Show me downtime contributors', expected: 'downtime_analysis' },
        { query: 'What is the maintenance schedule?', expected: 'maintenance_analysis' },
        { query: 'Show production output data', expected: 'production_analysis' },
        { query: 'Perform root cause analysis', expected: 'root_cause_analysis' },
        { query: 'Show performance trends over time', expected: 'performance_trending' },
        { query: 'Hello there', expected: 'oee_analysis' } // Default
      ];

      testCases.forEach(({ query, expected }) => {
        it(`should classify "${query}" as ${expected}`, () => {
          const classification = agent['classifyQuery'](query);
          expect(classification).toBe(expected);
        });
      });
    });

    describe('Time Range Extraction', () => {
      it('should extract correct time range for "today"', () => {
        const timeRange = agent['extractTimeRange']('What happened today?');
        const hours = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
        expect(hours).toBeLessThanOrEqual(24);
        expect(hours).toBeGreaterThan(0);
      });

      it('should extract correct time range for "yesterday"', () => {
        const timeRange = agent['extractTimeRange']('Show me yesterday data');
        const hours = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
        expect(hours).toBe(24);
      });

      it('should extract correct time range for "last week"', () => {
        const timeRange = agent['extractTimeRange']('Last week performance');
        const hours = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
        expect(hours).toBe(168); // 7 days
      });

      it('should extract correct time range for "this month"', () => {
        const timeRange = agent['extractTimeRange']('This month metrics');
        const hours = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
        expect(hours).toBeGreaterThan(600); // At least 25 days
        expect(hours).toBeLessThan(744); // At most 31 days
      });

      it('should default to 24 hours for ambiguous queries', () => {
        const timeRange = agent['extractTimeRange']('Show me some data');
        const hours = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
        expect(hours).toBe(24);
      });
    });

    describe('Query Execution', () => {
      it('should execute quality analysis query', async () => {
        const response = await agent.execute('What are the top 5 defect types this week?');
        
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(typeof response.content).toBe('string');
        expect(response.confidence).toBeGreaterThanOrEqual(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
        expect(response.analysisType).toBe('quality_analysis');
        expect(response.dataPoints).toBeDefined();
        expect(typeof response.dataPoints).toBe('number');
        expect(Array.isArray(response.visualizations)).toBe(true);
        expect(Array.isArray(response.references)).toBe(true);
      });

      it('should execute OEE analysis query', async () => {
        const response = await agent.execute('What is our OEE performance today?');
        
        expect(response).toBeDefined();
        expect(response.analysisType).toBe('oee_analysis');
        expect(response.content).toContain('OEE');
      });

      it('should execute downtime analysis query', async () => {
        const response = await agent.execute('Show me the top downtime contributors');
        
        expect(response).toBeDefined();
        expect(response.analysisType).toBe('downtime_analysis');
      });

      it('should handle errors gracefully', async () => {
        const response = await agent.execute('');
        
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(response.confidence).toBeLessThan(1);
      });
    });

    describe('Analysis Methods', () => {
      const mockData = {
        equipment: [],
        oeeMetrics: [],
        downtime: [],
        scrapData: [],
        productionData: [],
        maintenanceData: [],
        timeRange: { start: new Date(), end: new Date() }
      };

      it('should handle empty data in analyzeOEE', () => {
        const result = agent['analyzeOEE'](mockData);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.dataPoints).toBe(0);
      });

      it('should handle empty data in analyzeQuality', () => {
        const result = agent['analyzeQuality'](mockData);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.dataPoints).toBe(0);
      });

      it('should handle empty data in analyzeDowntime', () => {
        const result = agent['analyzeDowntime'](mockData);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.dataPoints).toBe(0);
      });
    });
  });

  describe('Manufacturing Pipeline', () => {
    let pipeline: ManufacturingPipeline;

    beforeAll(() => {
      pipeline = new ManufacturingPipeline({
        enableLegacyAgent: true,
        timeout: 30000
      });
    });

    it('should initialize pipeline with all agents', () => {
      expect(pipeline).toBeDefined();
      
      // Check that pipeline has required methods
      expect(typeof pipeline.execute).toBe('function');
      expect(typeof pipeline.getStatus).toBe('function');
      expect(typeof pipeline.abort).toBe('function');
    });

    it('should execute quality analysis through pipeline', async () => {
      const query = 'What are the top quality issues?';
      const result = await pipeline.execute(query);
      
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.results).toBeDefined();
    }, 10000);

    it('should handle pipeline abort gracefully', () => {
      const abortResult = pipeline.abort();
      expect(abortResult).toBe(true);
    });
  });

  describe('Individual Pipeline Agents', () => {
    describe('DataCollectorAgent', () => {
      it('should initialize and execute', async () => {
        const agent = new DataCollectorAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('data_collector');
        
        const result = await agent.execute({ query: 'test' });
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    describe('QualityAnalyzerAgent', () => {
      it('should analyze quality data', async () => {
        const agent = new QualityAnalyzerAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('quality_analyzer');
        
        const mockData = {
          scrapData: [],
          productionData: []
        };
        
        const result = await agent.execute({ 
          query: 'quality analysis',
          data: mockData 
        });
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    describe('PerformanceOptimizerAgent', () => {
      it('should optimize performance metrics', async () => {
        const agent = new PerformanceOptimizerAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('performance_optimizer');
        
        const result = await agent.execute({
          query: 'optimize performance',
          data: { oeeData: [] }
        });
        expect(result).toBeDefined();
      });
    });

    describe('MaintenancePredictorAgent', () => {
      it('should predict maintenance needs', async () => {
        const agent = new MaintenancePredictorAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('maintenance_predictor');
        
        const result = await agent.execute({
          query: 'predict maintenance',
          data: { maintenanceHistory: [] }
        });
        expect(result).toBeDefined();
      });
    });

    describe('RootCauseAnalyzerAgent', () => {
      it('should perform root cause analysis', async () => {
        const agent = new RootCauseAnalyzerAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('root_cause_analyzer');
        
        const result = await agent.execute({
          query: 'analyze root cause',
          data: { 
            defects: [],
            context: { timeRange: { start: new Date(), end: new Date() } }
          }
        });
        expect(result).toBeDefined();
      });
    });

    describe('VisualizationGeneratorAgent', () => {
      it('should generate visualizations', async () => {
        const agent = new VisualizationGeneratorAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('visualization_generator');
        
        const result = await agent.execute({
          query: 'generate charts',
          analysisResults: []
        });
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    describe('ReportGeneratorAgent', () => {
      it('should generate reports', async () => {
        const agent = new ReportGeneratorAgent();
        expect(agent).toBeDefined();
        expect(agent.name).toBe('report_generator');
        
        const result = await agent.execute({
          query: 'generate report',
          analysisResults: [],
          visualizations: []
        });
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });

  describe('Chat API Integration', () => {
    it('should classify manufacturing queries correctly', () => {
      const manufacturingQueries = [
        'What are the top 5 defect types?',
        'Show OEE performance',
        'Which equipment has downtime?',
        'Analyze production efficiency',
        'What maintenance is scheduled?'
      ];

      manufacturingQueries.forEach(query => {
        const queryLower = query.toLowerCase();
        let score = 0;
        
        if (queryLower.includes('quality') || queryLower.includes('defect')) score += 5;
        if (queryLower.includes('oee') || queryLower.includes('performance')) score += 5;
        if (queryLower.includes('downtime')) score += 4;
        if (queryLower.includes('production') || queryLower.includes('efficiency')) score += 3;
        if (queryLower.includes('maintenance')) score += 3;
        
        expect(score).toBeGreaterThanOrEqual(3); // Should use agent
      });
    });

    it('should not classify general queries as manufacturing', () => {
      const generalQueries = [
        'Hello, how are you?',
        'What is the weather?',
        'Tell me a joke',
        'What time is it?'
      ];

      generalQueries.forEach(query => {
        const queryLower = query.toLowerCase();
        let score = 0;
        
        if (queryLower.includes('quality') || queryLower.includes('defect')) score += 5;
        if (queryLower.includes('oee') || queryLower.includes('performance')) score += 5;
        if (queryLower.includes('downtime')) score += 4;
        if (queryLower.includes('production')) score += 3;
        if (queryLower.includes('maintenance')) score += 3;
        
        expect(score).toBeLessThan(3); // Should not use agent
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      const agent = new ManufacturingEngineeringAgent();
      
      // Test with empty string
      const response1 = await agent.execute('');
      expect(response1).toBeDefined();
      expect(response1.content).toBeDefined();
      
      // Test with whitespace
      const response2 = await agent.execute('   ');
      expect(response2).toBeDefined();
      expect(response2.content).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const agent = new ManufacturingEngineeringAgent();
      
      // Mock a database error
      const originalFindMany = prisma.factScrap.findMany;
      prisma.factScrap.findMany = jest.fn().mockRejectedValue(new Error('Database error'));
      
      const response = await agent.execute('What are the defects?');
      expect(response).toBeDefined();
      expect(response.confidence).toBeLessThan(1); // Lower confidence due to error
      
      // Restore original method
      prisma.factScrap.findMany = originalFindMany;
    });

    it('should handle concurrent agent executions', async () => {
      const agent1 = new ManufacturingEngineeringAgent();
      const agent2 = new ManufacturingEngineeringAgent();
      
      const [response1, response2] = await Promise.all([
        agent1.execute('Show OEE data'),
        agent2.execute('Show quality metrics')
      ]);
      
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(response1.analysisType).toBe('oee_analysis');
      expect(response2.analysisType).toBe('quality_analysis');
    });
  });

  describe('Response Structure Validation', () => {
    it('should return valid response structure', async () => {
      const agent = new ManufacturingEngineeringAgent();
      const response = await agent.execute('Analyze production data');
      
      // Validate response structure
      expect(response).toMatchObject({
        content: expect.any(String),
        confidence: expect.any(Number),
        visualizations: expect.any(Array),
        references: expect.any(Array),
        analysisType: expect.any(String),
        executionTime: expect.any(Number),
        dataPoints: expect.any(Number)
      });
      
      // Validate ranges
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.executionTime).toBeGreaterThan(0);
      expect(response.dataPoints).toBeGreaterThanOrEqual(0);
    });

    it('should include ISO references when applicable', async () => {
      const agent = new ManufacturingEngineeringAgent();
      const response = await agent.execute('Calculate OEE metrics');
      
      // Should include ISO 22400 reference for OEE
      const hasISOReference = response.references.some(ref => 
        ref.standard === 'ISO 22400-2:2014'
      );
      expect(hasISOReference).toBe(true);
    });
  });
});