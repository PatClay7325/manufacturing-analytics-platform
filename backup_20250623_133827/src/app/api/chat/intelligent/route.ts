import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MANUFACTURING_SYSTEM_PROMPT } from '@/config/ai-system-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Query functions for different metric types
async function queryOEEMetrics(timeRange: Date) {
  const metrics = await prisma.metric.groupBy({
    by: ['name'],
    where: {
      name: { in: ['oee', 'availability', 'performance', 'quality'] },
      timestamp: { gte: timeRange }
    },
    _avg: { value: true },
    _max: { value: true },
    _min: { value: true },
    _count: true
  });

  const latest = await prisma.metric.findMany({
    where: {
      name: { in: ['oee', 'availability', 'performance', 'quality'] },
      timestamp: { gte: timeRange }
    },
    orderBy: { timestamp: 'desc' },
    take: 4,
    distinct: ['name']
  });

  return { aggregated: metrics, latest };
}

async function queryProductionMetrics(timeRange: Date) {
  const production = await prisma.metric.aggregate({
    where: {
      name: 'units_produced',
      timestamp: { gte: timeRange }
    },
    _sum: { value: true },
    _avg: { value: true },
    _count: true
  });

  const rates = await prisma.metric.findMany({
    where: {
      name: { in: ['production_rate', 'cycle_time'] },
      timestamp: { gte: timeRange }
    },
    orderBy: { timestamp: 'desc' },
    take: 10
  });

  return { production, rates };
}

async function queryQualityMetrics(timeRange: Date) {
  return await prisma.metric.findMany({
    where: {
      name: { in: ['defect_rate', 'first_pass_yield', 'scrap_rate'] },
      timestamp: { gte: timeRange }
    },
    orderBy: { timestamp: 'desc' },
    take: 30
  });
}

async function queryEquipmentStatus() {
  const equipment = await prisma.equipment.findMany({
    include: {
      maintenanceRecords: {
        orderBy: { scheduledDate: 'desc' },
        take: 1
      }
    }
  });

  const downtime = await prisma.metric.aggregate({
    where: {
      name: 'downtime_minutes',
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    _sum: { value: true },
    _count: true
  });

  return { equipment, downtime };
}

async function queryAlerts(limit: number = 10) {
  return await prisma.alert.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      equipment: true
    }
  });
}

async function queryDowntimeReasons(timeRange: Date) {
  // Query for downtime reasons/categories
  const downtimeMetrics = await prisma.metric.findMany({
    where: {
      name: { contains: 'downtime' },
      timestamp: { gte: timeRange }
    },
    orderBy: { value: 'desc' },
    take: 50
  });

  // Group by tags (which might contain reason/category)
  const downtimeByCategory = downtimeMetrics.reduce((acc: any, metric) => {
    const category = metric.tags ? JSON.parse(metric.tags).reason || 'Unspecified' : 'Unspecified';
    if (!acc[category]) acc[category] = 0;
    acc[category] += metric.value;
    return acc;
  }, {});

  return { 
    total: downtimeMetrics.reduce((sum, m) => sum + m.value, 0),
    byCategory: downtimeByCategory,
    incidents: downtimeMetrics.length
  };
}

// Intelligent query analyzer
function analyzeQuery(message: string) {
  const lower = message.toLowerCase();
  const queries = [];

  // Time range detection
  let hoursAgo = 24; // default
  if (lower.includes('hour')) hoursAgo = 1;
  else if (lower.includes('shift')) hoursAgo = 8;
  else if (lower.includes('week')) hoursAgo = 168;
  else if (lower.includes('month')) hoursAgo = 720;

  const timeRange = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  // Determine what data to fetch - more specific matching
  if (lower.includes('oee') || lower.includes('effectiveness') || lower.includes('overall')) {
    queries.push({ type: 'oee', timeRange });
  }
  if (lower.includes('production') || lower.includes('units') || lower.includes('output') || lower.includes('produced')) {
    queries.push({ type: 'production', timeRange });
  }
  if (lower.includes('quality') || lower.includes('defect') || lower.includes('yield') || lower.includes('scrap')) {
    queries.push({ type: 'quality', timeRange });
  }
  if (lower.includes('equipment') || lower.includes('machine') || lower.includes('down') || lower.includes('maintenance')) {
    queries.push({ type: 'equipment', timeRange });
  }
  if (lower.includes('downtime') || lower.includes('category') || lower.includes('reason')) {
    queries.push({ type: 'downtime', timeRange });
  }
  if (lower.includes('alert') || lower.includes('issue') || lower.includes('problem')) {
    queries.push({ type: 'alerts', timeRange });
  }

  // Always fetch something to avoid generic responses
  if (queries.length === 0) {
    // Try to be smart about what they might want
    if (lower.includes('current') || lower.includes('now') || lower.includes('today')) {
      queries.push({ type: 'overview', timeRange });
    } else {
      queries.push({ type: 'quality', timeRange }); // Default to quality for defect questions
    }
  }

  return { queries, timeRange, hoursAgo };
}

