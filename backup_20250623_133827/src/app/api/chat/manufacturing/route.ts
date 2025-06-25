import { NextRequest } from 'next/server';
import { MANUFACTURING_SYSTEM_PROMPT } from '@/config/ai-system-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Function to detect if user is asking about metrics
function detectMetricQuery(message: string): { hasQuery: boolean; type: string; timeRange: string } {
  const lowerMessage = message.toLowerCase();
  
  // Detect metric types
  let type = 'all';
  if (lowerMessage.includes('oee')) type = 'oee';
  else if (lowerMessage.includes('production') || lowerMessage.includes('units')) type = 'production';
  else if (lowerMessage.includes('quality') || lowerMessage.includes('defect')) type = 'quality';
  else if (lowerMessage.includes('equipment') || lowerMessage.includes('machine') || lowerMessage.includes('down')) type = 'equipment';
  
  // Detect time ranges
  let timeRange = '24h';
  if (lowerMessage.includes('hour') || lowerMessage.includes('hourly')) timeRange = '1h';
  else if (lowerMessage.includes('today') || lowerMessage.includes('day')) timeRange = '24h';
  else if (lowerMessage.includes('week')) timeRange = '7d';
  else if (lowerMessage.includes('month')) timeRange = '30d';
  
  // Check if this is a metric query
  const metricKeywords = ['oee', 'production', 'quality', 'defect', 'equipment', 'machine', 'down', 'units', 'rate', 'performance', 'availability'];
  const hasQuery = metricKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return { hasQuery, type, timeRange };
}

// Format metrics data for the AI
function formatMetricsForAI(data: any): string {
  let context = "Current Manufacturing Metrics:\n\n";
  
  if (data.oee) {
    context += `**OEE (Overall Equipment Effectiveness)**\n`;
    context += `- Current OEE: ${(data.oee.current * 100).toFixed(1)}%\n`;
    context += `- Average OEE: ${(data.oee.average * 100).toFixed(1)}%\n`;
    context += `- Trend: ${data.oee.trend > 0 ? '↑' : '↓'} ${Math.abs(data.oee.trend).toFixed(1)}%\n`;
    context += `- Availability: ${(data.oee.components.availability.current * 100).toFixed(1)}%\n`;
    context += `- Performance: ${(data.oee.components.performance.current * 100).toFixed(1)}%\n`;
    context += `- Quality: ${(data.oee.components.quality.current * 100).toFixed(1)}%\n\n`;
  }
  
  if (data.production) {
    context += `**Production Metrics**\n`;
    context += `- Total Units Produced: ${data.production.totalUnits.toLocaleString()}\n`;
    context += `- Current Production Rate: ${data.production.currentRate.toFixed(1)} units/hour\n`;
    context += `- Average Cycle Time: ${data.production.averageCycleTime.toFixed(1)} seconds\n\n`;
  }
  
  if (data.quality) {
    context += `**Quality Metrics**\n`;
    context += `- Current Defect Rate: ${(data.quality.currentDefectRate * 100).toFixed(2)}%\n`;
    context += `- First Pass Yield: ${(data.quality.currentFPY * 100).toFixed(1)}%\n`;
    context += `- Scrap Rate: ${(data.quality.currentScrapRate * 100).toFixed(2)}%\n\n`;
  }
  
  if (data.equipment) {
    context += `**Equipment Status**\n`;
    const running = data.equipment.filter((e: any) => e.status === 'running').length;
    const total = data.equipment.length;
    context += `- ${running} of ${total} machines running\n`;
    
    const downMachines = data.equipment.filter((e: any) => e.status !== 'running');
    if (downMachines.length > 0) {
      context += `- Down machines: ${downMachines.map((e: any) => e.name).join(', ')}\n`;
    }
    
    if (data.downtime) {
      context += `- Total downtime: ${data.downtime.totalMinutes.toFixed(0)} minutes\n`;
      context += `- Downtime incidents: ${data.downtime.incidents}\n`;
    }
  }
  
  return context;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const lastMessage = messages[messages.length - 1]?.content || '';
        
        // Check if user is asking about metrics
        const metricQuery = detectMetricQuery(lastMessage);
        let metricsContext = '';
        
        if (metricQuery.hasQuery) {
          // Fetch real metrics
          try {
            const metricsResponse = await fetch(`${request.nextUrl.origin}/api/ai/metrics`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: metricQuery.type,
                timeRange: metricQuery.timeRange
              })
            });
            
            if (metricsResponse.ok) {
              const metricsData = await metricsResponse.json();
              if (metricsData.success && metricsData.data) {
                metricsContext = formatMetricsForAI(metricsData.data);
                
                // Send metrics as a thought card
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  thoughts: [{
                    type: 'insight',
                    title: 'Manufacturing Data Retrieved',
                    body: `Fetched ${metricQuery.type} metrics for ${metricQuery.timeRange} time range`
                  }]
                })}\n\n`));
              }
            }
          } catch (error) {
            console.error('Failed to fetch metrics:', error);
          }
        }
        
        // Build the prompt with system context and metrics
        const enhancedMessages = [
          { role: 'system', content: MANUFACTURING_SYSTEM_PROMPT + (metricsContext ? `\n\n${metricsContext}` : '') },
          ...messages
        ];
        
        // Check Ollama
        const testResponse = await fetch('http://127.0.0.1:11434/api/tags');
        if (!testResponse.ok) {
          throw new Error('Ollama is not running');
        }
        
        // Convert messages to prompt for Ollama
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
            context_window: 4096,
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