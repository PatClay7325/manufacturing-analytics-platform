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

// Export for compatibility with [id]/route.ts
export const chatSessions: any[] = [];

// Intelligent query classification
const QUERY_PATTERNS = {
  EQUIPMENT_SPECIFIC: {
    patterns: ['cnc', 'welder', 'welding', 'robot', 'machine', 'pump', 'compressor', 'grinder', 'mill'],
    keywords: ['equipment', 'machine', 'unit', 'device']
  },
  SITE_SPECIFIC: {
    patterns: ['detroit', 'michigan', 'north america', 'stuttgart', 'germany', 'europe', 'yokohama', 'japan', 'asia'],
    keywords: ['site', 'location', 'facility', 'plant']
  },
  METRICS_SPECIFIC: {
    patterns: ['temperature', 'pressure', 'vibration', 'speed', 'power', 'flow', 'torque', 'acoustic'],
    keywords: ['metric', 'sensor', 'reading', 'measurement', 'value']
  },
  KPI_SPECIFIC: {
    patterns: ['oee', 'availability', 'performance', 'quality', 'efficiency', 'productivity'],
    keywords: ['kpi', 'indicator', 'ratio', 'percentage']
  },
  ALERTS_SPECIFIC: {
    patterns: ['alert', 'alarm', 'issue', 'problem', 'fault', 'error', 'maintenance', 'repair'],
    keywords: ['alert', 'warning', 'critical', 'urgent']
  },
  QUALITY_SPECIFIC: {
    patterns: ['quality', 'defect', 'scrap', 'rework', 'specification', 'tolerance', 'deviation'],
    keywords: ['quality', 'conformance', 'standard', 'spec']
  },
  TIME_SPECIFIC: {
    patterns: ['today', 'yesterday', 'week', 'month', 'hour', 'recent', 'latest', 'current', 'now'],
    keywords: ['time', 'period', 'date', 'when']
  }
};

// Enhanced system prompt for truly conversational AI
const SYSTEM_PROMPT = `You are an intelligent manufacturing assistant with real-time database access to a comprehensive manufacturing enterprise.

CRITICAL INSTRUCTIONS:
1. You have LIVE ACCESS to actual manufacturing data - use it!
2. Always reference specific data from the context provided
3. Be conversational but precise with numbers and names
4. When users ask questions, provide specific answers using the actual data
5. If data is missing, explain what you cannot find and suggest alternatives

AVAILABLE DATA TYPES:
- Real-time equipment metrics (temperature, pressure, vibration, etc.)
- Performance KPIs (OEE, availability, performance, quality)
- Active alerts and maintenance issues
- Quality measurements and deviations
- Multi-site operations data
- Equipment specifications and status

RESPONSE STYLE:
- Start with direct answers using real data
- Include specific numbers, names, and timestamps
- Explain what the data means in context
- Suggest actionable insights when appropriate
- Be helpful and conversational, not robotic

Remember: You're looking at REAL manufacturing data. Use it to provide valuable insights!`;

