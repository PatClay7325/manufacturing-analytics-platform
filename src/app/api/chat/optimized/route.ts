/**
 * Optimized Chat API Route
 * Implements performance optimizations:
 * - Caching with Redis/local cache
 * - Streaming responses
 * - Parallel agent execution
 * - Database query optimization
 * - ISO 22400 compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChatCache } from '@/lib/cache/ChatCache';
import { ManufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';

// Initialize cache
const cache = getChatCache({
  redis: process.env.REDIS_URL ? {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  } : undefined
});

// Initialize pipeline with optimizations
const pipeline = new ManufacturingPipeline({
  enableLegacyAgent: true,
  timeout: 30000, // 30 seconds max
  retries: 1,
  reportFormat: 'detailed'
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { message, sessionId, context } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Log request
    logger.info('Optimized chat request', {
      sessionId,
      messageLength: message.length,
      hasContext: !!context
    });

    // Check response cache first
    const cachedResponse = await cache.getResponseCache(message, context?.analysisType || 'general');
    if (cachedResponse) {
      logger.info('Cache hit - returning cached response', {
        executionTime: Date.now() - startTime
      });
      
      return NextResponse.json({
        ...cachedResponse,
        cached: true,
        executionTime: Date.now() - startTime
      });
    }

    // Prepare optimized context
    const optimizedContext = await prepareOptimizedContext(message, context, sessionId);

    // Check if we can use cached query results
    const cachedQueryData = await cache.getQueryCache(
      message,
      optimizedContext.timeRange
    );

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                sessionId: optimizedContext.sessionId,
                timestamp: new Date().toISOString()
              })}\n\n`
            )
          );

          // Execute pipeline with streaming updates
          const response = await pipeline.execute(message, {
            ...optimizedContext,
            cachedData: cachedQueryData
          });

          // Stream the main content
          const chunks = response.content.match(/.{1,100}/g) || [];
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'content',
                  content: chunk
                })}\n\n`
              )
            );
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Send visualizations
          if (response.visualizations.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'visualizations',
                  visualizations: response.visualizations
                })}\n\n`
              )
            );
          }

          // Send final response with metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                confidence: response.confidence,
                references: response.references,
                executionTime: response.executionTime,
                dataPoints: response.dataPoints,
                cached: false
              })}\n\n`
            )
          );

          // Cache the response
          await cache.setResponseCache(
            message,
            context?.analysisType || 'general',
            response
          );

          controller.close();

        } catch (error) {
          logger.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message
              })}\n\n`
            )
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('Optimized chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Prepare optimized context with cached data
 */
async function prepareOptimizedContext(
  message: string,
  context: any,
  sessionId?: string
): Promise<any> {
  const contextId = sessionId || `session-${Date.now()}`;
  
  // Check context cache
  const cachedContext = await cache.getContextCache(contextId);
  if (cachedContext) {
    return {
      ...cachedContext,
      query: message,
      timestamp: new Date()
    };
  }

  // Build new context with optimized queries
  const now = new Date();
  const timeRange = context?.timeRange || {
    start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    end: now
  };

  // Parallel data fetching with optimized queries
  const [equipmentData, recentAlerts, systemStatus] = await Promise.all([
    // Get equipment summary (cached query)
    prisma.workUnit.findMany({
      where: { status: 'operational' },
      select: {
        id: true,
        name: true,
        equipmentType: true,
        status: true,
        _count: {
          select: {
            Alert: {
              where: {
                status: 'active',
                timestamp: { gte: timeRange.start }
              }
            }
          }
        }
      },
      take: 10
    }),

    // Get recent alerts summary
    prisma.alert.findMany({
      where: {
        timestamp: { gte: timeRange.start },
        status: { in: ['active', 'pending'] }
      },
      select: {
        id: true,
        severity: true,
        type: true,
        message: true,
        workUnitId: true
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    }),

    // Get system status
    prisma.performanceMetric.aggregate({
      where: {
        timestamp: { gte: timeRange.start }
      },
      _avg: {
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true
      }
    })
  ]);

  const optimizedContext = {
    sessionId: contextId,
    timeRange,
    equipment: equipmentData,
    alerts: recentAlerts,
    systemStatus,
    analysisType: detectAnalysisType(message),
    userId: context?.userId,
    tenantId: context?.tenantId
  };

  // Cache the context
  await cache.setContextCache(contextId, optimizedContext);

  return optimizedContext;
}

/**
 * Detect analysis type from message
 */
function detectAnalysisType(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('oee')) return 'oee_analysis';
  if (lower.includes('quality') || lower.includes('defect')) return 'quality_analysis';
  if (lower.includes('maintenance') || lower.includes('mtbf')) return 'maintenance_analysis';
  if (lower.includes('downtime')) return 'downtime_analysis';
  if (lower.includes('production') || lower.includes('throughput')) return 'production_analysis';
  if (lower.includes('root cause') || lower.includes('why')) return 'root_cause_analysis';
  
  return 'general';
}

// OPTIONS method for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}