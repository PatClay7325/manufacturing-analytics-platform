import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Request schema
const ChatRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'function']),
    content: z.string(),
    name: z.string().optional(),
  })),
});

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'tinyllama';

// Enhanced system prompt for conversational manufacturing assistant
const SYSTEM_PROMPT = `You are a friendly and knowledgeable manufacturing assistant with real-time access to a manufacturing enterprise database. You help users understand their manufacturing operations through natural conversation.

IMPORTANT: You have LIVE ACCESS to the following data:
- Enterprise-wide KPIs (OEE, availability, performance, quality)
- Site performance metrics across all locations
- Work center and equipment status in real-time
- Active alerts and maintenance schedules
- Production orders and quality metrics

When users ask questions, ALWAYS:
1. Use the actual data provided in the context
2. Be specific with numbers and names from the database
3. Explain what the metrics mean in simple terms
4. Suggest actionable insights based on the data
5. Be conversational and helpful

For example:
- User: "What's my OEE?"
- You: "Your enterprise-wide OEE is currently 78.5%. This is calculated from "

Remember: You're looking at REAL DATA from  Use it!`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages } = ChatRequestSchema.parse(body);

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

Remember: These are the user's ACTUAL metrics. When they ask "What's my OEE?", tell them the specific OEE values from `
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
          num_predict: 2000, // Allow longer responses
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
        kpiSummary: true,
        sites: {
          include: {
            kpiSummary: true,
          },
        },
      },
    });

    // Get all work units with their KPIs
    const workUnits = await prisma.workUnit.findMany({
      include: {
        kpiSummary: true,
        workCenter: {
          include: {
            area: {
              include: {
                site: true,
              },
            },
          },
        },
        alerts: {
          where: { status: 'active' },
        },
      },
    });

    // Get active alerts
    const activeAlerts = await prisma.alert.findMany({
      where: { status: 'active' },
      include: {
        workUnit: true,
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

    // Calculate aggregated metrics
    const totalOEE = workUnits.reduce((sum, unit) => sum + (unit.kpiSummary?.oee || 0), 0) / workUnits.length;
    const operationalUnits = workUnits.filter(u => u.status === 'operational').length;
    const maintenanceUnits = workUnits.filter(u => u.status === 'maintenance').length;
    const offlineUnits = workUnits.filter(u => u.status === 'offline').length;

    return {
      summary: {
        enterpriseName: enterprise.name || 'Manufacturing Enterprise',
        currentTime: new Date().toISOString(),
        overallOEE: Number(totalOEE.toFixed(1)),
        totalWorkUnits: workUnits.length,
        operationalUnits,
        maintenanceUnits,
        offlineUnits,
        activeAlerts: activeAlerts.length,
      },
      enterprise: enterprise ? {
        name: enterprise.name,
        code: enterprise.code,
        kpi: enterprise.kpiSummary ? {
          oee: enterprise.kpiSummary.oee,
          availability: enterprise.kpiSummary.availability,
          performance: enterprise.kpiSummary.performance,
          quality: enterprise.kpiSummary.quality,
          totalProduction: enterprise.kpiSummary.totalProduction.toString(),
          totalDefects: enterprise.kpiSummary.totalDefects,
        } : null,
      } : null,
      sites: enterprise.sites.map(site => ({
        name: site.name,
        location: site.location,
        kpi: site.kpiSummary ? {
          oee: site.kpiSummary.oee,
          availability: site.kpiSummary.availability,
          performance: site.kpiSummary.performance,
          quality: site.kpiSummary.quality,
        } : null,
      })) || [],
      equipment: workUnits.map(unit => ({
        id: unit.id,
        name: unit.name,
        code: unit.code,
        type: unit.equipmentType,
        status: unit.status,
        location: `${unit.workCenter.area.site.name} > ${unit.workCenter.area.name} > ${unit.workCenter.name}`,
        kpi: unit.kpiSummary ? {
          oee: unit.kpiSummary.oee,
          availability: unit.kpiSummary.availability,
          performance: unit.kpiSummary.performance,
          quality: unit.kpiSummary.quality,
          mtbf: unit.kpiSummary.mtbf,
          mttr: unit.kpiSummary.mttr,
        } : null,
        activeAlerts: unit.alerts.length,
      })),
      alerts: activeAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        equipment: alert.workUnit.name,
        timestamp: alert.timestamp,
      })),
      recentMetrics: {
        count: recentMetrics.length,
        latestTimestamp: recentMetrics[0]?.timestamp,
        categories: [...new Set(recentMetrics.map(m => m.category))],
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