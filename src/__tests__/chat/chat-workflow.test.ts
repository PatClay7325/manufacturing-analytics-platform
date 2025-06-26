/**
 * Chat Workflow Test Suite
 * Tests the complete chat workflow with real data
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '../../../prisma/generated/client';
import { ConversationalManufacturingAgent } from '@/lib/agents/ConversationalManufacturingAgent';

const prisma = new PrismaClient();

describe('Chat Workflow Tests', () => {
  let agent: ConversationalManufacturingAgent;
  
  beforeAll(async () => {
    // Connect to database
    await prisma.$connect();
    
    // Initialize agent
    agent = new ConversationalManufacturingAgent(prisma);
    
    // Verify we have data
    const equipmentCount = await prisma.dimEquipment.count();
    console.log(`Found ${equipmentCount} equipment records`);
    
    if (equipmentCount === 0) {
      throw new Error('No equipment data found. Please run seed script first.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have equipment data', async () => {
      const equipment = await prisma.dimEquipment.findMany();
      expect(equipment.length).toBeGreaterThan(0);
      expect(equipment[0]).toHaveProperty('code');
      expect(equipment[0]).toHaveProperty('name');
    });

    it('should have production data', async () => {
      const production = await prisma.factProduction.findMany({ take: 5 });
      expect(production.length).toBeGreaterThan(0);
    });
  });

  describe('Conversational Agent', () => {
    it('should process OEE query', async () => {
      const response = await agent.processQuery(
        "What is the current OEE for equipment CNC-001?",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-001'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.dataSources).toContain('production');
      expect(response.confidence).toBeGreaterThanOrEqual(1);
      expect(response.confidence).toBeLessThanOrEqual(5);
    });

    it('should process maintenance query', async () => {
      const response = await agent.processQuery(
        "Show me maintenance history for CNC machines",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-002'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.dataSources).toContain('maintenance');
    });

    it('should process equipment comparison query', async () => {
      const response = await agent.processQuery(
        "What equipment has the lowest OEE today?",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-003'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.dataSources).toContain('oee');
    });

    it('should handle failure analysis query', async () => {
      const response = await agent.processQuery(
        "Are there any equipment failures in the last 24 hours?",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-004'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.dataSources).toContain('downtime');
    });

    it('should calculate MTBF query', async () => {
      const response = await agent.processQuery(
        "What's the MTBF for our critical equipment?",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-005'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(response.dataSources).toContain('maintenance');
    });
  });

  describe('Self-Critique Mechanism', () => {
    it('should provide self-critique scores', async () => {
      const response = await agent.processQuery(
        "Compare OEE between all CNC machines",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-006'
        }
      );

      expect(response.selfCritique).toBeDefined();
      expect(response.selfCritique?.score).toBeGreaterThanOrEqual(1);
      expect(response.selfCritique?.score).toBeLessThanOrEqual(5);
      
      if (response.selfCritique?.score < 5) {
        expect(response.selfCritique?.suggestions).toBeDefined();
        expect(Array.isArray(response.selfCritique?.suggestions)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const response = await agent.processQuery(
        "",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-007'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toContain('provide more details');
      expect(response.confidence).toBeLessThanOrEqual(2);
    });

    it('should handle queries for non-existent equipment', async () => {
      const response = await agent.processQuery(
        "Show me OEE for equipment XYZ-999",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-008'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      // Should mention no data found or similar
      expect(response.response.toLowerCase()).toMatch(/no data|not found|doesn't exist/);
    });
  });

  describe('Data Quality', () => {
    it('should return data from real database, not mock', async () => {
      const response = await agent.processQuery(
        "List all equipment types",
        {
          timestamp: new Date().toISOString(),
          user: 'test-user',
          conversationId: 'test-009'
        }
      );

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      
      // Check that response doesn't contain mock data indicators
      expect(response.response.toLowerCase()).not.toContain('mock');
      expect(response.response.toLowerCase()).not.toContain('fake');
      expect(response.response.toLowerCase()).not.toContain('sample');
    });
  });
});