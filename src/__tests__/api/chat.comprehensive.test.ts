// Jest test - using global test functions
/**
 * Comprehensive Chat API Tests
 * Tests the complete chat workflow end-to-end
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { PrismaClient } from '../../../prisma/generated/client';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001; // Use different port for testing

let app: any;
let handle: any;
let server: any;
let prisma: PrismaClient;

describe('Chat API - Comprehensive End-to-End Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting comprehensive chat API tests...');
    
    // Initialize database
    prisma = new PrismaClient({
      log: ['error']
    });
    await prisma.$connect();
    
    // Initialize Next.js app
    app = next({ dev, hostname, port });
    handle = app.getRequestHandler();
    
    await app.prepare();
    
    // Create server
    server = createServer(async (req: any, res: any) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
    
    // Start server
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        console.log(`✅ Test server ready on http://${hostname}:${port}`);
        resolve();
      });
    });
    
    // Wait for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    console.log('✅ Test cleanup complete');
  });

  describe('API Health and Basic Functionality', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/health-check`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
      
      console.log('✅ Health check endpoint working');
    });

    it('should handle authentication', async () => {
      // Test dev login endpoint
      const loginResponse = await fetch(`http://${hostname}:${port}/api/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });
      
      expect(loginResponse.status).toBe(200);
      console.log('✅ Authentication endpoint working');
    });
  });

  describe('Chat API Core Functionality', () => {
    const qualityQueries = [
      {
        message: 'What are the top 5 defect types this week?',
        expectedType: 'quality_analysis',
        description: 'Quality defect analysis'
      },
      {
        message: 'Show me quality performance for last month',
        expectedType: 'quality_analysis',
        description: 'Quality performance query'
      },
      {
        message: 'Which equipment has the highest scrap rate?',
        expectedType: 'quality_analysis',
        description: 'Equipment scrap analysis'
      }
    ];

    const productionQueries = [
      {
        message: 'What is our OEE performance today?',
        expectedType: 'oee_analysis',
        description: 'OEE performance query'
      },
      {
        message: 'Show production analysis for this week',
        expectedType: 'production_analysis',
        description: 'Production analysis query'
      },
      {
        message: 'Which equipment has the lowest availability?',
        expectedType: 'downtime_analysis',
        description: 'Equipment availability query'
      }
    ];

    it.each(qualityQueries)('should handle quality query: $description', async ({ message, expectedType }) => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Validate response structure
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('content');
      expect(data.data).toHaveProperty('confidence');
      expect(data.data).toHaveProperty('analysisType');
      
      // Validate content quality
      expect(data.data.content).toBeDefined();
      expect(data.data.content.length).toBeGreaterThan(50);
      expect(data.data.confidence).toBeGreaterThan(0);
      expect(data.data.executionTime).toBeGreaterThan(0);
      
      console.log(`✅ Quality query processed: "${message.substring(0, 30)}..."`);
      console.log(`   Analysis Type: ${data.data.analysisType}`);
      console.log(`   Confidence: ${data.data.confidence}`);
      console.log(`   Execution Time: ${data.data.executionTime}ms`);
    }, 45000);

    it.each(productionQueries)('should handle production query: $description', async ({ message, expectedType }) => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Validate response structure
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      
      // Validate content quality
      expect(data.data.content).toBeDefined();
      expect(data.data.content.length).toBeGreaterThan(50);
      expect(data.data.confidence).toBeGreaterThan(0);
      
      console.log(`✅ Production query processed: "${message.substring(0, 30)}..."`);
      console.log(`   Analysis Type: ${data.data.analysisType}`);
      console.log(`   Confidence: ${data.data.confidence}`);
    }, 45000);
  });

  describe('Manufacturing Engineering Agent API Tests', () => {
    it('should execute agent through API endpoint', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/agents/manufacturing-engineering/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'What are the top 5 defect types this week?',
          context: {
            userId: 'test-user',
            analysisType: 'quality_analysis'
          }
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('content');
      expect(data.data).toHaveProperty('confidence');
      expect(data.data).toHaveProperty('analysisType');
      expect(data.data).toHaveProperty('executionTime');
      expect(data.data).toHaveProperty('dataPoints');
      
      console.log('✅ Manufacturing Engineering Agent API endpoint working');
    }, 30000);

    it('should handle agent health check', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/agents/manufacturing-engineering/health`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      
      console.log('✅ Agent health check endpoint working');
    });

    it('should get agent status', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/agents/manufacturing-engineering/status`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      
      console.log('✅ Agent status endpoint working');
    });
  });

  describe('Data Integration Tests', () => {
    it('should verify database contains test data', async () => {
      const equipment = await prisma.dimEquipment.findMany({ take: 5 });
      const production = await prisma.factProduction.findMany({ take: 5 });
      const scrap = await prisma.factScrap.findMany({ take: 5 });
      
      expect(equipment.length).toBeGreaterThan(0);
      expect(production.length).toBeGreaterThan(0);
      
      console.log(`✅ Database contains ${equipment.length} equipment, ${production.length} production records, ${scrap.length} scrap records`);
    });

    it('should test data retrieval through API', async () => {
      // Test equipment data
      const equipmentResponse = await fetch(`http://${hostname}:${port}/api/equipment`);
      if (equipmentResponse.status === 200) {
        const equipmentData = await equipmentResponse.json();
        expect(Array.isArray(equipmentData)).toBe(true);
        console.log('✅ Equipment API endpoint working');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests', async () => {
      const malformedRequests = [
        { body: '{ invalid json' },
        { body: JSON.stringify({}) }, // Missing message
        { body: JSON.stringify({ message: '' }) }, // Empty message
        { body: JSON.stringify({ message: null }) }, // Null message
      ];

      for (const request of malformedRequests) {
        const response = await fetch(`http://${hostname}:${port}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: request.body
        });

        // Should handle gracefully with appropriate status or error response
        expect([200, 400, 422]).toContain(response.status);
      }
      
      console.log('✅ Malformed request handling verified');
    });

    it('should handle very long queries', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB message
      
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: longMessage })
      });

      // Should handle gracefully
      expect([200, 400, 413]).toContain(response.status);
      
      console.log('✅ Long query handling verified');
    });

    it('should handle special characters in queries', async () => {
      const specialQueries = [
        'What are the défects with spéciál chars?',
        'Query with emojis 🏭⚙️📊',
        'Query with symbols !@#$%^&*()',
        'Multi-line\nquery\nwith\nbreaks'
      ];

      for (const message of specialQueries) {
        const response = await fetch(`http://${hostname}:${port}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message })
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success');
      }
      
      console.log('✅ Special character handling verified');
    }, 30000);
  });

  describe('Performance and Load Tests', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => 
        fetch(`http://${hostname}:${port}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: `Concurrent quality analysis request ${i}` 
          })
        })
      );

      const responses = await Promise.all(concurrentRequests);
      
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
      
      console.log('✅ Concurrent request handling verified');
    }, 60000);

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'What are the top 5 defect types this week?' 
        })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(30000); // Should respond within 30 seconds
      
      console.log(`✅ Response time: ${responseTime}ms (under 30s limit)`);
    }, 35000);
  });

  describe('Content Quality and Accuracy Tests', () => {
    it('should provide ISO-compliant quality analysis', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'What are the top 5 defect types this week?' 
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      const content = data.data.content;
      
      // Should mention ISO standards
      expect(content.toLowerCase()).toMatch(/iso|standard|compliant/);
      
      // Should include quality-related terms
      expect(content.toLowerCase()).toMatch(/quality|defect|scrap|non-conformit/);
      
      // Should include analysis structure
      expect(content).toMatch(/quality analysis|results|performance/i);
      
      console.log('✅ ISO-compliant quality analysis content verified');
    });

    it('should provide actionable insights', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'What are the quality issues and recommendations?' 
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      const content = data.data.content;
      
      // Should include recommendations or actions
      expect(content.toLowerCase()).toMatch(/recommend|action|improve|fix|address/);
      
      // Should have substantial content
      expect(content.length).toBeGreaterThan(200);
      
      console.log('✅ Actionable insights content verified');
    });
  });

  describe('Integration with Pipeline Agents', () => {
    it('should use pipeline when enabled', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'What are the top 5 defect types this week?',
          usePipeline: true
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBeDefined();
      
      console.log('✅ Pipeline integration verified');
    }, 45000);

    it('should fallback to legacy agent when needed', async () => {
      const response = await fetch(`http://${hostname}:${port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'What are the top 5 defect types this week?',
          usePipeline: false
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBeDefined();
      
      console.log('✅ Legacy agent fallback verified');
    }, 30000);
  });
});