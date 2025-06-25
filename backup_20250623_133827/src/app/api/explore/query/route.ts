import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { queries, range } = body;

    // Validate request
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'Invalid queries: must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!range || !range.from || !range.to) {
      return NextResponse.json(
        { error: 'Invalid range: from and to are required' },
        { status: 400 }
      );
    }

    // Execute queries based on datasource type
    const results = await Promise.all(
      queries.map(async (query: any) => {
        try {
          return await executeQuery(query, range);
        } catch (error) {
          console.error(`Query execution failed for ${query.refId}:`, error);
          return {
            refId: query.refId,
            series: [],
            error: error instanceof Error ? error.message : 'Query execution failed'
          };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Explore query execution failed:', error);
    return NextResponse.json(
      { error: 'Query execution failed' },
      { status: 500 }
    );
  }
}

async function executeQuery(query: any, range: { from: string; to: string }) {
  const { datasource, expr, refId, format = 'time_series' } = query;

  // Route to appropriate query executor based on datasource type
  switch (datasource.type) {
    case 'prometheus':
      return await executePrometheusQuery(query, range);
    case 'postgres':
    case 'timescaledb':
      return await executePostgresQuery(query, range);
    case 'influxdb':
      return await executeInfluxDBQuery(query, range);
    default:
      // Default mock execution for unsupported datasources
      return await executeMockQuery(query, range);
  }
}

async function executePrometheusQuery(query: any, range: { from: string; to: string }) {
  const { expr, refId, legendFormat } = query;

  // In a real implementation, this would call the actual Prometheus API
  // For now, simulate a Prometheus response with manufacturing metrics
  
  const now = Date.now();
  const from = now - parseTimeRange(range.from);
  const to = range.to === 'now' ? now : now - parseTimeRange(range.to);
  
  // Generate realistic manufacturing data based on the query
  const dataPoints = Math.min(Math.floor((to - from) / 60000), 1000); // 1 point per minute, max 1000
  const step = (to - from) / dataPoints;

  const timeValues = Array.from({ length: dataPoints }, (_, i) => from + i * step);
  
  // Generate values based on the metric type
  const baseValue = getPrometheusBaseValue(expr);
  const variance = getPrometheusVariance(expr);
  
  const valueValues = Array.from({ length: dataPoints }, (_, i) => {
    const trend = Math.sin(i * 0.01) * variance * 0.3;
    const noise = (Math.random() - 0.5) * variance * 0.4;
    const spike = Math.random() < 0.02 ? (Math.random() - 0.5) * variance * 2 : 0;
    
    return Math.max(0, baseValue + trend + noise + spike);
  });

  return {
    refId,
    series: [
      {
        name: legendFormat || getPrometheusSeriesName(expr),
        fields: [
          {
            name: 'Time',
            type: 'time' as const,
            values: timeValues
          },
          {
            name: 'Value',
            type: 'number' as const,
            values: valueValues,
            config: {
              displayName: legendFormat || getPrometheusSeriesName(expr),
              unit: getPrometheusUnit(expr)
            }
          }
        ]
      }
    ],
    meta: {
      executedQueryString: expr,
      preferredVisualisationType: 'time_series',
      notices: []
    }
  };
}

async function executePostgresQuery(query: any, range: { from: string; to: string }) {
  const { expr: sql, refId } = query;

  // In a real implementation, this would execute against the actual database
  // For now, return mock data that looks like it came from SQL
  
  const now = Date.now();
  const from = now - parseTimeRange(range.from);
  const to = range.to === 'now' ? now : now - parseTimeRange(range.to);
  
  // Simulate SQL result based on query patterns
  if (sql.toLowerCase().includes('select') && sql.toLowerCase().includes('time')) {
    // Time series query
    const dataPoints = Math.min(Math.floor((to - from) / 300000), 200); // 5 minute intervals
    const step = (to - from) / dataPoints;
    
    const timeValues = Array.from({ length: dataPoints }, (_, i) => from + i * step);
    const valueValues = Array.from({ length: dataPoints }, () => 
      Math.round((50 + Math.random() * 100) * 100) / 100
    );

    return {
      refId,
      series: [
        {
          name: 'SQL Result',
          fields: [
            {
              name: 'time',
              type: 'time' as const,
              values: timeValues
            },
            {
              name: 'value',
              type: 'number' as const,
              values: valueValues
            }
          ]
        }
      ],
      meta: {
        executedQueryString: sql,
        preferredVisualisationType: 'time_series'
      }
    };
  } else {
    // Table query
    return {
      refId,
      series: [
        {
          name: 'SQL Table Result',
          fields: [
            {
              name: 'id',
              type: 'number' as const,
              values: [1, 2, 3, 4, 5]
            },
            {
              name: 'name',
              type: 'string' as const,
              values: ['Line A', 'Line B', 'Line C', 'Machine 1', 'Machine 2']
            },
            {
              name: 'value',
              type: 'number' as const,
              values: [85.2, 78.9, 92.1, 88.7, 81.3]
            }
          ]
        }
      ],
      meta: {
        executedQueryString: sql,
        preferredVisualisationType: 'table'
      }
    };
  }
}

async function executeInfluxDBQuery(query: any, range: { from: string; to: string }) {
  const { expr: influxQL, refId } = query;

  // Mock InfluxDB response
  const now = Date.now();
  const from = now - parseTimeRange(range.from);
  const to = range.to === 'now' ? now : now - parseTimeRange(range.to);
  
  const dataPoints = Math.min(Math.floor((to - from) / 60000), 500);
  const step = (to - from) / dataPoints;

  const timeValues = Array.from({ length: dataPoints }, (_, i) => from + i * step);
  const valueValues = Array.from({ length: dataPoints }, () => 
    Math.round((70 + Math.random() * 60) * 100) / 100
  );

  return {
    refId,
    series: [
      {
        name: 'InfluxDB Series',
        fields: [
          {
            name: 'time',
            type: 'time' as const,
            values: timeValues
          },
          {
            name: 'mean',
            type: 'number' as const,
            values: valueValues
          }
        ]
      }
    ],
    meta: {
      executedQueryString: influxQL,
      preferredVisualisationType: 'time_series'
    }
  };
}

async function executeMockQuery(query: any, range: { from: string; to: string }) {
  // Generic mock query for unsupported datasources
  const { refId, expr } = query;
  
  const now = Date.now();
  const from = now - parseTimeRange(range.from);
  const to = range.to === 'now' ? now : now - parseTimeRange(range.to);
  
  const dataPoints = Math.min(Math.floor((to - from) / 60000), 300);
  const step = (to - from) / dataPoints;

  const timeValues = Array.from({ length: dataPoints }, (_, i) => from + i * step);
  const valueValues = Array.from({ length: dataPoints }, () => 
    Math.round((Math.random() * 100) * 100) / 100
  );

  return {
    refId,
    series: [
      {
        name: `Mock Series ${refId}`,
        fields: [
          {
            name: 'Time',
            type: 'time' as const,
            values: timeValues
          },
          {
            name: 'Value',
            type: 'number' as const,
            values: valueValues
          }
        ]
      }
    ],
    meta: {
      executedQueryString: expr || 'mock_query',
      preferredVisualisationType: 'time_series'
    }
  };
}

// Helper functions
function parseTimeRange(timeStr: string): number {
  if (timeStr === 'now') return 0;
  const match = timeStr.match(/^now-(\d+)([smhd])$/);
  if (!match) return 3600000; // Default 1 hour
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
}

function getPrometheusBaseValue(expr: string): number {
  if (expr.includes('oee') || expr.includes('efficiency')) return 78;
  if (expr.includes('temperature')) return 85;
  if (expr.includes('pressure')) return 15.2;
  if (expr.includes('production') || expr.includes('count')) return 1250;
  if (expr.includes('utilization')) return 72;
  if (expr.includes('speed')) return 1850;
  if (expr.includes('vibration')) return 2.8;
  if (expr.includes('up')) return 1;
  return 50;
}

function getPrometheusVariance(expr: string): number {
  if (expr.includes('temperature')) return 8;
  if (expr.includes('pressure')) return 2;
  if (expr.includes('production')) return 150;
  if (expr.includes('speed')) return 120;
  if (expr.includes('oee') || expr.includes('efficiency')) return 12;
  if (expr.includes('up')) return 0.1;
  return 15;
}

function getPrometheusSeriesName(expr: string): string {
  if (expr.includes('oee')) return 'OEE';
  if (expr.includes('temperature')) return 'Temperature';
  if (expr.includes('production')) return 'Production Rate';
  if (expr.includes('pressure')) return 'System Pressure';
  if (expr.includes('utilization')) return 'Machine Utilization';
  if (expr.includes('speed')) return 'Motor Speed';
  if (expr.includes('vibration')) return 'Vibration Level';
  if (expr.includes('up')) return 'Service Uptime';
  return expr;
}

function getPrometheusUnit(expr: string): string {
  if (expr.includes('temperature')) return '°C';
  if (expr.includes('pressure')) return 'PSI';
  if (expr.includes('oee') || expr.includes('efficiency') || expr.includes('utilization')) return '%';
  if (expr.includes('production') || expr.includes('count')) return 'units/min';
  if (expr.includes('speed')) return 'RPM';
  if (expr.includes('vibration')) return 'mm/s';
  if (expr.includes('rate')) return 'ops/sec';
  return '';
}