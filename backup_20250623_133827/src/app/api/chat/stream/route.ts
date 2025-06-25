import { NextRequest } from 'next/server';
import { OllamaStreamingProvider } from '@/core/ai/OllamaStreamingProvider';
import { ChatCompletionRequest } from '@/core/ai/types';

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
          // Initialize Ollama provider
          const provider = new OllamaStreamingProvider({
            baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
            defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gemma:2b',
            performance: {
              maxContextTokens: parseInt(process.env.OLLAMA_MAX_CONTEXT || '2048'),
              enableCache: process.env.OLLAMA_ENABLE_CACHE !== 'false',
              timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000'),
              numThread: parseInt(process.env.OLLAMA_NUM_THREADS || '2'),
              numGpu: parseInt(process.env.OLLAMA_NUM_GPU || '0'),
            }
          });

          // Prepare chat request
          const chatRequest: ChatCompletionRequest = {
            messages: body.messages || [],
            modelId: body.model || process.env.OLLAMA_DEFAULT_MODEL || 'gemma:2b',
            temperature: body.temperature ?? 0.7,
            maxTokens: body.max_tokens ?? 500,
            stream: true,
          };

          // Stream response
          await provider.chatCompletion(chatRequest, {
            onToken: (token) => {
              // Send each token as SSE
              const data = {
                choices: [{
                  delta: { content: token },
                  index: 0,
                }],
              };
              controller.enqueue(encoder.encode(formatSSE(data)));
            },
            onComplete: () => {
              // Send completion signal
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
            onError: (error) => {
              // Send error
              const errorData = {
                error: { message: error.message }
              };
              controller.enqueue(encoder.encode(formatSSE(errorData)));
              controller.close();
            },
          });
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