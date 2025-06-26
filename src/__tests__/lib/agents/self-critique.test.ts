// Jest test - using global test functions
import { SelfCritiqueService, CritiqueResult, Critique } from '@/lib/agents/SelfCritiqueService';
import { ConversationalResponse } from '@/lib/agents/ConversationalManufacturingAgent';

describe('SelfCritiqueService', () => {
  let service: SelfCritiqueService;

  beforeEach(() => {
    service = new SelfCritiqueService();
  });

  describe('evaluateResponse', () => {
    it('should give high score for complete and accurate response', async () => {
      const query = 'Show me OEE for all equipment today';
      const response: ConversationalResponse = {
        content: `Here's the OEE analysis for your equipment today (2025-06-25):

📊 **Overall Performance**: 79.1% OEE
✅ Good performance, with room for optimization.

**Equipment Breakdown:**

📍 **CNC Machine #1**: 81.9% OEE
   • Availability: 85.5%
   • Performance: 89.2%
   • Quality: 95.4%

📍 **Robotic Welder**: 77.7% OEE
   • Availability: 79.5%
   • Performance: 86.8%
   • Quality: 95.0%
   ⚠️ *Below target - Availability is the main constraint*`,
        context: {
          confidence: 0.95,
          intent: 'oee_analysis',
          entities: { equipment: ['all'], timeRange: { start: new Date('2025-06-25T00:00:00'), end: new Date('2025-06-25T23:59:59') } },
          analysisType: 'oee_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.score).toBeGreaterThanOrEqual(9);
      expect(result.critiques).toHaveLength(0);
    });

    it('should critique response missing timeframe', async () => {
      const query = 'Show me OEE for all equipment yesterday';
      const response: ConversationalResponse = {
        content: `Overall OEE is 79.1%. Equipment performance is good.`,
        context: {
          confidence: 0.8,
          intent: 'oee_analysis',
          entities: {},
          analysisType: 'oee_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.score).toBeLessThan(9);
      expect(result.critiques.some(c => c.type === 'completeness' && c.issue.includes('time period'))).toBe(true);
    });

    it('should critique response with "no data available"', async () => {
      const query = 'What are the top 5 defect types this week?';
      const response: ConversationalResponse = {
        content: 'No production data available for quality analysis.',
        context: {
          confidence: 0.3,
          intent: 'quality_analysis',
          entities: {},
          analysisType: 'quality_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.score).toBeLessThan(7);
      expect(result.critiques.some(c => 
        c.type === 'completeness' && 
        c.severity === 'high' &&
        c.issue.includes('missing data')
      )).toBe(true);
    });

    it('should validate ontology relationships', async () => {
      const query = 'Which equipment has quality issues?';
      const response: ConversationalResponse = {
        content: 'The product maintains the equipment regularly.', // Invalid relationship
        context: {
          confidence: 0.7,
          intent: 'quality_analysis',
          entities: { equipment: ['CNC-001'] },
          analysisType: 'quality_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.critiques.some(c => c.type === 'ontology')).toBe(true);
    });

    it('should check response clarity and structure', async () => {
      const query = 'Explain the production performance';
      const response: ConversationalResponse = {
        content: 'The production performance is affected by multiple factors including equipment availability which depends on maintenance schedules and operator skill levels as well as material availability and quality specifications that must be met according to ISO standards while considering energy consumption and environmental factors that play a role in overall efficiency metrics calculated using complex formulas involving multiple variables across different time periods.',
        context: {
          confidence: 0.8,
          intent: 'general_query',
          entities: {},
          analysisType: 'general'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.critiques.some(c => 
        c.type === 'clarity' && 
        c.issue.includes('lacks clear structure')
      )).toBe(true);
    });
  });

  describe('critiqueUntilSatisfactory', () => {
    it('should improve response through iterations', async () => {
      const query = 'Show me equipment downtime analysis';
      const initialResponse: ConversationalResponse = {
        content: 'Equipment has some downtime.',
        context: {
          confidence: 0.5,
          intent: 'downtime_analysis',
          entities: {},
          analysisType: 'downtime_analysis'
        }
      };

      let iterationCount = 0;
      const improveResponse = async (q: string, critiques: Critique[]) => {
        iterationCount++;
        
        // Simulate improvement based on critiques
        let improvedContent = initialResponse.content;
        
        if (critiques.some(c => c.issue.includes('specific'))) {
          improvedContent = `Equipment Downtime Analysis (Last 24 hours):

**CNC Machine #1**: 2.5 hours downtime
- Material shortage: 1.5 hours
- Tool change: 1 hour

**Robotic Welder**: 1.2 hours downtime
- Preventive maintenance: 1.2 hours

Total downtime impact: 3.7 hours across 2 machines`;
        }
        
        return {
          content: improvedContent,
          context: {
            confidence: 0.9,
            intent: 'downtime_analysis',
            entities: { timeRange: { start: new Date(), end: new Date() } },
            analysisType: 'downtime_analysis'
          }
        };
      };

      const result = await service.critiqueUntilSatisfactory(
        query,
        initialResponse,
        improveResponse
      );

      expect(result.score).toBeGreaterThan(8);
      expect(iterationCount).toBeGreaterThan(0);
      expect(result.improvedResponse).toBeDefined();
    });

    it('should stop at max iterations even if not perfect', async () => {
      const query = 'Complex analysis request';
      const response: ConversationalResponse = {
        content: 'Basic response',
        context: {
          confidence: 0.3,
          intent: 'general_query',
          entities: {},
          analysisType: 'general'
        }
      };

      let iterationCount = 0;
      const improveResponse = async () => {
        iterationCount++;
        // Return slightly better but still not perfect response
        return {
          ...response,
          content: response.content + ' with minor improvement',
          context: { ...response.context, confidence: 0.4 + iterationCount * 0.1 }
        };
      };

      const result = await service.critiqueUntilSatisfactory(
        query,
        response,
        improveResponse
      );

      expect(iterationCount).toBeLessThanOrEqual(3); // Max iterations
      expect(result.score).toBeLessThan(10);
    });
  });

  describe('critique types', () => {
    it('should detect missing metrics in response', async () => {
      const query = 'Show me OEE, availability, and quality metrics';
      const response: ConversationalResponse = {
        content: 'The OEE is 79.1%.',
        context: {
          confidence: 0.7,
          intent: 'oee_analysis',
          entities: { metrics: ['oee', 'availability', 'quality'] },
          analysisType: 'oee_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      const completenessCritique = result.critiques.find(c => 
        c.type === 'completeness' && c.issue.includes('Missing requested metrics')
      );
      
      expect(completenessCritique).toBeDefined();
      expect(completenessCritique?.severity).toBe('high');
    });

    it('should detect low confidence responses', async () => {
      const query = 'What is the current production rate?';
      const response: ConversationalResponse = {
        content: 'The production rate might be around 100 units per hour, but I cannot be certain.',
        context: {
          confidence: 0.4,
          intent: 'production_analysis',
          entities: {},
          analysisType: 'production_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.critiques.some(c => 
        c.type === 'confidence' && 
        c.severity === 'medium'
      )).toBe(true);
    });

    it('should validate intent matching', async () => {
      const query = 'Why is the equipment failing?'; // Root cause query
      const response: ConversationalResponse = {
        content: 'The equipment OEE is 75%.',
        context: {
          confidence: 0.8,
          intent: 'oee_analysis',
          entities: {},
          analysisType: 'oee_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.critiques.some(c => 
        c.type === 'relevance' && 
        c.issue.includes("doesn't match query intent")
      )).toBe(true);
    });
  });

  describe('improvement suggestions', () => {
    it('should generate relevant suggestions based on critiques', async () => {
      const query = 'Analyze equipment performance';
      const response: ConversationalResponse = {
        content: 'Performance data unavailable.',
        context: {
          confidence: 0.3,
          intent: 'performance_analysis',
          entities: {},
          analysisType: 'performance_analysis'
        }
      };

      const result = await service.evaluateResponse(query, response);
      
      expect(result.suggestions).toContain('📊 Include all requested metrics and timeframes');
      expect(result.suggestions).toContain('💡 Gather more data or acknowledge data limitations');
    });
  });
});

describe('Self-Critique Integration', () => {
  it('should demonstrate full critique improvement cycle', async () => {
    const service = new SelfCritiqueService();
    
    // Simulate a real-world query with poor initial response
    const query = 'What are the top 5 defect types this week?';
    const poorResponse: ConversationalResponse = {
      content: 'There are some quality issues.',
      context: {
        confidence: 0.3,
        intent: 'quality_analysis',
        entities: {},
        analysisType: 'quality_analysis'
      }
    };

    // Mock improvement function that addresses critiques
    const improveResponse = async (q: string, critiques: Critique[]): Promise<ConversationalResponse> => {
      // Address each critique type
      let improvedContent = poorResponse.content;
      
      if (critiques.some(c => c.type === 'completeness')) {
        improvedContent = `Top 5 Defect Types This Week (2025-06-19 to 2025-06-25):

1. **Surface Defects (DEF001)**: 248 units - 17.8% of total defects
   - Primarily on products from CNC Machine #1
   - Increased 12% from last week

2. **Dimensional Errors (DEF007)**: 247 units - 17.7%
   - Affecting precision components
   - Correlation with tool wear detected

3. **Material Flaws (DEF003)**: 245 units - 17.6%
   - Batch B-2024-156 shows higher occurrence
   - Supplier quality issue suspected

4. **Assembly Misalignment (DEF012)**: 213 units - 15.3%
   - Concentrated in 2nd shift operations
   - Training gap identified

5. **Coating Defects (DEF009)**: 189 units - 13.6%
   - Environmental conditions (humidity) impact noted
   - Process adjustment recommended

**Total Defects**: 1,392 units across all categories
**Overall Quality Rate**: 94.7% (below 95% target)

Would you like me to analyze the root causes or suggest corrective actions?`;
      }
      
      return {
        content: improvedContent,
        visualizations: [{
          type: 'bar_chart',
          title: 'Top 5 Defect Types',
          data: [
            { name: 'Surface Defects', value: 248 },
            { name: 'Dimensional Errors', value: 247 },
            { name: 'Material Flaws', value: 245 },
            { name: 'Assembly Misalignment', value: 213 },
            { name: 'Coating Defects', value: 189 }
          ]
        }],
        suggestions: [
          'Why are surface defects increasing?',
          'Show me defect trends by shift',
          'Which equipment has the most defects?'
        ],
        context: {
          confidence: 0.95,
          intent: 'quality_analysis',
          entities: { 
            timeRange: { 
              start: new Date('2025-06-19'), 
              end: new Date('2025-06-25') 
            },
            metrics: ['defects', 'quality']
          },
          analysisType: 'quality_analysis'
        }
      };
    };

    const result = await service.critiqueUntilSatisfactory(
      query,
      poorResponse,
      improveResponse
    );

    // Verify improvement
    expect(result.score).toBeGreaterThanOrEqual(9);
    expect(result.improvedResponse).toBeDefined();
    expect(result.improvedResponse?.content).toContain('Top 5 Defect Types');
    expect(result.improvedResponse?.content).toContain('17.8%');
    expect(result.improvedResponse?.visualizations).toHaveLength(1);
    
    console.log(`✅ Self-critique improved response from ${poorResponse.content.length} to ${result.improvedResponse?.content.length} characters`);
    console.log(`📊 Final score: ${result.score}/10`);
  });
});