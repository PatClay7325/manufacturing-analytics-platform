import { NextRequest, NextResponse } from 'next/server';
import { manufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { z } from 'zod';

// Request validation schema
const RequestSchema = z.object({
  query: z.string().min(1),
  parameters: z.object({
    sessionId: z.string().optional(),
    context: z.record(z.any()).optional(),
    useDetailedReport: z.boolean().optional(),
    includeVisualizations: z.boolean().optional(),
    timeRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validatedRequest = RequestSchema.parse(body);
    
    // Configure pipeline based on parameters
    if (validatedRequest.parameters?.useDetailedReport) {
      manufacturingPipeline.configure({
        reportFormat: 'detailed',
        parallelExecution: true,
        maxRetries: 3
      });
    }
    
    // Execute pipeline
    const response = await manufacturingPipeline.execute(validatedRequest);
    
    // Return response
    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Pipeline execution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Pipeline execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check pipeline status
export async function GET() {
  try {
    const agents = manufacturingPipeline.getAgents();
    const config = manufacturingPipeline.getConfig();
    
    const agentStatus = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      status: 'ready',
      capabilities: agent.capabilities || []
    }));
    
    return NextResponse.json({
      status: 'operational',
      pipeline: {
        version: '1.0.0',
        agents: agentStatus,
        configuration: config
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}