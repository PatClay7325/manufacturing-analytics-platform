import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to format SSE messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Fallback responses when Ollama is not available
const FALLBACK_RESPONSES = [
  "I'm currently unable to connect to the AI service. Please ensure Ollama is running on port 11434.",
  "It looks like the AI backend is not available. To fix this:\n1. Run: `ollama serve`\n2. Install a model: `ollama pull gemma:2b`\n3. Refresh this page",
  "The AI service is offline. I'm a fallback response to help you troubleshoot.",
];

async function checkOllamaConnection(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body.messages || [];
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Check Ollama connection
        const isOllamaAvailable = await checkOllamaConnection();
        
        if (!isOllamaAvailable) {
          // Send fallback response with setup instructions
          const fallbackMessage = `I'm unable to connect to Ollama. Here's how to fix it:

1. **Start Ollama** (in a new terminal):
   \`\`\`bash
   ollama serve
   \`\`\`

2. **Install the model**:
   \`\`\`bash
   ollama pull gemma:2b
   \`\`\`

3. **Test the connection**:
   \`\`\`bash
   curl http://localhost:11434/api/tags
   \`\`\`

Once Ollama is running, I'll be able to help you with your manufacturing analytics questions!

**Your message:** "${lastUserMessage}"`;

          // Send thought card
          controller.enqueue(encoder.encode(formatSSE({
            thoughts: [{
              type: 'critique',
              title: 'Connection Issue',
              body: `Unable to reach Ollama API at ${process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434'}. The service needs to be started.`
            }]
          })));

          // Stream the fallback message
          const words = fallbackMessage.split(' ');
          for (const word of words) {
            controller.enqueue(encoder.encode(formatSSE({
              content: word + ' '
            })));
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        
        try {
          // Try to use Ollama
          const { OllamaStreamingProvider } = await import('@/core/ai/OllamaStreamingProvider');
          const provider = new OllamaStreamingProvider({
            baseUrl: process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434',
            defaultModel: body.model || process.env.OLLAMA_DEFAULT_MODEL || 'gemma:2b',
          });

          await provider.chatCompletion({
            messages: body.messages || [],
            modelId: body.model || 'gemma:2b',
            temperature: body.temperature ?? 0.7,
            maxTokens: body.max_tokens ?? 500,
            stream: true,
          }, {
            onToken: (token) => {
              controller.enqueue(encoder.encode(formatSSE({
                content: token
              })));
            },
            onComplete: () => {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
            onError: (error) => {
              controller.enqueue(encoder.encode(formatSSE({
                error: { message: error.message }
              })));
              controller.close();
            },
          });
        } catch (error) {
          // Send error with helpful message
          const errorMessage = `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check:
1. Ollama is running: \`ollama serve\`
2. Model is installed: \`ollama list\`
3. Try pulling the model: \`ollama pull gemma:2b\``;

          controller.enqueue(encoder.encode(formatSSE({
            thoughts: [{
              type: 'critique',
              title: 'Error',
              body: error instanceof Error ? error.message : 'Unknown error'
            }]
          })));

          const words = errorMessage.split(' ');
          for (const word of words) {
            controller.enqueue(encoder.encode(formatSSE({
              content: word + ' '
            })));
            await new Promise(resolve => setTimeout(resolve, 30));
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        help: 'Please ensure Ollama is running: ollama serve'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}