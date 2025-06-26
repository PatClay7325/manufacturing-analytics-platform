import { NextRequest, NextResponse } from 'next/server';
import { ConversationalManufacturingAgent } from '@/lib/agents/ConversationalManufacturingAgent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId = 'debug-session', userId = 'debug-user' } = body;
    
    console.log('🔍 Debug: Starting chat processing...');
    console.log('📝 Message:', message);
    
    // Create agent instance
    const agent = new ConversationalManufacturingAgent();
    
    // Test internal methods
    const context = await (agent as any).loadContext(sessionId, userId);
    console.log('📋 Context loaded:', {
      messagesCount: context.messages.length,
      preferences: context.preferences
    });
    
    // Process query
    const processedQuery = await (agent as any).processQuery(message, context);
    console.log('🎯 Processed query:', {
      intent: processedQuery.intent,
      analysisType: processedQuery.analysisType,
      entities: processedQuery.entities,
      confidence: processedQuery.confidence
    });
    
    // Execute analysis
    console.log('🔄 Executing analysis...');
    let analysis;
    try {
      analysis = await (agent as any).executeAnalysis(processedQuery, context);
      console.log('✅ Analysis complete:', {
        type: analysis.type,
        hasData: !!analysis.data,
        dataKeys: analysis.data ? Object.keys(analysis.data) : []
      });
    } catch (analysisError) {
      console.error('❌ Analysis error:', analysisError);
      throw analysisError;
    }
    
    // Generate response
    console.log('💭 Generating response...');
    const response = await (agent as any).generateResponse(analysis, context);
    console.log('📄 Response generated:', {
      contentLength: response.content.length,
      hasVisualizations: !!response.visualizations,
      confidence: response.context.confidence
    });
    
    // Return debug info
    return NextResponse.json({
      success: true,
      debug: {
        query: processedQuery,
        analysisType: analysis.type,
        responseLength: response.content.length,
        confidence: response.context.confidence
      },
      response: {
        content: response.content.substring(0, 200) + '...',
        context: response.context
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}