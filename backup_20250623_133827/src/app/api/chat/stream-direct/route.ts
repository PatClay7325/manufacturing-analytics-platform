import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to format SSE messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Add manufacturing context to messages
          const SYSTEM_PROMPT = `You are an AI assistant for a manufacturing Analytics platform. You help users understand and analyze manufacturing metrics including OEE (Overall Equipment Effectiveness), equipment performance, quality metrics, and production data.

When asked about specific metrics:
- For OEE: Explain it equals Availability × Performance × Quality, with world-class being 85%+
- For equipment status: Mention you'd need real-time sensor data to provide current status
- For production: Discuss throughput, quality yield, and efficiency metrics

Be helpful and informative about manufacturing concepts while being clear about what specific data you'd need for actual calculations.`;

          // Prepare messages with system context
          const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(body.messages || [])
          ];

          // Direct call to Ollama API
          const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: body.model || 'gemma:2b',
              messages: messages,
              stream: true,
              options: {
                temperature: body.temperature ?? 0.7,
                num_predict: body.max_tokens ?? 500,
                num_ctx: 2048,
                num_thread: 2,
                num_gpu: 0,
              }
            }),
          });

          if (!ollamaResponse.ok) {
            const error = await ollamaResponse.text();
            throw new Error(`Ollama API error: ${ollamaResponse.status} - ${error}`);
          }

          // Forward Ollama's streaming response
          const reader = ollamaResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';
          let isClosed = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || isClosed) continue;
              
              try {
                const data = JSON.parse(line);
                if (data.message?.content && !isClosed) {
                  // Convert to OpenAI-style format
                  const sseData = {
                    choices: [{
                      delta: { content: data.message.content },
                      index: 0,
                    }],
                  };
                  try {
                    controller.enqueue(encoder.encode(formatSSE(sseData)));
                  } catch (e) {
                    // Controller already closed, stop processing
                    isClosed = true;
                    return;
                  }
                }
                
                if (data.done && !isClosed) {
                  try {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    isClosed = true;
                  } catch (e) {
                    // Controller already closed
                    isClosed = true;
                  }
                  return;
                }
              } catch (e) {
                console.error('Error parsing line:', line, e);
              }
            }
          }
          
          // Ensure we close if not already closed
          if (!isClosed) {
            try {
              controller.close();
            } catch (e) {
              // Already closed
            }
          }
        } catch (error) {
          // Send error response
          const errorData = {
            error: { 
              message: error instanceof Error ? error.message : 'Unknown error',
            }
          };
          controller.enqueue(encoder.encode(formatSSE(errorData)));
          controller.close();
        }
      },
    });

    // Return streaming response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('Stream route error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}