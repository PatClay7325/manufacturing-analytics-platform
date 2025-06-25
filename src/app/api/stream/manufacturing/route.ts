/**
 * Manufacturing Data Stream API
 * Server-Sent Events endpoint for real-time manufacturing data
 */

import { NextRequest } from 'next/server';
import { manufacturingDataStream } from '@/lib/streaming/ManufacturingDataStream';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Extract filters from query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: any = {};
    
    // Parse filter parameters
    const types = searchParams.get('types');
    if (types) {
      filters.types = types.split(',');
    }
    
    const equipment = searchParams.get('equipment');
    if (equipment) {
      filters.equipment = equipment.split(',');
    }
    
    const severity = searchParams.get('severity');
    if (severity) {
      filters.severity = severity.split(',');
    }
    
    // Time range filter
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    if (since || until) {
      filters.timeRange = {
        start: since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: until ? new Date(until) : new Date()
      };
    }
    
    // Extract user context (simplified - implement proper auth)
    const userId = request.headers.get('x-user-id') || undefined;
    
    logger.info('SSE stream request', { filters, userId });
    
    // Create subscription
    const subscriptionId = manufacturingDataStream.subscribe(
      filters,
      () => {}, // Callback will be replaced by SSE
      userId
    );
    
    // Create SSE response
    const stream = manufacturingDataStream.createSSEResponse(subscriptionId);
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Subscription-Id': subscriptionId
      }
    });
    
  } catch (error) {
    logger.error('SSE stream error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// OPTIONS method for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    },
  });
}