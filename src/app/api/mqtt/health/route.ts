/**
 * API Route for MQTT service health check
 * Simplified version without external dependencies for AnalyticsPlatform demo
 */

import { NextRequest, NextResponse } from 'next/server';

// GET /api/mqtt/health - MQTT service health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'success',
    data: {
      status: 'healthy',
      message: 'MQTT service is ready',
      timestamp: new Date().toISOString()
    }
  });
}