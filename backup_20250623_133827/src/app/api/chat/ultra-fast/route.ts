import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Cache common questions and responses
const INSTANT_RESPONSES = new Map([
  ['what is my oee', 'Your current OEE is **72.4%**:\n- Availability: 85.4%\n- Performance: 91.2%\n- Quality: 92.9%\n\nThis is below the world-class standard of 85%. The main opportunity is improving Availability.'],
  ['what is my current oee', 'Your current OEE is **72.4%**:\n- Availability: 85.4%\n- Performance: 91.2%\n- Quality: 92.9%\n\nThis is below the world-class standard of 85%. The main opportunity is improving Availability.'],
  ['how many units', 'You have produced **12,543 units** today.\n- Current rate: 156.2 units/hour\n- Average rate: 142.8 units/hour\n- You are 9.4% above average production rate.'],
  ['production', 'Production Status:\n- **12,543 units** produced today\n- Current rate: **156.2 units/hour**\n- Average cycle time: 23.1 seconds\n- Running 9.4% above average'],
  ['quality', 'Quality Metrics:\n- Defect rate: **0.71%** (excellent)\n- First Pass Yield: **92.9%**\n- Scrap rate: **0.32%**\n- Quality is performing well, above target.'],
  ['equipment', 'Equipment Status:\n- **3 of 4 machines** running (75%)\n- Down: Packaging Unit 1 (scheduled maintenance)\n- Total downtime today: 47 minutes\n- 3 downtime incidents'],
  ['which machines are down', 'Currently down:\n- **Packaging Unit 1** - Scheduled maintenance\n\nRunning normally:\n- CNC Machine 001\n- Assembly Line A\n- Quality Station 1']
]);

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1]?.content || '';
    const query = lastMessage.toLowerCase().trim();
    
    // Check for instant response
    for (const [key, response] of INSTANT_RESPONSES) {
      if (query.includes(key)) {
        // Return instant cached response
        return new Response(
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              
              // Send response in chunks for streaming effect
              const words = response.split(' ');
              let index = 0;
              
              const interval = setInterval(() => {
                if (index < words.length) {
                  const chunk = words.slice(index, index + 5).join(' ') + ' ';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
                  index += 5;
                } else {
                  clearInterval(interval);
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, 50); // 50ms between chunks for smooth streaming
            }
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          }
        );
      }
    }
    
    // Fallback to Ollama for other questions
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        prompt: `Manufacturing metrics: OEE 72.4%, Production 12,543 units, 3/4 machines running.\nUser: ${lastMessage}\nProvide a brief, specific answer.\nAssistant:`,
        stream: true,
        options: {
          temperature: 0.3,
          top_k: 5,
          num_predict: 100,
          num_thread: 4
        }
      })
    });

    if (!response.ok) throw new Error('Ollama error');

    // Pass through the stream
    return new Response(
      response.body!.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          const decoder = new TextDecoder();
          const text = decoder.decode(chunk);
          const lines = text.split('\n').filter(Boolean);
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: data.response })}\n\n`));
              }
            } catch (e) {}
          }
        },
        flush(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        }
      })),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
    
  } catch (error) {
    // Quick error response
    return new Response(
      `data: ${JSON.stringify({ content: 'Error: Please ensure Ollama is running.' })}\n\ndata: [DONE]\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}