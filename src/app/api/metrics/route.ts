import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/apiCache';

// Sample metrics data structure
interface Metric {
  id: string;
  equipmentId?: string;
  productionLineId?: string;
  metricType: string;
  timestamp: string;
  value: number;
  unit: string;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  notes?: string;
}

// Sample data - exported to share with dynamic route handler
export const metricsData: Metric[] = [
  {
    id: '1',
    equipmentId: '1',
    metricType: 'OEE',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 78.3,
    unit: 'percent',
    target: 85,
    trend: 'up',
    notes: 'Improving after maintenance'
  },
  {
    id: '2',
    equipmentId: '1',
    metricType: 'Availability',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 92.7,
    unit: 'percent',
    target: 95,
    trend: 'up'
  },
  {
    id: '3',
    equipmentId: '1',
    metricType: 'Performance',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 85.6,
    unit: 'percent',
    target: 90,
    trend: 'down',
    notes: 'Decrease due to material quality issue'
  },
  {
    id: '4',
    equipmentId: '1',
    metricType: 'Quality',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 99.1,
    unit: 'percent',
    target: 99.5,
    trend: 'stable'
  },
  {
    id: '5',
    equipmentId: '2',
    metricType: 'OEE',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 65.2,
    unit: 'percent',
    target: 80,
    trend: 'down',
    notes: 'Needs maintenance'
  },
  {
    id: '6',
    productionLineId: '1',
    metricType: 'Throughput',
    timestamp: new Date('2025-06-17T00:00:00Z').toISOString(),
    value: 387,
    unit: 'units/hour',
    target: 400,
    trend: 'stable'
  }
];

// Helper function to get metrics by type
function getMetricsByType(type: string): Metric[] {
  return metricsData.filter(metric => metric.metricType.toLowerCase() === type.toLowerCase());
}

// Helper function to get metrics by equipment ID
function getMetricsByEquipment(equipmentId: string): Metric[] {
  return metricsData.filter(metric => metric.equipmentId === equipmentId);
}

// Helper function to get metrics by production line ID
function getMetricsByProductionLine(productionLineId: string): Metric[] {
  return metricsData.filter(metric => metric.productionLineId === productionLineId);
}

export async function GET(request: NextRequest) {
  // Get query parameters
  const id = request.nextUrl.searchParams.get('id');
  const type = request.nextUrl.searchParams.get('type');
  const equipmentId = request.nextUrl.searchParams.get('equipmentId');
  const productionLineId = request.nextUrl.searchParams.get('productionLineId');
  
  // Generate a cache key based on the query parameters
  const cacheKey = `metrics-${id || ''}-${type || ''}-${equipmentId || ''}-${productionLineId || ''}`;
  
  return withCache(cacheKey, async () => {
    // Return single metric if ID is provided
    if (id) {
      const metric = metricsData.find(m => m.id === id);
      
      if (!metric) {
        return NextResponse.json(
          { error: 'Metric not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(metric);
    }
    
    // Filter by type if provided
    if (type) {
      const metrics = getMetricsByType(type);
      return NextResponse.json(metrics);
    }
    
    // Filter by equipment ID if provided
    if (equipmentId) {
      const metrics = getMetricsByEquipment(equipmentId);
      return NextResponse.json(metrics);
    }
    
    // Filter by production line ID if provided
    if (productionLineId) {
      const metrics = getMetricsByProductionLine(productionLineId);
      return NextResponse.json(metrics);
    }
    
    // Return all metrics if no filters are provided
    return NextResponse.json(metricsData);
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.metricType || data.value === undefined || !data.unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Mock creating a new metric
    const newMetric: Metric = {
      id: `${metricsData.length + 1}`,
      equipmentId: data.equipmentId,
      productionLineId: data.productionLineId,
      metricType: data.metricType,
      timestamp: data.timestamp || new Date().toISOString(),
      value: data.value,
      unit: data.unit,
      target: data.target,
      trend: data.trend,
      notes: data.notes
    };
    
    // Actually save to our mock data for the session
    metricsData.push(newMetric);
    
    return NextResponse.json(newMetric, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}