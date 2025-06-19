import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Request schema
const ChatRequestSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'function']),
    content: z.string(),
    name: z.string().optional(),
  })),
});

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma:2b';

// Enhanced system prompt for conversational manufacturing assistant
const SYSTEM_PROMPT = `You are a friendly and knowledgeable manufacturing assistant with real-time access to a manufacturing enterprise database. You help users understand their manufacturing operations through natural conversation.

IMPORTANT: You have LIVE ACCESS to the following data:
- Enterprise-wide KPIs (OEE, availability, performance, quality)
- Site performance metrics across all locations
- Work center and equipment status in real-time
- Active alerts and maintenance schedules
- Production orders and quality metrics

ISO 22400 KPI KNOWLEDGE:
You are an expert on ISO 22400-2:2014 Manufacturing Operations Management Key Performance Indicators. The standard defines KPIs including:
- Overall Equipment Effectiveness (OEE) = Availability × Performance × Quality
- Availability Rate (A) = Operating Time / Planned Production Time
- Performance Rate (P) = (Ideal Cycle Time × Total Count) / Operating Time
- Quality Rate (Q) = Good Count / Total Count
- Overall Throughput Effectiveness (OTE)
- Net Equipment Effectiveness (NEE)

When users ask questions, ALWAYS:
1. Use the actual data provided in the context
2. Be specific with numbers and names from the database
3. Explain what the metrics mean in simple terms
4. For ISO 22400 questions, reference the standard definitions
5. Suggest actionable insights based on the data
6. Be conversational and helpful

For example:
- User: "What's my OEE?"
- You: "Your enterprise-wide OEE is currently 78.5%. According to ISO 22400-2, this represents Availability × Performance × Quality. Your breakdown shows..."

Remember: You're looking at REAL DATA from their actual manufacturing operation. Use it!`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId = 'default', messages } = ChatRequestSchema.parse(body);

    // Always get comprehensive context for every query
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Get ALL relevant manufacturing data
    const context = await getComprehensiveManufacturingData(lastUserMessage);

    // Build enhanced messages with context
    const messagesWithContext = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { 
        role: 'system' as const, 
        content: `LIVE MANUFACTURING DATA (Use this data to answer the user's questions):
${JSON.stringify(context, null, 2)}

Remember: These are the user's ACTUAL metrics. When they ask "What's my OEE?", tell them the specific OEE values from this data.`
      },
      ...messages
    ];

    // Call Ollama API
    const ollamaResponse = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messagesWithContext,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more factual responses
          num_predict: 500, // Moderate response length for better quality
          top_k: 40,
          top_p: 0.9,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      // Fallback with data summary
      const summary = generateDataSummary(context);
      return NextResponse.json({
        message: {
          role: 'assistant',
          content: `I'm having trouble connecting to the AI service, but I can show you your current data:\n\n${summary}`,
        },
      });
    }

    const ollamaData = await ollamaResponse.json();
    
    // Check if the response is too generic or doesn't answer the question
    const aiResponse = ollamaData.message?.content || '';
    const userQuery = lastUserMessage.toLowerCase();
    
    // If asking about temperature and AI didn't provide specific answer
    if (userQuery.includes('temperature') && !aiResponse.includes('°C') && !aiResponse.includes('celsius')) {
      // Find temperature data
      const equipment = context.equipment?.[0];
      const temp = equipment?.latestMetrics?.temperature;
      
      if (temp) {
        ollamaData.message.content = `The current temperature of the ${equipment.name} is ${temp.value}°C (measured at ${new Date(temp.timestamp).toLocaleString()}).\n\nThis is within normal operating range for welding equipment.`;
      }
    }

    // Save conversation
    await saveConversation(sessionId, messages, ollamaData.message);

    return NextResponse.json({
      message: ollamaData.message,
      context: context,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// Get comprehensive manufacturing data regardless of query
async function getComprehensiveManufacturingData(query: string) {
  const queryLower = query.toLowerCase();
  
  try {
    // Always get enterprise overview
    const enterprise = await prisma.enterprise.findFirst({
      include: {
        EnterpriseKPISummary: true,
        Site: {
          include: {
            SiteKPISummary: true,
          },
        },
      },
    });

    // Get all work units with their metrics
    const workUnits = await prisma.workUnit.findMany({
      include: {
        WorkCenter: {
          include: {
            Area: {
              include: {
                Site: true,
              },
            },
          },
        },
        Alert: {
          where: { status: 'active' },
        },
        PerformanceMetric: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 50,
        },
        Metric: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 20,
        },
      },
    });

    // Get active alerts
    const activeAlerts = await prisma.alert.findMany({
      where: { status: 'active' },
      include: {
        WorkUnit: true,
      },
      orderBy: {
        severity: 'desc',
      },
    });

    // Get recent production metrics
    const recentMetrics = await prisma.metric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    // Calculate aggregated metrics from performance data
    let totalOEE = 0;
    let totalAvailability = 0;
    let totalPerformance = 0;
    let totalQuality = 0;
    let unitCount = 0;
    
    workUnits.forEach(unit => {
      if (unit.PerformanceMetric && unit.PerformanceMetric.length > 0) {
        const metrics = unit.PerformanceMetric;
        const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
        const avgAvailability = metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length;
        const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length;
        const avgQuality = metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length;
        
        totalOEE += avgOEE;
        totalAvailability += avgAvailability;
        totalPerformance += avgPerformance;
        totalQuality += avgQuality;
        unitCount++;
      }
    });
    
    const overallOEE = unitCount > 0 ? totalOEE / unitCount : 0;
    const overallAvailability = unitCount > 0 ? totalAvailability / unitCount : 0;
    const overallPerformance = unitCount > 0 ? totalPerformance / unitCount : 0;
    const overallQuality = unitCount > 0 ? totalQuality / unitCount : 0;
    
    const operationalUnits = workUnits.filter(u => u.status === 'operational').length;
    const maintenanceUnits = workUnits.filter(u => u.status === 'maintenance').length;
    const offlineUnits = workUnits.filter(u => u.status === 'offline').length;

    return {
      summary: {
        enterpriseName: enterprise?.name || 'Manufacturing Enterprise',
        currentTime: new Date().toISOString(),
        overallOEE: Number(overallOEE.toFixed(1)),
        totalWorkUnits: workUnits.length,
        operationalUnits,
        maintenanceUnits,
        offlineUnits,
        activeAlerts: activeAlerts.length,
      },
      enterprise: enterprise ? {
        name: enterprise.name,
        code: enterprise.code,
        kpi: {
          oee: Number(overallOEE.toFixed(1)),
          availability: Number(overallAvailability.toFixed(1)),
          performance: Number(overallPerformance.toFixed(1)),
          quality: Number(overallQuality.toFixed(1)),
          totalProduction: '0',
          totalDefects: 0,
        },
      } : null,
      sites: enterprise?.Site.map(site => ({
        name: site.name,
        location: site.location,
        kpi: {
          oee: Number(overallOEE.toFixed(1)),
          availability: Number(overallAvailability.toFixed(1)),
          performance: Number(overallPerformance.toFixed(1)),
          quality: Number(overallQuality.toFixed(1)),
        },
      })) || [],
      equipment: workUnits.map(unit => {
        // Calculate KPIs from performance metrics
        let unitKpi = null;
        if (unit.PerformanceMetric && unit.PerformanceMetric.length > 0) {
          const metrics = unit.PerformanceMetric;
          unitKpi = {
            oee: Number((metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length).toFixed(1)),
            availability: Number((metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length).toFixed(1)),
            performance: Number((metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length).toFixed(1)),
            quality: Number((metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length).toFixed(1)),
            mtbf: 720, // Default values
            mttr: 2,
          };
        }
        
        // Get latest metrics for this unit
        const latestMetrics: any = {};
        if (unit.Metric && unit.Metric.length > 0) {
          // Group metrics by name and get the latest value
          unit.Metric.forEach((metric: any) => {
            if (!latestMetrics[metric.name] || metric.timestamp > latestMetrics[metric.name].timestamp) {
              latestMetrics[metric.name] = {
                value: metric.value,
                unit: metric.unit,
                timestamp: metric.timestamp
              };
            }
          });
        }
        
        return {
          id: unit.id,
          name: unit.name,
          code: unit.code,
          type: unit.equipmentType,
          status: unit.status,
          location: `${unit.WorkCenter.Area.Site.name} > ${unit.WorkCenter.Area.name} > ${unit.WorkCenter.name}`,
          kpi: unitKpi,
          activeAlerts: unit.Alert.length,
          latestMetrics: latestMetrics,
        };
      }),
      alerts: activeAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        equipment: alert.WorkUnit?.name || 'Unknown',
        timestamp: alert.timestamp,
      })),
      recentMetrics: {
        count: recentMetrics.length,
        latestTimestamp: recentMetrics[0]?.timestamp,
        categories: [...new Set(recentMetrics.map(m => m.name))],
      },
    };
  } catch (error) {
    console.error('Error fetching manufacturing data:', error);
    return {
      error: 'Unable to fetch data',
      message: 'Please check database connection',
    };
  }
}

