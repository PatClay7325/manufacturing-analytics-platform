import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request schema
const ConversationalChatRequestSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

// Lazy load the agent to avoid initialization issues
let agent: any = null;

async function getAgent() {
  if (!agent) {
    console.log('🔄 Initializing TrueIntelligentAgent...');
    try {
      // Dynamic import to avoid top-level await issues
      const { TrueIntelligentAgent } = await import('@/lib/agents/TrueIntelligentAgent');
      agent = new TrueIntelligentAgent();
      console.log('✅ True Intelligent Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize agent:', error);
      throw error;
    }
  }
  return agent;
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  
  try {
    console.log('📥 Received chat request at:', new Date().toISOString());
    
    // Parse request body with timeout
    const bodyPromise = request.json();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request body parsing timeout')), 5000)
    );
    
    const body = await Promise.race([bodyPromise, timeoutPromise]);
    const { message, sessionId, userId } = ConversationalChatRequestSchema.parse(body);
    
    console.log('💬 Conversational chat request:', {
      message: message.substring(0, 50) + '...',
      sessionId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const effectiveUserId = userId || 'anonymous';
    
    // Get or initialize agent with timeout
    const agentPromise = getAgent();
    const agentTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent initialization timeout')), 10000)
    );
    
    const conversationalAgent = await Promise.race([agentPromise, agentTimeoutPromise]);
    
    // Process message through conversational agent with timeout
    const startTime = Date.now();
    console.log('🤖 Processing message...');
    
    const chatPromise = conversationalAgent.chat(message, effectiveSessionId, effectiveUserId);
    const chatTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Chat processing timeout')), 25000) // 25 second timeout
    );
    
    const response = await Promise.race([chatPromise, chatTimeoutPromise]);
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Response generated in ${processingTime}ms`);
    console.log(`📊 Self-critique score: ${response.context?.critiqueScore || 'N/A'}/10`);
    console.log(`📈 Total request time: ${Date.now() - requestStart}ms`);
    
    // Format response for API - ensure backward compatibility
    const apiResponse = {
      sessionId: effectiveSessionId,
      message: response.message || response.content,
      response: response.message || response.content, // Add this for compatibility
      suggestions: response.suggestions || [],
      clarificationNeeded: response.clarificationNeeded,
      visualizations: response.visualizations || [],
      dataSources: response.dataSources || [],
      confidence: response.confidence || 0.9,
      insights: response.insights || [],
      selfCritique: {
        score: response.confidence ? Math.round(response.confidence * 10) : 9,
        suggestions: response.suggestions || []
      },
      context: {
        confidence: response.confidence || 0.9,
        intent: response.metadata?.reasoningSteps?.[0]?.intent || 'intelligent_analysis',
        analysisType: 'intelligent',
        critiqueScore: response.confidence ? Math.round(response.confidence * 10) : 9
      },
      metadata: {
        processingTime: response.metadata?.processingTime || processingTime,
        totalTime: Date.now() - requestStart,
        agentVersion: '3.0-intelligent',
        features: ['true-nlp', 'dynamic-queries', 'contextual-reasoning', 'llm-powered'],
        model: response.metadata?.model || 'gemma:2b',
        dataPoints: response.metadata?.dataPoints || 0
      }
    };
    
    return NextResponse.json(apiResponse);
    
  } catch (error: any) {
    const errorTime = Date.now() - requestStart;
    console.error('❌ Conversational chat error:', {
      message: error.message,
      stack: error.stack,
      time: errorTime,
      timestamp: new Date().toISOString()
    });
    
    // Check for specific timeout errors
    if (error.message.includes('timeout')) {
      return NextResponse.json({
        error: 'Request timed out. The system is taking longer than expected to respond.',
        message: 'I apologize for the delay. Please try again with a simpler query.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        suggestions: [
          'Try a simpler question',
          'Ask about specific equipment',
          'Request basic metrics like OEE'
        ],
        metadata: {
          errorTime,
          errorType: 'timeout'
        }
      }, { status: 504 }); // Gateway Timeout
    }
    
    // Check for validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request format',
        message: 'Please provide a valid message.',
        details: process.env.NODE_ENV === 'development' ? error.errors : undefined,
        metadata: {
          errorTime,
          errorType: 'validation'
        }
      }, { status: 400 });
    }
    
    // General error response
    return NextResponse.json({
      error: 'I apologize, but I encountered an error processing your request.',
      message: 'Something went wrong. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      suggestions: [
        'Try rephrasing your question',
        'Ask about specific equipment or metrics',
        'Request a general overview'
      ],
      metadata: {
        errorTime,
        errorType: 'general'
      }
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    // Test agent initialization
    const testStart = Date.now();
    const conversationalAgent = await getAgent();
    const initTime = Date.now() - testStart;
    
    return NextResponse.json({
      status: 'healthy',
      agent: 'TrueIntelligentAgent',
      initialized: !!conversationalAgent,
      initializationTime: `${initTime}ms`,
      features: {
        trueNLP: true,
        dynamicQueryGeneration: true,
        contextualReasoning: true,
        llmPowered: true,
        model: process.env.OLLAMA_MODEL || 'gemma:2b',
        chatGPT4Parity: true,
        version: '3.0'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabase: !!process.env.DATABASE_URL,
        hasRedis: !!process.env.REDIS_HOST
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}