import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const OLLAMA_API = 'http://localhost:11434/api/generate';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Query Ollama for manufacturing data insights
 */
async function queryOllama(prompt: string): Promise<string> {
  try {
    const response = await axios.post(OLLAMA_API, {
      model: 'manufacturing-assistant',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 500,
      }
    });

    return response.data.response;
  } catch (error) {
    console.error('Ollama query error:', error);
    throw error;
  }
}

/**
 * Example 1: Efficient KPI data retrieval with minimal overhead
 */
async function getKPIDataEfficiently() {
  console.time('KPI Query');
  
  // Use select to minimize data transfer
  const kpiData = await prisma.kPI.findMany({
    select: {
      id: true,
      name: true,
      value: true,
      unit: true,
      timestamp: true,
      workUnitId: true,
    },
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 100, // Limit results for performance
  });

  console.timeEnd('KPI Query');
  
  // Ask Ollama for insights
  const prompt = `Given this KPI data: ${JSON.stringify(kpiData.slice(0, 5))}
    Provide a brief analysis of performance trends and any anomalies.`;
  
  const insights = await queryOllama(prompt);
  return { data: kpiData, insights };
}

/**
 * Example 2: Hierarchical data retrieval with selective loading
 */
async function getEnterpriseHierarchy(enterpriseId: string) {
  console.time('Hierarchy Query');
  
  // Use nested select for controlled data loading
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          sites: true,
        },
      },
      sites: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              areas: true,
            },
          },
          areas: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  workCenters: true,
                },
              },
            },
            take: 5, // Limit for performance
          },
        },
        take: 10, // Limit sites
      },
    },
  });

  console.timeEnd('Hierarchy Query');
  
  return enterprise;
}

/**
 * Example 3: Aggregated metrics with memory-efficient pagination
 */
async function getAggregatedMetrics(workCenterId: string, page = 1, pageSize = 50) {
  console.time('Aggregation Query');
  
  const skip = (page - 1) * pageSize;
  
  // Get aggregated KPI data
  const aggregatedData = await prisma.kPI.groupBy({
    by: ['name', 'unit'],
    where: {
      workUnit: {
        workCenterId: workCenterId,
      },
      timestamp: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    _avg: {
      value: true,
    },
    _min: {
      value: true,
    },
    _max: {
      value: true,
    },
    _count: {
      value: true,
    },
    skip,
    take: pageSize,
  });

  console.timeEnd('Aggregation Query');
  
  // Get AI insights on the aggregated data
  const prompt = `Analyze this aggregated manufacturing data: ${JSON.stringify(aggregatedData)}
    Identify key performance indicators and suggest optimization opportunities.`;
  
  const analysis = await queryOllama(prompt);
  
  return {
    data: aggregatedData,
    analysis,
    pagination: {
      page,
      pageSize,
      hasMore: aggregatedData.length === pageSize,
    },
  };
}

/**
 * Example 4: Real-time alert analysis with minimal data loading
 */
async function analyzeRecentAlerts(limit = 20) {
  console.time('Alert Query');
  
  const recentAlerts = await prisma.alert.findMany({
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      timestamp: true,
      workUnit: {
        select: {
          name: true,
          workCenter: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    where: {
      status: 'active',
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });

  console.timeEnd('Alert Query');
  
  // Get AI recommendations
  const prompt = `Based on these active alerts: ${JSON.stringify(recentAlerts)}
    Provide prioritized recommendations for addressing critical issues.`;
  
  const recommendations = await queryOllama(prompt);
  
  return {
    alerts: recentAlerts,
    recommendations,
  };
}

/**
 * Performance monitoring wrapper
 */
async function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();
  
  try {
    const result = await fn();
    
    const endTime = process.hrtime(startTime);
    const endMemory = process.memoryUsage();
    
    console.log(`Performance: ${operation}`);
    console.log(`  Time: ${endTime[0]}s ${endTime[1] / 1000000}ms`);
    console.log(`  Memory Delta: ${(endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`);
    
    return result;
  } catch (error) {
    console.error(`Error in ${operation}:`, error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    // Test efficient KPI retrieval
    const kpiResults = await withPerformanceLogging(
      'KPI Data Retrieval',
      () => getKPIDataEfficiently()
    );
    console.log('KPI Insights:', kpiResults.insights);
    
    // Test hierarchical data loading
    const hierarchy = await withPerformanceLogging(
      'Enterprise Hierarchy',
      () => getEnterpriseHierarchy('enterprise-1')
    );
    console.log('Site Count:', hierarchy?._count?.sites);
    
    // Test aggregated metrics
    const metrics = await withPerformanceLogging(
      'Aggregated Metrics',
      () => getAggregatedMetrics('workcenter-1')
    );
    console.log('Analysis:', metrics.analysis);
    
    // Test alert analysis
    const alerts = await withPerformanceLogging(
      'Alert Analysis',
      () => analyzeRecentAlerts()
    );
    console.log('Recommendations:', alerts.recommendations);
    
  } catch (error) {
    console.error('Example execution error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

export {
  queryOllama,
  getKPIDataEfficiently,
  getEnterpriseHierarchy,
  getAggregatedMetrics,
  analyzeRecentAlerts,
  withPerformanceLogging,
};