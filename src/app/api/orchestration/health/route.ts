/**
 * Health check endpoint for workflow orchestration
 * Simplified version without external dependencies for AnalyticsPlatform demo
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/orchestration/health
 * Get workflow orchestration system health status
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'workflow-orchestration',
    version: '1.0.0',
    details: {
      engine: 'ready',
      database: 'connected',
      queue: 'active',
    },
  };

  return NextResponse.json(response);
}