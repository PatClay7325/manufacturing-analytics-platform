// Jest test - using global test functions
import { ISOComplianceAgent } from '@/lib/agents/ISOComplianceAgent';

describe('ISOComplianceAgent', () => {
  let agent: ISOComplianceAgent;

  beforeEach(() => {
    agent = ISOComplianceAgent.getInstance();
  });

  describe('getStandards', () => {
    it('should return ISO 22400-2 for OEE intent', async () => {
      const input = {
        intent: 'analyze-oee',
        includeMetrics: true,
        includeRequirements: true,
      };

      const result = await agent.getStandards(input);

      expect(result.standards).toHaveLength(1);
      expect(result.primaryStandard).toBe('ISO22400-2');
      expect(result.standards[0]).toMatchObject({
        standardId: 'ISO22400-2',
        title: 'Key Performance Indicators for Manufacturing Operations',
        metrics: expect.arrayContaining([
          expect.objectContaining({
            name: 'Overall Equipment Effectiveness (OEE)',
            calculation: 'Availability × Performance × Quality',
          }),
        ]),
      });
    });

    it('should return multiple standards for quality analysis', async () => {
      const input = {
        intent: 'quality-analysis',
      };

      const result = await agent.getStandards(input);

      expect(result.standards).toHaveLength(2);
      expect(result.primaryStandard).toBe('ISO9001');
      
      const standardIds = result.standards.map(s => s.standardId);
      expect(standardIds).toContain('ISO9001');
      expect(standardIds).toContain('ISO22400-2');
    });

    it('should return ISO 14224 for downtime tracking', async () => {
      const input = {
        intent: 'track-downtime',
      };

      const result = await agent.getStandards(input);

      expect(result.standards.some(s => s.standardId === 'ISO14224')).toBe(true);
      
      const iso14224 = result.standards.find(s => s.standardId === 'ISO14224');
      expect(iso14224?.metrics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Mean Time Between Failures (MTBF)',
            calculation: 'Total Operating Time / Number of Failures',
          }),
        ])
      );
    });

    it('should include recommendations', async () => {
      const input = {
        intent: 'analyze-oee',
      };

      const result = await agent.getStandards(input);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          'Establish automated OEE data collection from equipment',
          'Create real-time OEE dashboards for operators',
        ])
      );
    });

    it('should handle unknown intent', async () => {
      const input = {
        intent: 'unknown-intent',
      };

      const result = await agent.getStandards(input);

      expect(result.standards).toHaveLength(0);
      expect(result.primaryStandard).toBeUndefined();
    });

    it('should validate input', async () => {
      const invalidInput = {
        // Missing required 'intent' field
        context: {},
      };

      await expect(agent.getStandards(invalidInput as any)).rejects.toThrow();
    });
  });

  describe('checkCompliance', () => {
    it('should return compliance status', async () => {
      const result = await agent.checkCompliance('ISO22400-2', {});

      expect(result).toMatchObject({
        compliant: false,
        score: 75,
        gaps: expect.arrayContaining([
          'Missing documented procedures for data collection',
        ]),
        actions: expect.arrayContaining([
          'Create data collection SOP',
        ]),
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ISOComplianceAgent.getInstance();
      const instance2 = ISOComplianceAgent.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});