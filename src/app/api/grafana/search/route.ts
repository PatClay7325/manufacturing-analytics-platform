import { NextRequest, NextResponse } from 'next/server';

// Search endpoint for Grafana JSON datasource - returns available metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target } = body;

    // List of available metrics/queries
    const metrics = [
      'performance_metrics',
      'oee_by_equipment',
      'production_summary',
      'downtime_analysis',
      'quality_metrics',
      'equipment_list',
      'shift_performance',
    ];

    // Filter based on search target if provided
    const filtered = target 
      ? metrics.filter(m => m.toLowerCase().includes(target.toLowerCase()))
      : metrics;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Grafana search error:', error);
    return NextResponse.json(['performance_metrics']);
  }
}