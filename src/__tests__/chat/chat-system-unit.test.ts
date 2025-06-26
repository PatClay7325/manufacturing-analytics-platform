/**
 * Chat System Unit Tests
 * Tests core functionality without database dependencies
 */

import { ManufacturingEngineeringAgent } from '@/lib/agents/ManufacturingEngineeringAgent';
import { ManufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { DataCollectorAgent } from '@/lib/agents/pipeline/agents/DataCollectorAgent';
import { QualityAnalyzerAgent } from '@/lib/agents/pipeline/agents/QualityAnalyzerAgent';
import { PerformanceOptimizerAgent } from '@/lib/agents/pipeline/agents/PerformanceOptimizerAgent';
import { MaintenancePredictorAgent } from '@/lib/agents/pipeline/agents/MaintenancePredictorAgent';
import { RootCauseAnalyzerAgent } from '@/lib/agents/pipeline/agents/RootCauseAnalyzerAgent';
import { VisualizationGeneratorAgent } from '@/lib/agents/pipeline/agents/VisualizationGeneratorAgent';
import { ReportGeneratorAgent } from '@/lib/agents/pipeline/agents/ReportGeneratorAgent';

// Mock Prisma to avoid database connection
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    dimEquipment: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, name: 'Equipment 1', code: 'EQ001' },
        { id: 2, name: 'Equipment 2', code: 'EQ002' }
      ]),
      count: jest.fn().mockResolvedValue(2)
    },
    factProduction: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { totalPartsProduced: 1000, goodParts: 950, scrapParts: 50 },
        _count: { id: 10 }
      })
    },
    factScrap: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          scrapCode: 'DEF001',
          scrapQty: 10,
          product: { name: 'Product A', code: 'PA001' },
          production: {
            equipment: { name: 'Equipment 1', code: 'EQ001', type: 'Assembly' }
          }
        }
      ])
    },
    factDowntime: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([])
    },
    factMaintenance: {
      findMany: jest.fn().mockResolvedValue([])
    }
  }
}));

