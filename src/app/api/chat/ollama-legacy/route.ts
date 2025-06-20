import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Convert chat messages to a single prompt for legacy Ollama
function messagesToPrompt(messages: any[]): string {
  if (!messages || messages.length === 0) return '';
  
  // For simple case, just return the last user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMessage) return lastUserMessage.content;
  
  // Otherwise build a conversation prompt
  return messages.map(m => {
    const role = m.role === 'user' ? 'Human' : 'Assistant';
    return `${role}: ${m.content}`;
  }).join('\n\n') + '\n\nAssistant:';
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Check Ollama is running
        const testResponse = await fetch('http://127.0.0.1:11434/api/tags');
        if (!testResponse.ok) {
          throw new Error('Ollama is not running');
        }
        
        const body = await request.json();
        const messages = body.messages || [];
        let model = body.model || 'gemma:2b';
        
        // Check if requested model exists
        const tagsData = await testResponse.json();
        const availableModels = tagsData.models?.map((m: any) => m.name) || [];
        
        // Map model names to available models
        const modelMapping: Record<string, string> = {
          'llama3': 'gemma:2b',  // Fallback to gemma if llama3 not available
          'command-r-plus': 'gemma:2b',
          'mistral': 'gemma:2b'
        };
        
        // Use gemma:2b if requested model not available
        if (!availableModels.includes(model)) {
          console.log(`Model ${model} not found, using gemma:2b instead`);
          model = modelMapping[model] || 'gemma:2b';
        }
        
        const prompt = messagesToPrompt(messages);
        
        // Send initial thought
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'reasoning',
            title: 'Processing',
            body: `Using ${model} to respond...`
          }]
        })}\n\n`));
        
        // Call Ollama generate endpoint
        const ollamaResponse = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: true
          })
        });
        
        if (!ollamaResponse.ok) {
          throw new Error(`Ollama error: ${ollamaResponse.status}`);
        }
        
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
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  // Send the response token
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    content: data.response
                  })}\n\n`));
                }
              } catch (e) {
                console.error('Parse error:', e);
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
          content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure:\n1. Ollama is running: \`ollama serve\`\n2. Model is installed: \`ollama pull gemma:2b\``
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