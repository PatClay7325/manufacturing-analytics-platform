import { NextRequest, NextResponse } from 'next/server';

// Test the query routing logic without executing the full chat
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Import the classification function (we'll replicate it here for testing)
    const result = testQueryClassification(query);
    
    return NextResponse.json({
      query,
      classification: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to test routing' },
      { status: 500 }
    );
  }
}

// Test common manufacturing queries
export async function GET() {
  const testQueries = [
    "what is my major downtime contributor?",
    "show me current OEE",
    "which equipment needs maintenance?",
    "what are the quality issues?",
    "how is my production rate?",
    "analyze root cause of failures",
    "show CNC machine status",
    "what's the weather today?", // Non-manufacturing
    "temperature readings for welding robots",
    "equipment performance trending"
  ];

  const results = testQueries.map(query => ({
    query,
    classification: testQueryClassification(query)
  }));

  return NextResponse.json({
    message: 'Manufacturing Engineering Agent Query Classification Test',
    results,
    timestamp: new Date().toISOString()
  });
}

// Replicated classification logic for testing
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
  
  // Downtime Analysis - CRITICAL
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

function testQueryClassification(query: string) {
  const queryLower = query.toLowerCase().trim();
  
  if (queryLower.length < 3) {
    return {
      useAgent: false,
      reason: 'Query too short',
      totalScore: 0,
      detectedCategories: [],
      breakdown: {}
    };
  }
  
  let totalScore = 0;
  const detectedCategories = new Set<string>();
  const breakdown: Record<string, number> = {};
  
  // Score against all patterns
  for (const patternGroup of MANUFACTURING_PATTERNS) {
    let groupScore = 0;
    const matchedPatterns: string[] = [];
    
    for (const pattern of patternGroup.patterns) {
      if (typeof pattern === 'string') {
        if (queryLower.includes(pattern.toLowerCase())) {
          groupScore = Math.max(groupScore, patternGroup.weight);
          detectedCategories.add(patternGroup.category);
          matchedPatterns.push(pattern);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(queryLower)) {
          groupScore = Math.max(groupScore, patternGroup.weight);
          detectedCategories.add(patternGroup.category);
          matchedPatterns.push(pattern.source);
        }
      }
    }
    
    if (groupScore > 0) {
      breakdown[patternGroup.category] = groupScore;
    }
    totalScore += groupScore;
  }
  
  // Additional scoring
  const analysisIndicators = [
    /^(what|which|how|why|show|analyze|explain|tell me)/i,
    /\?(analysis|data|information|details|status)/i,
    /(help|assist|show|display|provide).*(with|me)/i
  ];
  
  let analysisBonus = 0;
  for (const indicator of analysisIndicators) {
    if (indicator.test(queryLower)) {
      analysisBonus += 2;
    }
  }
  
  const contextWords = [
    'manufacturing', 'factory', 'plant', 'production', 'operations',
    'equipment', 'machine', 'line', 'process', 'facility'
  ];
  
  let contextBonus = 0;
  for (const word of contextWords) {
    if (queryLower.includes(word)) {
      contextBonus += 3;
    }
  }
  
  totalScore += analysisBonus + contextBonus;
  
  const threshold = 8;
  const useAgent = totalScore >= threshold;
  
  return {
    useAgent,
    totalScore,
    threshold,
    detectedCategories: Array.from(detectedCategories),
    breakdown: {
      ...breakdown,
      analysisBonus,
      contextBonus
    },
    confidence: Math.min(1.0, totalScore / 20),
    recommendation: useAgent 
      ? 'Route to Manufacturing Engineering Agent' 
      : 'Use standard chat processing'
  };
}