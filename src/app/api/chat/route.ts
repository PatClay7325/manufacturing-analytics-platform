import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TrueIntelligentAgent } from '@/lib/agents/TrueIntelligentAgent';

// Request schema
const ChatRequestSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'function']),
    content: z.string(),
    name: z.string().optional(),
  })),
});

// Lazy load the agent
let agent: TrueIntelligentAgent | null = null;

function getAgent() {
  if (!agent) {
    agent = new TrueIntelligentAgent();
  }
  return agent;
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  
  try {
    const body = await request.json();
    const { sessionId, messages } = ChatRequestSchema.parse(body);
    
    // Get the latest user message
    const userMessages = messages.filter(m => m.role === 'user');
    const latestMessage = userMessages[userMessages.length - 1];
    
    if (!latestMessage) {
      return NextResponse.json({
        error: 'No user message found',
        message: 'Please provide a message to process.'
      }, { status: 400 });
    }
    
    // Get or create session ID
    const effectiveSessionId = sessionId || `session-${Date.now()}`;
    
    // Process with TrueIntelligentAgent
    const intelligentAgent = getAgent();
    const response = await intelligentAgent.chat(
      latestMessage.content,
      effectiveSessionId,
      'user'
    );
    
    // Format response for compatibility
    return NextResponse.json({
      sessionId: effectiveSessionId,
      message: {
        role: 'assistant',
        content: response.message
      },
      context: {
        equipment: response.metadata?.dataPoints > 0 ? ['Data retrieved'] : [],
        metrics: response.insights || [],
        confidence: response.confidence
      },
      debug: {
        queryAnalyzed: response.metadata?.reasoningSteps?.length > 0,
        processingTime: response.metadata?.processingTime
      },
      executionTime: response.metadata?.processingTime,
      rowCount: response.metadata?.dataPoints || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Even on error, try to provide intelligent response
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request format',
        message: 'Please provide valid messages array.'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'Processing error',
      message: 'I encountered an issue processing your request. Please try again.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    agent: 'TrueIntelligentAgent',
    model: process.env.OLLAMA_MODEL || 'gemma:2b',
    features: [
      'Natural language understanding',
      'Dynamic query generation',
      'Contextual reasoning',
      'Multi-turn conversations'
    ],
    timestamp: new Date().toISOString()
  });
}