import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for testing
const testCache = new Map<string, { data: any; timestamp: number }>();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config } = await request.json();
  
  try {
    // Test cache operations
    const cacheKey = 'test-oee-calculation';
    const cacheResults = {
      write: { success: false, duration: 0 },
      read: { success: false, duration: 0, hit: false },
      invalidation: { success: false, duration: 0 },
    };
    
    // Test 1: Write to cache with real data
    const writeStart = Date.now();
    try {
      // Fetch real OEE data from database
      const { prisma } = await import('@/lib/prisma');
      const latestMetrics = await prisma.metric.findMany({
        where: {
          name: { in: ['oee', 'availability', 'performance', 'quality'] },
        },
        orderBy: { timestamp: 'desc' },
        take: 4,
      });
      
      const oeeData = latestMetrics.find(m => m.name === 'oee');
      const availability = latestMetrics.find(m => m.name === 'availability');
      const performance = latestMetrics.find(m => m.name === 'performance');
      const quality = latestMetrics.find(m => m.name === 'quality');
      
      const testData = {
        oee: oeeData?.value || 0,
        timestamp: new Date().toISOString(),
        components: { 
          availability: availability?.value || 0, 
          performance: performance?.value || 0, 
          quality: quality?.value || 0 
        },
        fromLiveData: true,
      };
      
      testCache.set(cacheKey, { data: testData, timestamp: Date.now() });
      cacheResults.write = {
        success: true,
        duration: Date.now() - writeStart,
      };
    } catch (e) {
      cacheResults.write.success = false;
    }
    
    // Test 2: Read from cache
    const readStart = Date.now();
    try {
      const cached = testCache.get(cacheKey);
      if (cached) {
        cacheResults.read = {
          success: true,
          duration: Date.now() - readStart,
          hit: true,
          age: Date.now() - cached.timestamp,
        };
      }
    } catch (e) {
      cacheResults.read.success = false;
    }
    
    // Test 3: Cache invalidation
    const invalidateStart = Date.now();
    try {
      testCache.delete(cacheKey);
      cacheResults.invalidation = {
        success: true,
        duration: Date.now() - invalidateStart,
      };
    } catch (e) {
      cacheResults.invalidation.success = false;
    }
    
    // Test 4: Performance comparison (with/without cache)
    const performanceTest = await testCachePerformance(config);
    
    // Cache statistics
    const cacheStats = {
      size: testCache.size,
      memoryUsage: Array.from(testCache.entries()).reduce((sum, [k, v]) => {
        return sum + JSON.stringify(v).length;
      }, 0),
      oldestEntry: Math.min(...Array.from(testCache.values()).map(v => v.timestamp)),
    };
    
    return NextResponse.json({
      status: 'success',
      duration: Date.now() - startTime,
      cacheOperations: cacheResults,
      performanceComparison: performanceTest,
      cacheStatistics: cacheStats,
      recommendations: {
        cacheEnabled: config.cacheEnabled,
        suggestedTTL: 300, // 5 minutes
        suggestedMaxSize: 100,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testCachePerformance(config: any) {
  const testPrompt = 'What are the top 5 manufacturing KPIs?';
  
  // Test without cache (cold)
  const coldStart = Date.now();
  await fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt: testPrompt,
      stream: false,
      options: { num_predict: 100 },
    }),
  });
  const coldDuration = Date.now() - coldStart;
  
  // Test with simulated cache (hot)
  const hotStart = Date.now();
  const cacheKey = `prompt-${testPrompt}`;
  const cached = testCache.get(cacheKey);
  
  let hotDuration;
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min TTL
    hotDuration = Date.now() - hotStart;
  } else {
    // Cache miss, fetch and store
    const response = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: testPrompt,
        stream: false,
        options: { num_predict: 100 },
      }),
    });
    const data = await response.json();
    testCache.set(cacheKey, { data, timestamp: Date.now() });
    hotDuration = Date.now() - hotStart;
  }
  
  return {
    coldRequest: coldDuration,
    cachedRequest: hotDuration,
    speedup: `${Math.round((coldDuration / hotDuration) * 10) / 10}x`,
    cacheHit: cached ? true : false,
  };
}