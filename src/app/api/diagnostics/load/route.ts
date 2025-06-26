import { NextRequest, NextResponse } from 'next/server';

import { managedFetch } from '@/lib/fetch-manager';
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config } = await request.json();
  
  try {
    // Configure load test parameters
    const loadTestConfig = {
      concurrentRequests: 5,
      requestsPerBatch: 3,
      delayBetweenBatches: 100, // ms
    };
    
    // Test 1: Concurrent Ollama requests
    const ollamaLoadTest = await testOllamaConcurrency(config, loadTestConfig);
    
    // Test 2: Database connection pool stress
    const dbLoadTest = await testDatabaseLoad(loadTestConfig);
    
    // Test 3: Mixed load (Ollama + DB)
    const mixedLoadTest = await testMixedLoad(config, loadTestConfig);
    
    // Calculate statistics
    const stats = calculateLoadTestStats([
      ...ollamaLoadTest.results,
      ...dbLoadTest.results,
      ...mixedLoadTest.results,
    ]);
    
    return NextResponse.json({
      status: 'completed',
      duration: Date.now() - startTime,
      configuration: loadTestConfig,
      tests: {
        ollama: ollamaLoadTest,
        database: dbLoadTest,
        mixed: mixedLoadTest
      },
      statistics: stats,
      recommendations: generateRecommendations(stats)
      });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
      });
  }
}

async function testOllamaConcurrency(config: any, loadConfig: any) {
  const results = [];
  // Use dynamic prompts based on actual system context
  const prompts = [
    'What is the current overall equipment effectiveness?',
    'Show me the latest production metrics',
    'Are there any critical alerts in the system?',
    'What is the status of all equipment?',
    'Analyze the production performance for the last hour',
  ];
  
  // Run concurrent requests
  for (let batch = 0; batch < loadConfig.requestsPerBatch; batch++) {
    const batchPromises = prompts.slice(0, loadConfig.concurrentRequests).map(async (prompt, index) => {
      const requestStart = Date.now();
      try {
        const response = await managedFetch(`${config.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.ollamaModel,
            prompt: prompt,
            stream: false,
            options: { num_predict: 50 }
      }),
          timeout: 30000
      });
        
        const success = response.ok;
        return {
          requestId: `ollama-${batch}-${index}`,
          success,
          duration: Date.now() - requestStart,
          statusCode: response.status
      };
      } catch (error) {
        return {
          requestId: `ollama-${batch}-${index}`,
          success: false,
          duration: Date.now() - requestStart,
          error: error instanceof Error ? error.message : 'Unknown error'
      };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Delay between batches
    if (batch < loadConfig.requestsPerBatch - 1) {
      await new Promise(resolve => setTimeout(resolve, loadConfig.delayBetweenBatches));
    }
  }
  
  return {
    totalRequests: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageLatency: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
    results
      };
}

async function testDatabaseLoad(loadConfig: any) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const results = [];
  
  try {
    // Run concurrent database queries
    for (let batch = 0; batch < loadConfig.requestsPerBatch; batch++) {
      const batchPromises = Array(loadConfig.concurrentRequests).fill(0).map(async (_, index) => {
        const requestStart = Date.now();
        try {
          await prisma.$transaction([
            prisma.workUnit.count(),
            prisma.metric.findMany({ take: 10 }),
            prisma.alert.findMany({ where: { status: 'active' }, take: 5 }),
          ]);
          
          return {
            requestId: `db-${batch}-${index}`,
            success: true,
            duration: Date.now() - requestStart
      };
        } catch (error) {
          return {
            requestId: `db-${batch}-${index}`,
            success: false,
            duration: Date.now() - requestStart,
            error: error instanceof Error ? error.message : 'Unknown error'
      };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (batch < loadConfig.requestsPerBatch - 1) {
        await new Promise(resolve => setTimeout(resolve, loadConfig.delayBetweenBatches));
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  
  return {
    totalRequests: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageLatency: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
    results
      };
}

async function testMixedLoad(config: any, loadConfig: any) {
  const results = [];
  
  // Simulate real-world mixed load
  const scenarios = [
    { type: 'chat', endpoint: '/api/chat' },
    { type: 'metrics', endpoint: '/api/test-db' },
  ];
  
  for (let batch = 0; batch < loadConfig.requestsPerBatch; batch++) {
    const batchPromises = scenarios.map(async (scenario, index) => {
      const requestStart = Date.now();
      try {
        const response = await managedFetch(`http://localhost:3000${scenario.endpoint}`, {
          method: scenario.type === 'metrics' ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: scenario.type !== 'metrics' ? JSON.stringify({
            messages: [{ role: 'user', content: 'Test load' }],
            stream: scenario.type === 'stream'
      }) : undefined,
          timeout: 20000
      });
        
        return {
          requestId: `mixed-${batch}-${scenario.type}`,
          type: scenario.type,
          success: response.ok,
          duration: Date.now() - requestStart,
          statusCode: response.status
      };
      } catch (error) {
        return {
          requestId: `mixed-${batch}-${scenario.type}`,
          type: scenario.type,
          success: false,
          duration: Date.now() - requestStart,
          error: error instanceof Error ? error.message : 'Unknown error'
      };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return {
    totalRequests: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    byType: scenarios.map(s => ({
      type: s.type,
      avgLatency: Math.round(
        results
          .filter(r => r.type === s.type)
          .reduce((sum, r) => sum + r.duration, 0) / 
        results.filter(r => r.type === s.type).length
      )
      })),
    results
      };
}

function calculateLoadTestStats(results: any[]) {
  const durations = results.map(r => r.duration);
  durations.sort((a, b) => a - b);
  
  return {
    totalRequests: results.length,
    successRate: (results.filter(r => r.success).length / results.length * 100).toFixed(1) + '%',
    latency: {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)]
      },
    throughput: {
      requestsPerSecond: (results.length / (Math.max(...durations) / 1000)).toFixed(1)
      }
      };
}

function generateRecommendations(stats: any) {
  const recommendations = [];
  
  if (stats.latency.p95 > 5000) {
    recommendations.push('Consider increasing Ollama resources or optimizing prompts');
  }
  
  if (parseFloat(stats.successRate) < 95) {
    recommendations.push('System reliability below target - investigate timeout settings');
  }
  
  if (stats.latency.p99 > stats.latency.avg * 3) {
    recommendations.push('High latency variance detected - consider implementing request queuing');
  }
  
  if (stats.throughput.requestsPerSecond < 1) {
    recommendations.push('Low throughput - consider horizontal scaling or caching');
  }
  
  return recommendations;
}