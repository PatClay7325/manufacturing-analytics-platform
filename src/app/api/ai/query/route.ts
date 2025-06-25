import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { OllamaQueryService } from '@/services/ai/ollama-query-service';
import { getSession } from '@/lib/auth';
import { headers } from 'next/headers';

// Initialize Ollama service
const ollamaService = new OllamaQueryService(prisma);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!rateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making another request.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, context } = body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }

    // Build query context from session and request
    const queryContext = {
      userId: session.user.id,
      role: session.user.role || 'VIEWER',
      allowedPlants: session.user.plants || [],
      allowedAreas: context?.allowedAreas || [],
      maxRows: Math.min(context?.maxRows || 1000, 1000)
    };

    // Validate user has access to at least one plant
    if (queryContext.allowedPlants.length === 0) {
      return NextResponse.json(
        { error: 'No plant access configured for user' },
        { status: 403 }
      );
    }

    // Log the query attempt
    console.log(`AI Query from ${session.user.email}: "${query}"`);

    // Process query with Ollama
    const result = await ollamaService.processQuery(query, queryContext);

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'AI_QUERY',
        resource: 'ai_query',
        newValues: {
          query: query,
          success: result.success,
          rowCount: result.rowCount,
          executionTime: result.executionTime
        },
        ipAddress: headers().get('x-forwarded-for') || 'unknown',
        userAgent: headers().get('user-agent') || 'unknown'
      }
    });

    // Return result
    return NextResponse.json(result);

  } catch (error) {
    console.error('AI Query API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const health = await ollamaService.healthCheck();
    const models = await ollamaService.getAvailableModels();
    
    return NextResponse.json({
      status: health.status,
      model: health.model,
      responseTime: health.responseTime,
      availableModels: models,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Service unavailable' 
      },
      { status: 503 }
    );
  }
}