// Intelligent data fetching based on query analysis
async function getIntelligentManufacturingData(query: string) {
  const queryLower = query.toLowerCase();
  console.log(`🔍 Analyzing query: "${query}"`);
  
  try {
    let context: any = {
      queryAnalysis: {
        originalQuery: query,
        detectedPatterns: [],
        dataFetched: []
      }
    };

    // Analyze query patterns
    const detectedPatterns = [];
    for (const [category, patterns] of Object.entries(QUERY_PATTERNS)) {
      const hasPattern = patterns.patterns.some(p => queryLower.includes(p)) || 
                        patterns.keywords.some(k => queryLower.includes(k));
      if (hasPattern) {
        detectedPatterns.push(category);
      }
    }
    context.queryAnalysis.detectedPatterns = detectedPatterns;

    // Always get basic enterprise info (lightweight)
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
    context.enterprise = enterprise;
    context.queryAnalysis.dataFetched.push('enterprise');

    // Equipment-specific queries
    if (detectedPatterns.includes('EQUIPMENT_SPECIFIC')) {
      console.log('🏭 Fetching equipment-specific data...');
      
      // Build dynamic where clause based on equipment mentioned
      let equipmentWhere: any = {};
      
      if (queryLower.includes('cnc')) {
        equipmentWhere.equipmentType = { contains: 'CNC' };
      } else if (queryLower.includes('weld')) {
        equipmentWhere.equipmentType = { contains: 'Welding' };
      } else if (queryLower.includes('robot')) {
        equipmentWhere.equipmentType = { contains: 'Robot' };
      } else if (queryLower.includes('paint')) {
        equipmentWhere.equipmentType = { contains: 'Paint' };
      } else if (queryLower.includes('grind')) {
        equipmentWhere.equipmentType = { contains: 'Grinding' };
      }

      const equipment = await prisma.workUnit.findMany({
        where: equipmentWhere,
        take: queryLower.includes('all') ? 50 : 5,
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
            take: 3,
          },
          PerformanceMetric: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });
      
      context.equipment = equipment;
      context.queryAnalysis.dataFetched.push('equipment');
    }

    // Site-specific queries
    if (detectedPatterns.includes('SITE_SPECIFIC')) {
      console.log('🌍 Fetching site-specific data...');
      
      let siteWhere: any = {};
      if (queryLower.includes('detroit') || queryLower.includes('america') || queryLower.includes('us')) {
        siteWhere.code = 'NA-HUB';
      } else if (queryLower.includes('stuttgart') || queryLower.includes('germany') || queryLower.includes('europe')) {
        siteWhere.code = 'EU-CENTER';
      } else if (queryLower.includes('yokohama') || queryLower.includes('japan') || queryLower.includes('asia')) {
        siteWhere.code = 'APAC-FAC';
      }

      const sites = await prisma.site.findMany({
        where: siteWhere,
        include: {
          SiteKPISummary: true,
          Area: {
            include: {
              WorkCenter: {
                include: {
                  WorkUnit: {
                    take: 3,
                    include: {
                      PerformanceMetric: {
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      context.sites = sites;
      context.queryAnalysis.dataFetched.push('sites');
    }

    // Metrics-specific queries
    if (detectedPatterns.includes('METRICS_SPECIFIC')) {
      console.log('📊 Fetching sensor metrics...');
      
      let metricNames = [];
      if (queryLower.includes('temperature')) metricNames.push('TEMPERATURE');
      if (queryLower.includes('pressure')) metricNames.push('PRESSURE');
      if (queryLower.includes('vibration')) metricNames.push('VIBRATION');
      if (queryLower.includes('speed')) metricNames.push('SPEED');
      if (queryLower.includes('power')) metricNames.push('POWER_CONSUMPTION');
      if (queryLower.includes('flow')) metricNames.push('FLOW_RATE');
      if (queryLower.includes('torque')) metricNames.push('TORQUE');

      const timeFilter = new Date();
      if (queryLower.includes('hour')) {
        timeFilter.setHours(timeFilter.getHours() - 1);
      } else if (queryLower.includes('today')) {
        timeFilter.setHours(0, 0, 0, 0);
      } else {
        timeFilter.setHours(timeFilter.getHours() - 4); // Default 4 hours
      }

      const metrics = await prisma.metric.findMany({
        where: {
          name: metricNames.length > 0 ? { in: metricNames } : undefined,
          timestamp: { gte: timeFilter },
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });
      
      context.metrics = metrics;
      context.queryAnalysis.dataFetched.push('metrics');
    }

    // Alerts-specific queries
    if (detectedPatterns.includes('ALERTS_SPECIFIC')) {
      console.log('🚨 Fetching alerts...');
      
      let alertWhere: any = { status: 'active' };
      if (queryLower.includes('critical') || queryLower.includes('high')) {
        alertWhere.severity = 'high';
      } else if (queryLower.includes('medium')) {
        alertWhere.severity = 'medium';
      }

      const alerts = await prisma.alert.findMany({
        where: alertWhere,
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true,
            },
          },
        },
        orderBy: [
          { severity: 'desc' },
          { timestamp: 'desc' },
        ],
        take: 10,
      });
      
      context.alerts = alerts;
      context.queryAnalysis.dataFetched.push('alerts');
    }

    // Quality-specific queries
    if (detectedPatterns.includes('QUALITY_SPECIFIC')) {
      console.log('🎯 Fetching quality data...');
      
      const qualityMetrics = await prisma.qualityMetric.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          isWithinSpec: queryLower.includes('issue') || queryLower.includes('problem') ? false : undefined,
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 15,
      });
      
      context.qualityMetrics = qualityMetrics;
      context.queryAnalysis.dataFetched.push('quality');
    }

    // KPI-specific queries
    if (detectedPatterns.includes('KPI_SPECIFIC')) {
      console.log('📈 Fetching KPI data...');
      
      const performanceData = await prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true,
              status: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 30,
      });
      
      context.performanceData = performanceData;
      context.queryAnalysis.dataFetched.push('kpis');
    }

    // If no specific patterns detected, get a general overview
    if (detectedPatterns.length === 0) {
      console.log('📋 Fetching general overview...');
      
      const [generalEquipment, generalAlerts, recentMetrics] = await Promise.all([
        prisma.workUnit.findMany({
          take: 5,
          include: {
            PerformanceMetric: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            Alert: {
              where: { status: 'active' },
              take: 1,
            },
          },
        }),
        prisma.alert.findMany({
          where: { status: 'active' },
          take: 5,
          orderBy: { severity: 'desc' },
          include: {
            WorkUnit: {
              select: { name: true, equipmentType: true },
            },
          },
        }),
        prisma.metric.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            WorkUnit: {
              select: { name: true, equipmentType: true },
            },
          },
        }),
      ]);
      
      context.overview = {
        equipment: generalEquipment,
        alerts: generalAlerts,
        recentMetrics: recentMetrics,
      };
      context.queryAnalysis.dataFetched.push('overview');
    }

    console.log(`✅ Data fetched: ${context.queryAnalysis.dataFetched.join(', ')}`);
    return context;

  } catch (error) {
    console.error('❌ Error fetching intelligent data:', error);
    return {
      error: 'Unable to fetch manufacturing data',
      queryAnalysis: {
        originalQuery: query,
        error: error.message,
      },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId = 'default', messages } = ChatRequestSchema.parse(body);

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Check if this is a manufacturing engineering query
    const isManufacturingQuery = isManufacturingEngineeringQuery(lastUserMessage);
    
    if (isManufacturingQuery) {
      console.log('🤖 Routing to Manufacturing Engineering Agent...');
      
      // Call the Manufacturing Engineering Agent
      const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/agents/manufacturing-engineering/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: lastUserMessage,
          parameters: {
            sessionId,
            context: { messages }
          }
        }),
      });

      if (agentResponse.ok) {
        const agentResult = await agentResponse.json();
        
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: agentResult.data.content
          },
          agentResponse: agentResult.data,
          isAgentResponse: true,
        });
      } else {
        console.warn('Agent failed, falling back to Ollama...');
      }
    }

    // Fallback to original intelligent query processing
    console.log('🤖 Using standard intelligent query processing...');
    const context = await getIntelligentManufacturingData(lastUserMessage);

    // Build enhanced messages with context
    const messagesWithContext = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { 
        role: 'system' as const, 
        content: `LIVE MANUFACTURING DATA (Use this specific data to answer the user's question):

Query Analysis: ${JSON.stringify(context.queryAnalysis, null, 2)}

Manufacturing Context: ${JSON.stringify(context, null, 2)}

IMPORTANT: The user asked: "${lastUserMessage}"
Use the specific data provided above to give a precise, helpful answer. Reference actual equipment names, numbers, and timestamps from `
      },
      ...messages
    ];

    // Call Ollama API with intelligent context
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
          temperature: 0.2, // Lower for more factual responses
          num_predict: 1000, // Increased for detailed responses
          top_k: 40,
          top_p: 0.9,
          num_ctx: 4096, // Larger context window for complex data
          repeat_penalty: 1.1,
        },
        keep_alive: '5m',
      }),
    });

    if (!ollamaResponse.ok) {
      console.error('Ollama API error:', ollamaResponse.statusText);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    const ollamaData = await ollamaResponse.json();

    return NextResponse.json({
      message: ollamaData.message,
      context: context,
      debug: {
        patternsDetected: context.queryAnalysis?.detectedPatterns || [],
        dataFetched: context.queryAnalysis?.dataFetched || [],
        queryAnalyzed: lastUserMessage,
      },
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// Advanced Manufacturing Engineering Query Classification
interface QueryPattern {
  patterns: (string | RegExp)[];
  weight: number;
  category: string;
}

const MANUFACTURING_PATTERNS: QueryPattern[] = [
  // OEE and Performance Analysis
  {
    patterns: [
      /\b(oee|overall equipment effectiveness)\b/i,
      /\b(equipment|machine|unit).*(performance|efficiency)\b/i,
      /\b(availability|performance|quality).*(rate|ratio|percentage)\b/i,
      /\bhow.*(efficient|performing|effective)\b/i
    ],
    weight: 10,
    category: 'oee_analysis'
  },
  
  // Downtime Analysis - CRITICAL for your use case
  {
    patterns: [
      /\b(major|main|primary|biggest|top|worst).*(downtime|contributor|cause|issue|problem)\b/i,
      /\bwhat.*(causing|contributor|downtime|issue|problem)\b/i,
      /\b(downtime|failure|breakdown).*(analysis|contributor|cause|reason)\b/i,
      /\bwhich.*(equipment|machine|unit).*(down|failing|broken|issues)\b/i,
      /\bwhy.*(down|failing|stopped|not working)\b/i,
      /\b(unplanned|unexpected).*(downtime|stoppage|failure)\b/i
    ],
    weight: 15,
    category: 'downtime_analysis'
  },
  
  // Quality Analysis
  {
    patterns: [
      /\b(quality|defect|scrap|rework).*(issue|problem|analysis|rate)\b/i,
      /\bwhat.*(quality|defect|scrap)\b/i,
      /\b(out of spec|non.?conforming|reject)\b/i,
      /\b(first pass yield|fpy|quality rate)\b/i
    ],
    weight: 10,
    category: 'quality_analysis'
  },
  
  // Maintenance Analysis
  {
    patterns: [
      /\b(maintenance|mtbf|mttr|reliability).*(analysis|schedule|due|required)\b/i,
      /\bwhen.*(maintenance|service|repair)\b/i,
      /\b(preventive|predictive|condition).*(maintenance)\b/i,
      /\b(bearing|motor|pump|valve).*(wear|condition|health)\b/i
    ],
    weight: 10,
    category: 'maintenance_analysis'
  },
  
  // Production Analysis
  {
    patterns: [
      /\b(production|output|throughput).*(rate|analysis|performance)\b/i,
      /\bhow much.*(producing|output|making)\b/i,
      /\b(cycle time|takt time|production speed)\b/i
    ],
    weight: 8,
    category: 'production_analysis'
  },
  
  // Root Cause Analysis
  {
    patterns: [
      /\b(root cause|why|reason|cause).*(analysis|investigation)\b/i,
      /\bwhat.*(causing|reason|root cause)\b/i,
      /\b(fishbone|pareto|5 why|cause and effect)\b/i,
      /\banalyze.*(problem|issue|failure)\b/i
    ],
    weight: 12,
    category: 'root_cause_analysis'
  },
  
  // Equipment-Specific Queries
  {
    patterns: [
      /\b(cnc|welder|robot|pump|compressor|machine|equipment).*(status|condition|performance)\b/i,
      /\bshow me.*(equipment|machine|cnc|welder|robot)\b/i,
      /\bwhich.*(equipment|machine|unit).*(need|require|have)\b/i,
      /\b(temperature|pressure|vibration|speed).*(reading|data|sensor)\b/i
    ],
    weight: 8,
    category: 'equipment_analysis'
  },
  
  // Trend Analysis
  {
    patterns: [
      /\b(trend|trending|history|over time|historical)\b/i,
      /\bshow.*(trend|history|past|previous)\b/i,
      /\bhow.*(changed|improved|degraded|evolved)\b/i
    ],
    weight: 6,
    category: 'trending_analysis'
  },
  
  // ISO Standards References
  {
    patterns: [
      /\biso.?(22400|14224|9001)\b/i,
      /\b(standard|benchmark|best practice)\b/i
    ],
    weight: 12,
    category: 'standards_compliance'
  }
];

// Advanced query classification function
function isManufacturingEngineeringQuery(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Quick reject for very short queries or obviously non-manufacturing queries
  if (queryLower.length < 3) return false;
  
  let totalScore = 0;
  const detectedCategories = new Set<string>();
  
  // Score against all patterns
  for (const patternGroup of MANUFACTURING_PATTERNS) {
    let groupScore = 0;
    
    for (const pattern of patternGroup.patterns) {
      if (typeof pattern === 'string') {
        if (queryLower.includes(pattern.toLowerCase())) {
          groupScore = Math.max(groupScore, patternGroup.weight);
          detectedCategories.add(patternGroup.category);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(queryLower)) {
          groupScore = Math.max(groupScore, patternGroup.weight);
          detectedCategories.add(patternGroup.category);
        }
      }
    }
    
    totalScore += groupScore;
  }
  
  // Additional scoring for question patterns that indicate analysis requests
  const analysisIndicators = [
    /^(what|which|how|why|show|analyze|explain|tell me)/i,
    /\?(analysis|data|information|details|status)/i,
    /(help|assist|show|display|provide).*(with|me)/i
  ];
  
  for (const indicator of analysisIndicators) {
    if (indicator.test(queryLower)) {
      totalScore += 2;
    }
  }
  
  // Manufacturing context words boost
  const contextWords = [
    'manufacturing', 'factory', 'plant', 'production', 'operations',
    'equipment', 'machine', 'line', 'process', 'facility'
  ];
  
  for (const word of contextWords) {
    if (queryLower.includes(word)) {
      totalScore += 3;
    }
  }
  
  // Debug logging for development
  console.log(`🔍 Query Classification Debug:
    Query: "${query}"
    Total Score: ${totalScore}
    Categories: ${Array.from(detectedCategories).join(', ')}
    Threshold: 8
    Will Use Agent: ${totalScore >= 8}`);
  
  // Threshold for routing to Manufacturing Engineering Agent
  return totalScore >= 8;
}

// Fallback keyword detection for backward compatibility
function hasManufacturingKeywords(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  const criticalKeywords = [
    'oee', 'downtime', 'quality', 'maintenance', 'efficiency',
    'equipment', 'production', 'manufacturing', 'analysis'
  ];
  
  return criticalKeywords.some(keyword => queryLower.includes(keyword));
}

// Save conversation to database (placeholder)
async function saveConversation(sessionId: string, messages: any[], aiResponse: any) {
  try {
    console.log('💾 Saving conversation:', {
      sessionId,
      messageCount: messages.length,
      aiResponse: aiResponse.content?.substring(0, 100) + '...',
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}