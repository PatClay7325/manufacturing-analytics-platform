import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

interface TestResponse {
  status: number;
  ok: boolean;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}

// Custom fetch wrapper for testing
async function testFetch(url: string, options: RequestInit = {}): Promise<TestResponse> {
  const fullUrl = url.startsWith('http') ? url : `${TEST_BASE_URL}${url}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      json: () => response.json(),
      text: () => response.text(),
    };
  } catch (error) {
    throw new Error(`Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test data
const testUser = {
  email: 'test-chat-user@manufacturing.com',
  password: 'TestPassword123!',
  name: 'Chat Test User',
  role: 'operator',
};

const testMessages = [
  {
    simple: "Hello, how are you?",
    manufacturing: "What is the current OEE for Work Center WC-001?",
    complex: "Analyze the performance trends for our CNC machines over the last 24 hours and provide optimization recommendations.",
    metrics: "Show me the quality metrics for the production line and identify any anomalies.",
  }
];

describe('Chat System E2E Tests', () => {
  let authToken: string;
  let prisma: PrismaClient;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
        }
      }
    });

    // Wait for services to be ready
    await waitForServices();
    
    // Create test user
    await setupTestUser();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Ensure we have a valid auth token for each test
    if (!authToken) {
      await authenticateTestUser();
    }
  });

  async function waitForServices() {
    console.log('🔄 Waiting for services to be ready...');
    
    // Wait for API server
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await testFetch('/api/test');
        if (response.ok) {
          console.log('✅ API server is ready');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('API server is not responding after maximum retries');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Wait for Ollama
    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/version`);
      if (response.ok) {
        console.log('✅ Ollama is ready');
      } else {
        throw new Error('Ollama is not responding');
      }
    } catch (error) {
      console.warn('⚠️ Ollama might not be available:', error);
    }

    // Wait for database
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database is ready');
    } catch (error) {
      throw new Error('Database is not available');
    }
  }

  async function setupTestUser() {
    try {
      // Delete existing test user if exists
      await prisma.user.deleteMany({
        where: { email: testUser.email }
      });

      // Create test user via API
      const response = await testFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create test user: ${error}`);
      }

      const userData = await response.json();
      testUserId = userData.user?.id;
      console.log('✅ Test user created');
    } catch (error) {
      throw new Error(`Setup test user failed: ${error}`);
    }
  }

  async function authenticateTestUser() {
    const response = await testFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    if (!response.ok) {
      // Try development auth
      authToken = 'dev-token';
      console.log('🔧 Using development auth token');
      return;
    }

    const data = await response.json();
    authToken = data.token || 'dev-token';
    console.log('✅ Authenticated test user');
  }

  // Test Suite 1: Basic Chat Functionality
  describe('Basic Chat Functionality', () => {
    it('should respond to simple chat message', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testMessages[0].simple }],
          stream: false,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('content');
      expect(typeof data.data.content).toBe('string');
      expect(data.data.content.length).toBeGreaterThan(0);
      
      console.log('✅ Simple chat response:', data.data.content.substring(0, 100) + '...');
    }, TEST_TIMEOUT);

    it('should handle manufacturing-specific queries', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testMessages[0].manufacturing }],
          stream: false,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('content');
      expect(data.data.content).toContain('OEE' || 'Work Center' || 'WC-001');
      
      console.log('✅ Manufacturing query response:', data.data.content.substring(0, 100) + '...');
    }, TEST_TIMEOUT);

    it('should handle complex analytical queries', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testMessages[0].complex }],
          stream: false,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('content');
      expect(data.data.content.length).toBeGreaterThan(50);
      
      console.log('✅ Complex analysis response:', data.data.content.substring(0, 100) + '...');
    }, TEST_TIMEOUT);
  });

  // Test Suite 2: Authentication & Authorization
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'This should fail' }],
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept valid authentication tokens', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Authenticated request' }],
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should reject invalid authentication tokens', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Cookie': 'auth-token=invalid-token',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'This should fail' }],
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  // Test Suite 3: Streaming Chat
  describe('Streaming Chat', () => {
    it('should handle streaming responses', async () => {
      const response = await testFetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Stream a short response about manufacturing' }],
          stream: true,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      
      // Note: In a real streaming test, we'd need to process the stream
      // For now, we verify the response starts correctly
      console.log('✅ Streaming endpoint is accessible');
    }, TEST_TIMEOUT);

    it('should reject streaming requests without auth', async () => {
      const response = await testFetch('/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'This should fail' }],
          stream: true,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  // Test Suite 4: Conversation Context
  describe('Conversation Context', () => {
    it('should maintain conversation context', async () => {
      // First message
      const response1 = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'My name is ChatTester' }
          ],
        }),
      });

      expect(response1.status).toBe(200);
      const data1 = await response1.json();

      // Second message referencing the first
      const response2 = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'My name is ChatTester' },
            { role: 'assistant', content: data1.data.content },
            { role: 'user', content: 'What is my name?' }
          ],
        }),
      });

      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      
      // The response should reference the name from context
      expect(data2.data.content.toLowerCase()).toContain('chattester' || 'chat' || 'tester');
      
      console.log('✅ Context maintained:', data2.data.content.substring(0, 100) + '...');
    }, TEST_TIMEOUT);
  });

  // Test Suite 5: Error Handling
  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: '{"invalid": json}',
      });

      expect(response.status).toBe(400);
    });

    it('should handle empty messages array', async () => {
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [],
        }),
      });

      // Should either handle gracefully or return appropriate error
      expect([200, 400].includes(response.status)).toBe(true);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(5000); // 5KB message
      
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: longMessage }],
        }),
      });

      // Should handle long messages gracefully
      expect([200, 413].includes(response.status)).toBe(true);
    });
  });

  // Test Suite 6: Performance & Reliability
  describe('Performance & Reliability', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await testFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Quick response test' }],
        }),
      });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(15000); // Should respond within 15 seconds
      
      console.log(`✅ Response time: ${responseTime}ms`);
    }, TEST_TIMEOUT);

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        testFetch('/api/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Cookie': `auth-token=${authToken}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Concurrent test ${i + 1}` }],
          }),
        })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        console.log(`✅ Concurrent request ${i + 1} completed`);
      });
    }, TEST_TIMEOUT);
  });
});