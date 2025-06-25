/**
 * API Route for MQTT message publishing
 * Simplified version without external dependencies for AnalyticsPlatform demo
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json({ 
      success: true,
      message: 'MQTT message published',
      topic: body.topic || 'default',
      payload: body.payload || {}
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to publish MQTT message' 
    }, { status: 500 });
  }
}