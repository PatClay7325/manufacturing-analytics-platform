import { NextRequest, NextResponse } from 'next/server';
import { manufacturingAgent } from '@/lib/agents/ManufacturingEngineeringAgent';
import { z } from 'zod';

// Request schema validation
const StreamRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  parameters: z.object({
    sessionId: z.string().optional(),
    context: z.any().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = StreamRequestSchema.parse(body);
    
    const { query, parameters } = validatedData;
    
    console.log(`🤖 Manufacturing Engineering Agent streaming query: "${query}"`);
    
    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          const startEvent = `data: ${JSON.stringify({
            type: 'status',
            message: 'Starting manufacturing analysis...',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(startEvent));
          
          // Send analysis phase update
          const analysisEvent = `data: ${JSON.stringify({
            type: 'status', 
            message: 'Analyzing manufacturing data and calculating metrics...',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(analysisEvent));
          
          // Execute the manufacturing analysis
          const result = await manufacturingAgent.execute(query, parameters?.context);
          
          // Send progress updates for large responses
          const contentChunks = chunkContent(result.content, 500);
          
          for (let i = 0; i < contentChunks.length; i++) {
            const chunk = contentChunks[i];
            const isLast = i === contentChunks.length - 1;
            
            const contentEvent = `data: ${JSON.stringify({
              type: 'content',
              content: chunk,
              isComplete: isLast,
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            controller.enqueue(encoder.encode(contentEvent));
            
            // Small delay between chunks for streaming effect
            if (!isLast) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          // Send visualizations
          if (result.visualizations && result.visualizations.length > 0) {
            const vizEvent = `data: ${JSON.stringify({
              type: 'visualizations',
              visualizations: result.visualizations,
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(vizEvent));
          }
          
          // Send metadata and completion
          const completionEvent = `data: ${JSON.stringify({
            type: 'completion',
            metadata: {
              confidence: result.confidence,
              analysisType: result.analysisType,
              executionTime: result.executionTime,
              dataPoints: result.dataPoints,
              references: result.references
            },
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(completionEvent));
          
          // Close the stream
          controller.close();
          
        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('❌ Manufacturing Engineering Agent streaming error:', error);
    
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

// Helper function to chunk content for streaming
function chunkContent(content: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  
  // Split by sentences first to maintain readability
  const sentences = content.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [content];
}

export async function GET() {
  return NextResponse.json({
    message: 'Manufacturing Engineering Agent Streaming Execute endpoint',
    usage: 'POST with { query: string, parameters?: { sessionId?: string, context?: any } }',
    response: 'Server-Sent Events (SSE) stream with incremental content',
    eventTypes: [
      'status - Analysis progress updates',
      'content - Streaming analysis content',
      'visualizations - Chart configurations for Recharts',
      'completion - Final metadata and references',
      'error - Error information'
    ]
  });
}
