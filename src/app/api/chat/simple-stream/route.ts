import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a simple streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const lastMessage = messages[messages.length - 1]?.content || 'Hello';
        
        // Call Ollama directly using the chat endpoint
        const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: body.model || 'gemma:2b',
            messages: messages.length > 0 ? messages : [{ role: 'user', content: lastMessage }],
            stream: true
          })
        });

        if (!ollamaResponse.ok) {
          throw new Error(`Ollama error: ${ollamaResponse.status}`);
        }

        const reader = ollamaResponse.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        
        // Send initial thought card
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'reasoning',
            title: 'Processing',
            body: `Thinking about: "${lastMessage}"`
          }]
        })}\n\n`));

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.message && data.message.content) {
                  // Send token
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    content: data.message.content
                  })}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        // Send completion
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
      } catch (error) {
        // Send error as streaming response
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'critique',
            title: 'Error',
            body: errorMsg
          }]
        })}\n\n`));
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          content: `Error: ${errorMsg}\n\nMake sure Ollama is running:\n1. ollama serve\n2. ollama pull gemma:2b`
        })}\n\n`));
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
}