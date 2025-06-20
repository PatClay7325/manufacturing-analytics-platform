import { NextRequest, NextResponse } from 'next/server';
import { manufacturingAgent } from '@/lib/agents/ManufacturingEngineeringAgent';
import { z } from 'zod';

// Request schema validation
const ExecuteRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  parameters: z.object({
    sessionId: z.string().optional(),
    context: z.any().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ExecuteRequestSchema.parse(body);
    
    const { query, parameters } = validatedData;
    
    console.log(`🤖 Manufacturing Engineering Agent executing query: "${query}"`);
    
    // Execute the manufacturing analysis
    const result = await manufacturingAgent.execute(query, parameters?.context);
    
    console.log(`✅ Analysis completed in ${result.executionTime}ms with ${result.dataPoints} data points`);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Manufacturing Engineering Agent execution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Manufacturing Engineering Agent Execute endpoint',
    usage: 'POST with { query: string, parameters?: { sessionId?: string, context?: any } }',
    example: {
      query: 'What is my current OEE and which equipment needs attention?',
      parameters: {
        sessionId: 'optional-session-id',
        context: {}
      }
    }
  });
}