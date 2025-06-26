import { NextRequest, NextResponse } from 'next/server';

// Simple debug endpoint to test chat functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, userId } = body;
    
    console.log('🔍 Debug endpoint received:', { message, sessionId, userId });
    
    // Return a mock response in the expected format
    const mockResponse = {
      sessionId: sessionId || 'debug-session',
      message: `I received your message: "${message}". The OEE for all equipment today shows:
      
• CNC-001: OEE 85.2% (Availability: 92%, Performance: 95%, Quality: 97.5%)
• CNC-002: OEE 78.5% (Availability: 88%, Performance: 92%, Quality: 97%)
• ROBOT-001: OEE 91.3% (Availability: 95%, Performance: 98%, Quality: 98%)

The average OEE across all equipment is 85.0%, which is above the target of 80%.`,
      response: `I received your message: "${message}". This is a debug response.`,
      suggestions: [
        'View detailed OEE breakdown by shift',
        'Check equipment with lowest performance',
        'Review quality issues for CNC-002'
      ],
      dataSources: ['production', 'oee', 'equipment'],
      confidence: 0.95,
      selfCritique: {
        score: 9,
        suggestions: ['Could include trend analysis', 'Add comparison to yesterday']
      },
      context: {
        confidence: 0.95,
        intent: 'oee_analysis',
        analysisType: 'oee_analysis',
        critiqueScore: 9
      }
    };
    
    console.log('🔍 Returning mock response');
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'debug-conversational',
    timestamp: new Date().toISOString()
  });
}