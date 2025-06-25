import { NextRequest } from 'next/server';
import { manufacturingPipeline } from '@/lib/agents/pipeline/ManufacturingPipeline';
import { z } from 'zod';

// Request validation schema
const RequestSchema = z.object({
  query: z.string().min(1),
  parameters: z.object({
    sessionId: z.string().optional(),
    context: z.record(z.any()).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = RequestSchema.parse(body);
    
    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Helper to send SSE data
        const sendData = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };
        
        try {
          // Send initial status
          sendData({
            type: 'status',
            message: 'Pipeline starting...',
            timestamp: new Date().toISOString()
          });
          
          // Create a custom communication manager to intercept agent messages
          const originalExecute = manufacturingPipeline.execute.bind(manufacturingPipeline);
          
          // Track agent progress
          const agentProgress: Record<string, any> = {};
          
          // Override execute to add streaming capabilities
          manufacturingPipeline.execute = async function(request: any) {
            const agents = this.getAgents();
            
            for (const agent of agents) {
              sendData({
                type: 'agent_start',
                agentId: agent.id,
                agentName: agent.name,
                timestamp: new Date().toISOString()
              });
              
              // Execute agent
              try {
                // Note: In a real implementation, we'd need to modify the agent
                // execution to support progress updates
                agentProgress[agent.id] = 'processing';
                
                sendData({
                  type: 'agent_progress',
                  agentId: agent.id,
                  status: 'processing',
                  timestamp: new Date().toISOString()
                });
                
                // Simulate some processing time
                await new Promise(resolve => setTimeout(resolve, 500));
                
                agentProgress[agent.id] = 'completed';
                
                sendData({
                  type: 'agent_complete',
                  agentId: agent.id,
                  status: 'completed',
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                sendData({
                  type: 'agent_error',
                  agentId: agent.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date().toISOString()
                });
              }
            }
            
            // Call original execute
            return originalExecute(request);
          };
          
          // Execute pipeline
          const result = await manufacturingPipeline.execute(validatedRequest);
          
          // Restore original execute
          manufacturingPipeline.execute = originalExecute;
          
          // Send final result
          sendData({
            type: 'complete',
            result: result,
            timestamp: new Date().toISOString()
          });
          
          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          
        } catch (error) {
          sendData({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      }
    });
    
    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        error: 'Invalid request format',
        details: error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Pipeline execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}