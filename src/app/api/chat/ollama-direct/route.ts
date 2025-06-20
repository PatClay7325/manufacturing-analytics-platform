import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkOllama() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    if (!response.ok) return { running: false, error: 'Ollama not responding' };
    
    const data = await response.json();
    const models = data.models || [];
    const hasGemma = models.some((m: any) => m.name === 'gemma:2b');
    
    return { 
      running: true, 
      models: models.map((m: any) => m.name),
      hasGemma 
    };
  } catch (error) {
    return { running: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // First check Ollama status
        const ollamaStatus = await checkOllama();
        
        if (!ollamaStatus.running) {
          // Send error message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'critique',
              title: 'Ollama Not Running',
              body: 'Ollama service is not accessible at http://127.0.0.1:11434'
            }]
          })}\n\n`));
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: `❌ Ollama is not running!\n\nTo fix this:\n\n1. Open a terminal and run:\n   \`\`\`\n   ollama serve\n   \`\`\`\n\n2. In another terminal, pull the model:\n   \`\`\`\n   ollama pull gemma:2b\n   \`\`\`\n\n3. Refresh this page and try again.`
          })}\n\n`));
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        
        if (!ollamaStatus.hasGemma) {
          // Model not installed
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'critique',
              title: 'Model Not Found',
              body: `gemma:2b model is not installed. Available models: ${ollamaStatus.models.join(', ')}`
            }]
          })}\n\n`));
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: `⚠️ The gemma:2b model is not installed!\n\nAvailable models: ${ollamaStatus.models.join(', ')}\n\nTo install gemma:2b:\n\`\`\`\nollama pull gemma:2b\n\`\`\`\n\nOr use one of the available models from the dropdown.`
          })}\n\n`));
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        
        // Parse request
        const body = await request.json();
        const messages = body.messages || [];
        const model = body.model || 'gemma:2b';
        
        // Format messages for Ollama
        const formattedMessages = messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Call Ollama
        const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            stream: true
          })
        });
        
        if (!ollamaResponse.ok) {
          throw new Error(`Ollama returned ${ollamaResponse.status}: ${ollamaResponse.statusText}`);
        }
        
        // Send initial thought
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'reasoning',
            title: 'Processing with ' + model,
            body: `Analyzing your message...`
          }]
        })}\n\n`));
        
        // Stream response
        const reader = ollamaResponse.body?.getReader();
        if (!reader) throw new Error('No response body');
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    content: data.message.content
                  })}\n\n`));
                }
              } catch (e) {
                console.error('Parse error:', e, 'Line:', line);
              }
            }
          }
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
      } catch (error) {
        console.error('Stream error:', error);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'critique',
            title: 'Error',
            body: error instanceof Error ? error.message : 'Unknown error'
          }]
        })}\n\n`));
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTroubleshooting:\n1. Check if Ollama is running: \`ollama serve\`\n2. Check available models: \`ollama list\`\n3. Pull gemma:2b: \`ollama pull gemma:2b\`\n4. Check the browser console for details`
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