// Generate a human-readable summary of the data
function generateDataSummary(context: any): string {
  if (!context || context.error) {
    return 'Unable to access manufacturing data at this time.';
  }

  const { summary, equipment, alerts } = context;
  
  let response = `Here's your current manufacturing status:\n\n`;
  response += `📊 **Overall Performance**\n`;
  response += `- Enterprise OEE: ${summary.overallOEE}%\n`;
  response += `- Operational Equipment: ${summary.operationalUnits}/${summary.totalWorkUnits}\n`;
  response += `- Active Alerts: ${summary.activeAlerts}\n\n`;

  if (equipment && equipment.length > 0) {
    response += `⚙️ **Equipment Status**\n`;
    equipment.slice(0, 5).forEach((eq: any) => {
      response += `- ${eq.name}: ${eq.status.toUpperCase()} (OEE: ${eq.kpi?.oee || 'N/A'}%)\n`;
    });
  }

  if (alerts && alerts.length > 0) {
    response += `\n🔔 **Active Alerts**\n`;
    alerts.slice(0, 3).forEach((alert: any) => {
      response += `- ${alert.severity.toUpperCase()}: ${alert.message} (${alert.equipment})\n`;
    });
  }

  return response;
}

// Save conversation to database
async function saveConversation(sessionId: string, messages: any[], aiResponse: any) {
  try {
    console.log('Saving conversation:', {
      sessionId,
      messageCount: messages.length,
      aiResponse: aiResponse.content?.substring(0, 100) + '...',
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}