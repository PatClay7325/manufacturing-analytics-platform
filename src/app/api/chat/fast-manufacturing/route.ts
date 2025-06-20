import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for speed
export const dynamic = 'force-dynamic';

// Minimal system prompt
const FAST_SYSTEM_PROMPT = `You are a manufacturing AI assistant. You have access to these metrics:
- OEE: 72.4% (Availability: 85.4%, Performance: 91.2%, Quality: 92.9%)
- Production: 12,543 units today, 156.2 units/hour
- Quality: 0.71% defect rate, 92.9% first pass yield
- Equipment: 3 of 4 machines running (Packaging Unit 1 in maintenance)
Be concise and specific.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'gemma:2b' } = await request.json();
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Build minimal prompt
    const prompt = `${FAST_SYSTEM_PROMPT}\n\nUser: ${lastMessage}\n\nAssistant:`;
    
    // Call Ollama with optimized settings
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature: 0.5,    // Lower for more focused responses
          top_k: 10,          // Limit token choices
          top_p: 0.5,         // Nucleus sampling
          repeat_penalty: 1.1, // Avoid repetition
          seed: 42,           // Consistent responses
          num_predict: 150    // Limit response length
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    // Transform the response to SSE format
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(Boolean);
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.response })}\n\n`));
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
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
    // Return error as SSE
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Ollama is running.` 
        })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}