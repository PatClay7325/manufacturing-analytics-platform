import { NextRequest, NextResponse } from 'next/server';
import { manufacturingChatService } from '@/services/manufacturingChatService';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config, sessionId = `diag-${Date.now()}` } = await request.json();
  
  try {
    // Test different manufacturing queries with live data
    const testQueries = [
      {
        query: 'What is the current OEE?',
        expectedContext: ['oee', 'metrics'],
      },
      {
        query: 'Show me equipment status',
        expectedContext: ['equipment', 'status'],
      },
      {
        query: 'Are there any active alerts?',
        expectedContext: ['alerts'],
      },
    ];
    
    const results = [];
    
    for (const test of testQueries) {
      const queryStart = Date.now();
      
      try {
        // Process message to get enhanced context with live data
        const enhancedPrompt = await manufacturingChatService.processMessage(
          sessionId,
          test.query
        );
        
        // Check if context was added
        const contextAdded = enhancedPrompt !== test.query;
        const contextData = enhancedPrompt.match(/\[([^\]]+)\]/g) || [];
        
        results.push({
          query: test.query,
          success: true,
          duration: Date.now() - queryStart,
          contextEnhanced: contextAdded,
          contextDataFound: contextData.length,
          contextSnippet: contextData.slice(0, 2).join(' '),
        });
      } catch (error) {
        results.push({
          query: test.query,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Test direct database queries
    let dbStats = { oee: 0, equipment: 0, alerts: 0 };
    try {
      const [oee, equipment, alerts] = await Promise.all([
        manufacturingChatService.calculateCurrentOEE(),
        manufacturingChatService.getEquipmentStatus(),
        manufacturingChatService.getActiveAlerts(),
      ]);
      
      dbStats = {
        oee: Math.round(oee * 10) / 10,
        equipment: equipment.length,
        alerts: alerts.length,
      };
    } catch (e) {
      // DB query failed
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      status: successCount === results.length ? 'all_passed' : 'partial_failure',
      duration: Date.now() - startTime,
      contextTests: results,
      databaseStats: dbStats,
      summary: {
        totalTests: results.length,
        passed: successCount,
        contextEnhanced: results.filter(r => r.contextEnhanced).length,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}