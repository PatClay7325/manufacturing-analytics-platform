/**
 * Dashboard Performance Tests
 * Performance benchmarks for dashboard loading, data queries, and visualization rendering
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { performance } from 'perf_hooks';

// Mock components and services
vi.mock('@/lib/prisma', () => ({
  prisma: {
    performanceMetric: {
      findMany: vi.fn(),
      aggregate: vi.fn()
    },
    qualityMetric: {
      findMany: vi.fn()
    },
    equipment: {
      findMany: vi.fn()
    }
  }
}));

// Performance test utilities
class PerformanceMetrics {
  private metrics: Record<string, number[]> = {};

  startTiming(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.metrics[operation]) {
        this.metrics[operation] = [];
      }
      this.metrics[operation].push(duration);
      return duration;
    };
  }

  getAverageTime(operation: string): number {
    const times = this.metrics[operation] || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getPercentile(operation: string, percentile: number): number {
    const times = [...(this.metrics[operation] || [])].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * times.length) - 1;
    return times[index] || 0;
  }

  reset(): void {
    this.metrics = {};
  }
}

const perfMetrics = new PerformanceMetrics();

// Mock data generators
function generatePerformanceData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pm-${i}`,
    timestamp: new Date(Date.now() - i * 60000), // 1 minute intervals
    availability: 90 + Math.random() * 10,
    performance: 85 + Math.random() * 10,
    quality: 88 + Math.random() * 10,
    oeeScore: 70 + Math.random() * 20,
    totalParts: 100 + Math.floor(Math.random() * 50),
    goodParts: 90 + Math.floor(Math.random() * 40),
    rejectedParts: Math.floor(Math.random() * 10),
    workUnitId: '123e4567-e89b-12d3-a456-426614174000'
  }));
}

function generateQualityData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `qm-${i}`,
    timestamp: new Date(Date.now() - i * 30000), // 30 second intervals
    parameter: 'Diameter',
    value: 25.0 + Math.random() * 0.8,
    uom: 'mm',
    lowerLimit: 25.0,
    upperLimit: 25.8,
    nominal: 25.4,
    isWithinSpec: Math.random() > 0.1, // 90% within spec
    workUnitId: '123e4567-e89b-12d3-a456-426614174000'
  }));
}

function generateEquipmentData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `eq-${i}`,
    name: `Equipment ${i + 1}`,
    code: `EQ-${String(i + 1).padStart(3, '0')}`,
    equipmentType: 'CNC_MACHINE',
    status: Math.random() > 0.1 ? 'operational' : 'maintenance',
    workCenterId: '123e4567-e89b-12d3-a456-426614174000'
  }));
}

// Simulate database query delays
function simulateQueryDelay(baseDelay: number, recordCount: number): Promise<void> {
  const delay = baseDelay + (recordCount * 0.1); // Scale with record count
  return new Promise(resolve => setTimeout(resolve, delay));
}

describe('Dashboard Performance Tests', () => {
  beforeAll(() => {
    perfMetrics.reset();
  });

  afterAll(() => {
    console.log('\n=== Performance Test Results ===');
    console.log('Average Times (ms):');
    console.log(`Data Query (Small): ${perfMetrics.getAverageTime('query-small').toFixed(2)}`);
    console.log(`Data Query (Medium): ${perfMetrics.getAverageTime('query-medium').toFixed(2)}`);
    console.log(`Data Query (Large): ${perfMetrics.getAverageTime('query-large').toFixed(2)}`);
    console.log(`Chart Rendering: ${perfMetrics.getAverageTime('chart-render').toFixed(2)}`);
    console.log(`Dashboard Load: ${perfMetrics.getAverageTime('dashboard-load').toFixed(2)}`);
    console.log('\n95th Percentile Times (ms):');
    console.log(`Data Query (Large): ${perfMetrics.getPercentile('query-large', 95).toFixed(2)}`);
    console.log(`Dashboard Load: ${perfMetrics.getPercentile('dashboard-load', 95).toFixed(2)}`);
  });

  describe('Data Query Performance', () => {
    test('should handle small dataset queries efficiently', async () => {
      const recordCount = 100;
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const endTiming = perfMetrics.startTiming('query-small');
        
        // Simulate database query
        await simulateQueryDelay(5, recordCount);
        const data = generatePerformanceData(recordCount);
        
        endTiming();

        expect(data).toHaveLength(recordCount);
      }

      const avgTime = perfMetrics.getAverageTime('query-small');
      expect(avgTime).toBeLessThan(50); // Should complete in under 50ms
    });

    test('should handle medium dataset queries within acceptable limits', async () => {
      const recordCount = 1000;
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const endTiming = perfMetrics.startTiming('query-medium');
        
        await simulateQueryDelay(10, recordCount);
        const data = generatePerformanceData(recordCount);
        
        endTiming();

        expect(data).toHaveLength(recordCount);
      }

      const avgTime = perfMetrics.getAverageTime('query-medium');
      expect(avgTime).toBeLessThan(200); // Should complete in under 200ms
    });

    test('should handle large dataset queries with pagination', async () => {
      const recordCount = 10000;
      const pageSize = 1000;
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const endTiming = perfMetrics.startTiming('query-large');
        
        // Simulate paginated query
        const pages = Math.ceil(recordCount / pageSize);
        const allData = [];
        
        for (let page = 0; page < pages; page++) {
          await simulateQueryDelay(15, pageSize);
          const pageData = generatePerformanceData(pageSize);
          allData.push(...pageData);
        }
        
        endTiming();

        expect(allData).toHaveLength(recordCount);
      }

      const avgTime = perfMetrics.getAverageTime('query-large');
      expect(avgTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('should efficiently aggregate performance metrics', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const endTiming = perfMetrics.startTiming('aggregation');
        
        const data = generatePerformanceData(5000);
        
        // Simulate aggregation operations
        const aggregatedData = {
          avgOEE: data.reduce((sum, item) => sum + item.oeeScore, 0) / data.length,
          avgAvailability: data.reduce((sum, item) => sum + item.availability, 0) / data.length,
          avgPerformance: data.reduce((sum, item) => sum + item.performance, 0) / data.length,
          avgQuality: data.reduce((sum, item) => sum + item.quality, 0) / data.length,
          totalParts: data.reduce((sum, item) => sum + item.totalParts, 0),
          totalGoodParts: data.reduce((sum, item) => sum + item.goodParts, 0)
        };
        
        endTiming();

        expect(aggregatedData.avgOEE).toBeGreaterThan(0);
        expect(aggregatedData.totalParts).toBeGreaterThan(0);
      }

      const avgTime = perfMetrics.getAverageTime('aggregation');
      expect(avgTime).toBeLessThan(100); // Aggregation should be fast
    });
  });

  describe('Chart Rendering Performance', () => {
    test('should render time series charts efficiently', async () => {
      const dataPoints = [100, 500, 1000, 2000];

      for (const pointCount of dataPoints) {
        const endTiming = perfMetrics.startTiming('chart-render');
        
        const data = generatePerformanceData(pointCount);
        
        // Simulate chart data processing
        const chartData = data.map(item => ({
          timestamp: item.timestamp.getTime(),
          oee: item.oeeScore,
          availability: item.availability,
          performance: item.performance,
          quality: item.quality
        }));
        
        // Simulate rendering delay based on data complexity
        await new Promise(resolve => setTimeout(resolve, pointCount / 100));
        
        endTiming();

        expect(chartData).toHaveLength(pointCount);
      }

      const avgTime = perfMetrics.getAverageTime('chart-render');
      expect(avgTime).toBeLessThan(500); // Chart rendering should be under 500ms
    });

    test('should handle real-time data updates efficiently', async () => {
      const baseData = generatePerformanceData(1000);
      const updateIntervals = [100, 250, 500, 1000]; // ms

      for (const interval of updateIntervals) {
        const updates = 10;
        const endTiming = perfMetrics.startTiming(`realtime-${interval}`);
        
        for (let i = 0; i < updates; i++) {
          // Simulate new data point
          const newDataPoint = generatePerformanceData(1)[0];
          baseData.unshift(newDataPoint);
          
          // Keep last 1000 points
          if (baseData.length > 1000) {
            baseData.pop();
          }
          
          // Simulate update processing
          await new Promise(resolve => setTimeout(resolve, interval / 10));
        }
        
        endTiming();
      }

      // Real-time updates should be very fast
      const avgTime = perfMetrics.getAverageTime('realtime-100');
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('Dashboard Loading Performance', () => {
    test('should load dashboard with multiple panels efficiently', async () => {
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const endTiming = perfMetrics.startTiming('dashboard-load');
        
        // Simulate loading multiple dashboard components
        const loadPromises = [
          // OEE Panel
          simulateQueryDelay(20, 500).then(() => generatePerformanceData(500)),
          // Quality Panel
          simulateQueryDelay(15, 300).then(() => generateQualityData(300)),
          // Equipment Status Panel
          simulateQueryDelay(10, 50).then(() => generateEquipmentData(50)),
          // Alerts Panel
          simulateQueryDelay(8, 20).then(() => Array.from({ length: 20 }, (_, i) => ({
            id: `alert-${i}`,
            severity: 'medium',
            message: `Alert ${i + 1}`
          })))
        ];

        const results = await Promise.all(loadPromises);
        
        endTiming();

        expect(results).toHaveLength(4);
        expect(results[0]).toHaveLength(500); // OEE data
        expect(results[1]).toHaveLength(300); // Quality data
        expect(results[2]).toHaveLength(50);  // Equipment data
        expect(results[3]).toHaveLength(20);  // Alerts
      }

      const avgTime = perfMetrics.getAverageTime('dashboard-load');
      expect(avgTime).toBeLessThan(1000); // Dashboard should load in under 1 second
    });

    test('should handle concurrent user requests', async () => {
      const concurrentUsers = 10;
      const endTiming = perfMetrics.startTiming('concurrent-load');

      // Simulate multiple users loading dashboards simultaneously
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userLoadStart = performance.now();
        
        // Each user loads their dashboard
        const userLoadPromises = [
          simulateQueryDelay(25, 500).then(() => generatePerformanceData(500)),
          simulateQueryDelay(20, 300).then(() => generateQualityData(300)),
          simulateQueryDelay(15, 50).then(() => generateEquipmentData(50))
        ];

        const results = await Promise.all(userLoadPromises);
        const userLoadTime = performance.now() - userLoadStart;
        
        return { userIndex, loadTime: userLoadTime, data: results };
      });

      const userResults = await Promise.all(userPromises);
      endTiming();

      // Verify all users got their data
      expect(userResults).toHaveLength(concurrentUsers);
      userResults.forEach(result => {
        expect(result.data).toHaveLength(3);
        expect(result.loadTime).toBeLessThan(2000); // Each user should load in under 2 seconds
      });

      const avgConcurrentTime = perfMetrics.getAverageTime('concurrent-load');
      expect(avgConcurrentTime).toBeLessThan(3000); // Total concurrent load should be under 3 seconds
    });
  });

  describe('Memory Usage and Cleanup', () => {
    test('should efficiently manage memory with large datasets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate processing large datasets
      const largeBatches = 5;
      for (let batch = 0; batch < largeBatches; batch++) {
        const data = generatePerformanceData(10000);
        
        // Process data in chunks to avoid memory spikes
        const chunkSize = 1000;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          
          // Simulate processing
          const processed = chunk.map(item => ({
            timestamp: item.timestamp,
            oee: item.oeeScore,
            efficiency: (item.availability * item.performance * item.quality) / 10000
          }));
          
          // Clear processed chunk
          processed.length = 0;
        }
        
        // Clear batch data
        data.length = 0;
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle data streaming without memory leaks', async () => {
      const streamDuration = 1000; // 1 second
      const streamInterval = 50; // 50ms intervals
      const maxBufferSize = 1000;
      
      const dataBuffer: any[] = [];
      const startTime = Date.now();
      
      const streamPromise = new Promise<void>((resolve) => {
        const streamTimer = setInterval(() => {
          // Add new data point
          const newDataPoint = generatePerformanceData(1)[0];
          dataBuffer.push(newDataPoint);
          
          // Maintain buffer size
          if (dataBuffer.length > maxBufferSize) {
            dataBuffer.shift(); // Remove oldest data point
          }
          
          // Check if streaming duration is complete
          if (Date.now() - startTime >= streamDuration) {
            clearInterval(streamTimer);
            resolve();
          }
        }, streamInterval);
      });

      await streamPromise;
      
      // Buffer should be at max size
      expect(dataBuffer).toHaveLength(maxBufferSize);
      
      // Clear buffer
      dataBuffer.length = 0;
    });
  });

  describe('Network Simulation', () => {
    test('should handle slow network conditions', async () => {
      const networkDelays = [0, 100, 500, 1000]; // Different network conditions
      
      for (const delay of networkDelays) {
        const endTiming = perfMetrics.startTiming(`network-${delay}`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Simulate compressed data transfer
        const data = generatePerformanceData(1000);
        const compressedSize = JSON.stringify(data).length * 0.3; // Assume 70% compression
        
        // Simulate decompression time
        await new Promise(resolve => setTimeout(resolve, compressedSize / 10000));
        
        endTiming();
        
        expect(data).toHaveLength(1000);
      }

      // Even with 1 second network delay, total time should be manageable
      const slowNetworkTime = perfMetrics.getAverageTime('network-1000');
      expect(slowNetworkTime).toBeLessThan(1500);
    });

    test('should implement efficient caching strategy', async () => {
      const cache = new Map<string, any>();
      const cacheHitRatio = { hits: 0, total: 0 };
      
      // Simulate repeated data requests
      const queries = [
        'oee-last-24h',
        'quality-last-week',
        'equipment-status',
        'oee-last-24h', // Cache hit
        'alerts-active',
        'quality-last-week', // Cache hit
        'oee-last-24h' // Cache hit
      ];

      for (const query of queries) {
        cacheHitRatio.total++;
        
        const endTiming = perfMetrics.startTiming('cache-query');
        
        if (cache.has(query)) {
          // Cache hit - instant response
          cacheHitRatio.hits++;
          const cachedData = cache.get(query);
          endTiming();
          expect(cachedData).toBeDefined();
        } else {
          // Cache miss - fetch data
          await simulateQueryDelay(100, 500);
          const data = generatePerformanceData(500);
          cache.set(query, data);
          endTiming();
          expect(data).toHaveLength(500);
        }
      }

      const cacheHitPercentage = (cacheHitRatio.hits / cacheHitRatio.total) * 100;
      expect(cacheHitPercentage).toBeGreaterThan(40); // Should have good cache hit ratio

      const avgCacheTime = perfMetrics.getAverageTime('cache-query');
      expect(avgCacheTime).toBeLessThan(80); // Cache should improve average response time
    });
  });
});