// Format data for AI context
function formatDataForAI(data: any, queryType: string): string {
  let context = '';

  switch (queryType) {
    case 'oee':
      if (data.latest && data.latest.length > 0) {
        const oee = data.latest.find((m: any) => m.name === 'oee');
        const avail = data.latest.find((m: any) => m.name === 'availability');
        const perf = data.latest.find((m: any) => m.name === 'performance');
        const qual = data.latest.find((m: any) => m.name === 'quality');

        context += `Current OEE Metrics:\n`;
        if (oee) context += `- OEE: ${(oee.value * 100).toFixed(1)}%\n`;
        if (avail) context += `- Availability: ${(avail.value * 100).toFixed(1)}%\n`;
        if (perf) context += `- Performance: ${(perf.value * 100).toFixed(1)}%\n`;
        if (qual) context += `- Quality: ${(qual.value * 100).toFixed(1)}%\n`;
      }
      break;

    case 'production':
      if (data.production) {
        context += `Production Metrics:\n`;
        context += `- Total Units: ${data.production._sum.value || 0}\n`;
        context += `- Average Rate: ${data.production._avg.value?.toFixed(1) || 0} units/hour\n`;
        context += `- Data Points: ${data.production._count}\n`;
      }
      break;

    case 'quality':
      if (data && data.length > 0) {
        const latestDefect = data.find((m: any) => m.name === 'defect_rate');
        const latestFPY = data.find((m: any) => m.name === 'first_pass_yield');
        context += `Quality Metrics:\n`;
        if (latestDefect) context += `- Defect Rate: ${(latestDefect.value * 100).toFixed(2)}%\n`;
        if (latestFPY) context += `- First Pass Yield: ${(latestFPY.value * 100).toFixed(1)}%\n`;
      }
      break;

    case 'equipment':
      if (data.equipment) {
        const running = data.equipment.filter((e: any) => e.status === 'running').length;
        const total = data.equipment.length;
        context += `Equipment Status:\n`;
        context += `- ${running} of ${total} machines running\n`;
        
        const down = data.equipment.filter((e: any) => e.status !== 'running');
        if (down.length > 0) {
          context += `- Down machines: ${down.map((e: any) => e.name).join(', ')}\n`;
        }
        
        if (data.downtime) {
          context += `- Total downtime (24h): ${data.downtime._sum.value || 0} minutes\n`;
        }
      }
      break;

    case 'alerts':
      if (data && data.length > 0) {
        context += `Active Alerts (${data.length}):\n`;
        data.slice(0, 5).forEach((alert: any) => {
          context += `- ${alert.title} (${alert.severity}) - ${alert.equipment?.name || 'System'}\n`;
        });
      } else {
        context += `No active alerts.\n`;
      }
      break;

    case 'downtime':
      if (data && data.byCategory) {
        context += `Downtime Analysis:\n`;
        context += `- Total downtime: ${data.total.toFixed(0)} minutes\n`;
        context += `- Number of incidents: ${data.incidents}\n`;
        
        const categories = Object.entries(data.byCategory)
          .sort(([,a], [,b]) => (b as number) - (a as number));
        
        if (categories.length > 0) {
          context += `\nDowntime by category:\n`;
          categories.forEach(([category, minutes]) => {
            const percentage = ((minutes as number) / data.total * 100).toFixed(1);
            context += `- ${category}: ${minutes} minutes (${percentage}%)\n`;
          });
          
          context += `\nLargest downtime category: ${categories[0][0]} with ${categories[0][1]} minutes\n`;
        }
      }
      break;
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
        
        // Analyze what data the user is asking for
        const analysis = analyzeQuery(lastMessage);
        let dataContext = '';
        
        // Send initial thought card
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'reasoning',
            title: 'Analyzing Request',
            body: `Querying ${analysis.queries.map(q => q.type).join(', ')} data from the last ${analysis.hoursAgo} hours...`
          }]
        })}\n\n`));
        
        // Execute queries in parallel
        const queryPromises = analysis.queries.map(async (query) => {
          try {
            let data;
            switch (query.type) {
              case 'oee':
                data = await queryOEEMetrics(query.timeRange);
                break;
              case 'production':
                data = await queryProductionMetrics(query.timeRange);
                break;
              case 'quality':
                data = await queryQualityMetrics(query.timeRange);
                break;
              case 'equipment':
                data = await queryEquipmentStatus();
                break;
              case 'downtime':
                data = await queryDowntimeReasons(query.timeRange);
                break;
              case 'alerts':
                data = await queryAlerts();
                break;
              case 'overview':
                // Fetch a bit of everything
                const [oee, prod, equip] = await Promise.all([
                  queryOEEMetrics(query.timeRange),
                  queryProductionMetrics(query.timeRange),
                  queryEquipmentStatus()
                ]);
                data = { oee, production: prod, equipment: equip };
                break;
            }
            return { type: query.type, data };
          } catch (error) {
            console.error(`Query error for ${query.type}:`, error);
            return { type: query.type, data: null, error: error.message };
          }
        });
        
        const results = await Promise.all(queryPromises);
        
        // Format data for AI
        results.forEach(result => {
          if (result.data) {
            const formatted = formatDataForAI(result.data, result.type);
            if (formatted) {
              dataContext += formatted + '\n';
            }
          }
        });
        
        // Send data retrieved thought card
        if (dataContext) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'insight',
              title: 'Data Retrieved',
              body: `Found ${results.filter(r => r.data).length} data sources with current metrics`
            }]
          })}\n\n`));
        }
        
        // Build enhanced prompt with real data
        let systemPrompt = MANUFACTURING_SYSTEM_PROMPT;
        
        if (dataContext) {
          systemPrompt += `\n\nCurrent Real-Time Data:\n${dataContext}`;
        } else {
          // Provide sample context when no data exists
          systemPrompt += `\n\nNote: No real data found in database. Using sample values for demonstration:
          
Current Manufacturing Metrics (Sample):
- Current defect rate: 2.3%
- OEE: 72.4% (Availability: 85.4%, Performance: 91.2%, Quality: 92.9%)
- Production: 12,543 units today at 156.2 units/hour
- Equipment: 3 of 4 machines running
- Largest downtime category: Equipment Failure (47 minutes, 38% of total downtime)
- Other downtime: Changeover (32 min), Material shortage (28 min), Quality issues (17 min)

Please answer the user's question based on these sample metrics.`;
        }
        
        const enhancedMessages = [
          { role: 'system', content: systemPrompt },
          ...messages
        ];
        
        // Check Ollama
        const testResponse = await fetch('http://127.0.0.1:11434/api/tags');
        if (!testResponse.ok) {
          throw new Error('Ollama is not running');
        }
        
        // Convert to prompt
        const prompt = enhancedMessages.map(m => {
          if (m.role === 'system') return m.content;
          return `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`;
        }).join('\n\n') + '\n\nAssistant:';
        
        // Call Ollama with optimized settings
        const ollamaResponse = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: body.model || 'gemma:2b',
            prompt: prompt,
            stream: true,
            options: {
              temperature: 0.7,
              num_thread: 4,
              num_predict: 500
            }
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
          thoughts: [{
            type: 'critique',
            title: 'Error',
            body: error instanceof Error ? error.message : 'Unknown error'
          }]
        })}\n\n`));
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that the database is connected and Ollama is running.`
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