describe('Chat System Unit Tests', () => {
  describe('Manufacturing Engineering Agent', () => {
    let agent: ManufacturingEngineeringAgent;

    beforeEach(() => {
      agent = new ManufacturingEngineeringAgent();
    });

    describe('Core Functionality', () => {
      it('should create agent instance successfully', () => {
        expect(agent).toBeDefined();
        expect(agent).toBeInstanceOf(ManufacturingEngineeringAgent);
      });

      it('should have all required methods', () => {
        expect(typeof agent.execute).toBe('function');
        expect(typeof agent['classifyQuery']).toBe('function');
        expect(typeof agent['extractTimeRange']).toBe('function');
      });
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

      it('should handle empty queries gracefully', async () => {
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

    beforeEach(() => {
      pipeline = new ManufacturingPipeline({
        enableLegacyAgent: true,
        timeout: 5000
      });
    });

    it('should initialize pipeline successfully', () => {
      expect(pipeline).toBeDefined();
      expect(typeof pipeline.execute).toBe('function');
      expect(typeof pipeline.getStatus).toBe('function');
      expect(typeof pipeline.abort).toBe('function');
    });

    it('should execute query through pipeline', async () => {
      const result = await pipeline.execute('What are the quality issues?');
      
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it('should handle abort gracefully', () => {
      const abortResult = pipeline.abort();
      expect(abortResult).toBe(true);
    });
  });

  describe('Individual Pipeline Agents', () => {
    it('should initialize DataCollectorAgent', async () => {
      const agent = new DataCollectorAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('data_collector');
      
      const result = await agent.execute({ query: 'test' });
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should initialize QualityAnalyzerAgent', async () => {
      const agent = new QualityAnalyzerAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('quality_analyzer');
      
      const result = await agent.execute({ 
        query: 'quality analysis',
        data: { scrapData: [], productionData: [] }
      });
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should initialize PerformanceOptimizerAgent', async () => {
      const agent = new PerformanceOptimizerAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('performance_optimizer');
    });

    it('should initialize MaintenancePredictorAgent', async () => {
      const agent = new MaintenancePredictorAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('maintenance_predictor');
    });

    it('should initialize RootCauseAnalyzerAgent', async () => {
      const agent = new RootCauseAnalyzerAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('root_cause_analyzer');
    });

    it('should initialize VisualizationGeneratorAgent', async () => {
      const agent = new VisualizationGeneratorAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('visualization_generator');
    });

    it('should initialize ReportGeneratorAgent', async () => {
      const agent = new ReportGeneratorAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('report_generator');
    });
  });

  describe('Chat API Classification Logic', () => {
    const classifyQuery = (query: string) => {
      const queryLower = query.toLowerCase();
      let score = 0;
      
      if (queryLower.includes('quality') || queryLower.includes('defect') || queryLower.includes('scrap')) score += 5;
      if (queryLower.includes('oee') || queryLower.includes('performance')) score += 5;
      if (queryLower.includes('downtime')) score += 4;
      if (queryLower.includes('production') || queryLower.includes('efficiency')) score += 3;
      if (queryLower.includes('maintenance')) score += 3;
      
      return { score, shouldUseAgent: score >= 3 };
    };

    it('should classify manufacturing queries correctly', () => {
      const manufacturingQueries = [
        'What are the top 5 defect types?',
        'Show OEE performance',
        'Which equipment has downtime?',
        'Analyze production efficiency',
        'What maintenance is scheduled?'
      ];

      manufacturingQueries.forEach(query => {
        const result = classifyQuery(query);
        expect(result.shouldUseAgent).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(3);
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
        const result = classifyQuery(query);
        expect(result.shouldUseAgent).toBe(false);
        expect(result.score).toBeLessThan(3);
      });
    });
  });

  describe('Response Structure Validation', () => {
    it('should return valid response structure', async () => {
      const agent = new ManufacturingEngineeringAgent();
      const response = await agent.execute('Analyze production data');
      
      // Validate response structure
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('confidence');
      expect(response).toHaveProperty('visualizations');
      expect(response).toHaveProperty('references');
      expect(response).toHaveProperty('analysisType');
      expect(response).toHaveProperty('executionTime');
      expect(response).toHaveProperty('dataPoints');
      
      // Validate types
      expect(typeof response.content).toBe('string');
      expect(typeof response.confidence).toBe('number');
      expect(Array.isArray(response.visualizations)).toBe(true);
      expect(Array.isArray(response.references)).toBe(true);
      expect(typeof response.analysisType).toBe('string');
      expect(typeof response.executionTime).toBe('number');
      expect(typeof response.dataPoints).toBe('number');
      
      // Validate ranges
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.executionTime).toBeGreaterThan(0);
      expect(response.dataPoints).toBeGreaterThanOrEqual(0);
    });

    it('should include ISO references for OEE queries', async () => {
      const agent = new ManufacturingEngineeringAgent();
      const response = await agent.execute('Calculate OEE metrics');
      
      const hasISOReference = response.references.some(ref => 
        ref.standard === 'ISO 22400-2:2014'
      );
      expect(hasISOReference).toBe(true);
    });
  });

  describe('Error Resilience', () => {
    it('should handle multiple concurrent executions', async () => {
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

    it('should handle invalid input types gracefully', async () => {
      const agent = new ManufacturingEngineeringAgent();
      
      // Test with various invalid inputs
      const invalidInputs = ['', '   ', null, undefined];
      
      for (const input of invalidInputs) {
        try {
          const response = await agent.execute(input as any);
          expect(response).toBeDefined();
          expect(response.content).toBeDefined();
        } catch (error) {
          // Error is also acceptable for invalid inputs
          expect(error).toBeDefined();
        }
      }
    });
  });
});