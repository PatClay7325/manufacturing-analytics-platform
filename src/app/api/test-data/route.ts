import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify API connectivity
 * Returns mock manufacturing data for testing dashboards
 */
export async function GET() {
  // Return mock data for testing
  const mockData = {
    oee: {
      current: 0.856,
      availability: 0.92,
      performance: 0.95,
      quality: 0.98,
      trend: [
        { time: new Date(Date.now() - 3600000).toISOString(), value: 0.82 },
        { time: new Date(Date.now() - 2400000).toISOString(), value: 0.84 },
        { time: new Date(Date.now() - 1200000).toISOString(), value: 0.85 },
        { time: new Date().toISOString(), value: 0.856 },
      ]
    },
    production: {
      currentRate: 450,
      targetRate: 500,
      totalUnits: 10800,
      efficiency: 0.90,
      byLine: [
        { line: 'Production Line 1', units: 3600, efficiency: 0.92 },
        { line: 'Production Line 2', units: 3500, efficiency: 0.88 },
        { line: 'Production Line 3', units: 3700, efficiency: 0.90 },
      ]
    },
    equipment: {
      totalCount: 15,
      activeCount: 14,
      healthScore: 0.94,
      alerts: 2,
      status: [
        { id: 'eq-001', name: 'CNC Machine 1', status: 'running', health: 0.98 },
        { id: 'eq-002', name: 'Assembly Robot A', status: 'running', health: 0.95 },
        { id: 'eq-003', name: 'Packaging Line 1', status: 'running', health: 0.92 },
        { id: 'eq-004', name: 'Quality Scanner', status: 'idle', health: 0.90 },
        { id: 'eq-005', name: 'Conveyor System', status: 'running', health: 0.96 },
      ]
    }
  };

  return NextResponse.json(mockData);
}