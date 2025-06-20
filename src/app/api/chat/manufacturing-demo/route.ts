import { NextRequest } from 'next/server';
import { MANUFACTURING_SYSTEM_PROMPT } from '@/config/ai-system-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Demo metrics data
const DEMO_METRICS = {
  oee: {
    current: 0.724,
    average: 0.682,
    trend: 6.2,
    components: {
      availability: { current: 0.854, average: 0.823 },
      performance: { current: 0.912, average: 0.897 },
      quality: { current: 0.929, average: 0.923 }
    }
  },
  production: {
    totalUnits: 12543,
    currentRate: 156.2,
    averageRate: 142.8,
    averageCycleTime: 23.1
  },
  quality: {
    currentDefectRate: 0.0071,
    averageDefectRate: 0.0077,
    currentFPY: 0.929,
    averageFPY: 0.923,
    currentScrapRate: 0.0032,
    averageScrapRate: 0.0038
  },
  equipment: [
    { id: '1', name: 'CNC Machine 001', status: 'running', type: 'CNC', location: 'Floor 1' },
    { id: '2', name: 'Assembly Line A', status: 'running', type: 'Assembly', location: 'Floor 2' },
    { id: '3', name: 'Packaging Unit 1', status: 'maintenance', type: 'Packaging', location: 'Floor 2' },
    { id: '4', name: 'Quality Station 1', status: 'running', type: 'QC', location: 'Floor 1' }
  ],
  downtime: {
    totalMinutes: 47,
    incidents: 3,
    averagePerIncident: 15.67
  }
};

function formatDemoMetrics(): string {
  return `Current Manufacturing Metrics (Demo Data):

**OEE (Overall Equipment Effectiveness)**
- Current OEE: 72.4% (↑ 6.2% from average)
- Availability: 85.4%
- Performance: 91.2%
- Quality: 92.9%

**Production Metrics**
- Total Units Produced Today: 12,543
- Current Production Rate: 156.2 units/hour
- Average Cycle Time: 23.1 seconds

**Quality Metrics**
- Current Defect Rate: 0.71%
- First Pass Yield: 92.9%
- Scrap Rate: 0.32%

**Equipment Status**
- 3 of 4 machines running
- Down machines: Packaging Unit 1 (scheduled maintenance)
- Total downtime today: 47 minutes
- Downtime incidents: 3`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const lastMessage = messages[messages.length - 1]?.content || '';
        
        // Always include demo metrics for manufacturing questions
        const lowerMessage = lastMessage.toLowerCase();
        const isManufacturingQuery = ['oee', 'production', 'quality', 'equipment', 'machine', 'units', 'defect', 'downtime', 'performance'].some(
          keyword => lowerMessage.includes(keyword)
        );
        
        // Build prompt with system context and demo metrics
        const systemPrompt = isManufacturingQuery 
          ? `${MANUFACTURING_SYSTEM_PROMPT}\n\n${formatDemoMetrics()}`
          : MANUFACTURING_SYSTEM_PROMPT;
        
        const enhancedMessages = [
          { role: 'system', content: systemPrompt },
          ...messages
        ];
        
        // Send thought card if metrics query
        if (isManufacturingQuery) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'insight',
              title: 'Analyzing Manufacturing Data',
              body: 'Retrieving current metrics and performance indicators...'
            }]
          })}\n\n`));
        }
        
        // Check Ollama
        const testResponse = await fetch('http://127.0.0.1:11434/api/tags');
        if (!testResponse.ok) {
          throw new Error('Ollama is not running');
        }
        
        // Convert messages to prompt
        const prompt = enhancedMessages.map(m => {
          if (m.role === 'system') return m.content;
          return `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`;
        }).join('\n\n') + '\n\nAssistant:';
        
        // Call Ollama
        const ollamaResponse = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: body.model || 'gemma:2b',
            prompt: prompt,
            stream: true,
            temperature: 0.7
          })
        });
        
        if (!ollamaResponse.ok) {
          throw new Error(`Ollama error: ${ollamaResponse.status}`);
        }
        
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
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
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
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
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