import { NextRequest } from 'next/server';
import { manufacturingChatService } from '@/services/manufacturingChatService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to format SSE messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, sessionId = 'default' } = body;
    
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lastMessage = messages[messages.length - 1];
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // First, check if this is a data query
          const queryKeywords = ['show me', 'what is', 'current', 'latest', 'how many', 'list', 'calculate'];
          const isDataQuery = queryKeywords.some(kw => lastMessage.content.toLowerCase().includes(kw));
          
          if (isDataQuery) {
            // Get context data first
            controller.enqueue(encoder.encode(formatSSE({
              choices: [{ delta: { content: 'Checking database... ' }, index: 0 }]
            })));
          }

          // Process with manufacturing context
          const context = await manufacturingChatService.processMessage(sessionId, lastMessage.content);
          
          // Enhanced system prompt with database access
          const SYSTEM_PROMPT = `You are an AI assistant for a manufacturing Analytics platform with LIVE DATABASE ACCESS. 

You can query and analyze real-time data including:
- Current OEE (Overall Equipment Effectiveness) calculations
- Equipment status and performance metrics
- Active alerts and alarms
- Production metrics and quality data
- Maintenance schedules and history

When users ask for specific data, you have access to the actual current values from 

Always provide specific numbers when available, and explain what the data means in the manufacturing context.`;

          // Prepare messages with context
          const enhancedMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.slice(0, -1),
            { role: 'user', content: context || lastMessage.content }
          ];

          // Call Ollama with enhanced context
          const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: body.model || 'gemma:2b',
              messages: enhancedMessages,
              stream: true,
              options: {
                temperature: 0.7,
                num_predict: 1000,
                num_ctx: 4096,
              }
            }),
          });

          if (!ollamaResponse.ok) {
            throw new Error(`Ollama API error: ${ollamaResponse.status}`);
          }

          // Stream the response
          const reader = ollamaResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  const sseData = {
                    choices: [{
                      delta: { content: data.message.content },
                      index: 0,
                    }],
                  };
                  controller.enqueue(encoder.encode(formatSSE(sseData)));
                }
                
                if (data.done) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
          
          controller.close();
        } catch (error) {
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Manufacturing chat error:', error);
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