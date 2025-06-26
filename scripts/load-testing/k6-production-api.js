import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiCalls = new Counter('api_calls_total');
const responseTrend = new Trend('response_time');
const cacheHitRate = new Rate('cache_hits');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test scenarios
export const options = {
  scenarios: {
    // Steady load test
    steady_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { test_type: 'steady_load' },
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 300 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests under 100ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    errors: ['rate<0.01'],
    response_time: ['p(99)<200'],      // 99% under 200ms
  },
};

// Test data
const equipmentIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const productIds = [1, 2, 3, 4, 5];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomTimeRange() {
  const end = new Date();
  const start = new Date(end.getTime() - (Math.random() * 7 * 24 * 60 * 60 * 1000)); // Random day in last week
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function setup() {
  console.log('Starting load test against:', BASE_URL);
  
  // Verify API is accessible
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`API not accessible: ${response.status}`);
  }
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
  
  // Test different API endpoints with weighted distribution
  const testType = Math.random();
  
  if (testType < 0.4) {
    // 40% - OEE calculations (most expensive)
    testOEECalculation(headers);
  } else if (testType < 0.7) {
    // 30% - Equipment queries
    testEquipmentQueries(headers);
  } else if (testType < 0.85) {
    // 15% - Production data
    testProductionData(headers);
  } else if (testType < 0.95) {
    // 10% - Create operations
    testCreateOperations(headers);
  } else {
    // 5% - Complex aggregations
    testComplexAggregations(headers);
  }
  
  sleep(Math.random() * 2); // Random delay between 0-2 seconds
}

function testOEECalculation(headers) {
  const equipmentId = getRandomElement(equipmentIds);
  const timeRange = getRandomTimeRange();
  
  const url = `${BASE_URL}/api/v2/oee/${equipmentId}`;
  const params = {
    headers,
    tags: { endpoint: 'oee_calculation' },
  };
  
  const response = http.get(
    `${url}?start=${timeRange.start}&end=${timeRange.end}`,
    params
  );
  
  apiCalls.add(1);
  responseTrend.add(response.timings.duration);
  
  const success = check(response, {
    'OEE calculation status is 200': (r) => r.status === 200,
    'OEE response time < 100ms': (r) => r.timings.duration < 100,
    'OEE has valid data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.oee !== undefined && data.availability !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  // Check for cache hits
  const cacheHit = response.headers['X-Cache-Status'] === 'HIT';
  cacheHitRate.add(cacheHit ? 1 : 0);
  
  if (!success) {
    errorRate.add(1);
    console.error(`OEE calculation failed: ${response.status} - ${response.body}`);
  }
}

function testEquipmentQueries(headers) {
  const url = `${BASE_URL}/api/v2/equipment`;
  const params = {
    headers,
    tags: { endpoint: 'equipment_list' },
  };
  
  const response = http.get(url, params);
  
  apiCalls.add(1);
  responseTrend.add(response.timings.duration);
  
  const success = check(response, {
    'Equipment list status is 200': (r) => r.status === 200,
    'Equipment response time < 50ms': (r) => r.timings.duration < 50,
    'Equipment list has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length > 0;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testProductionData(headers) {
  const equipmentId = getRandomElement(equipmentIds);
  const timeRange = getRandomTimeRange();
  
  const url = `${BASE_URL}/api/v2/production/${equipmentId}/summary`;
  const params = {
    headers,
    tags: { endpoint: 'production_summary' },
  };
  
  const response = http.get(
    `${url}?start=${timeRange.start}&end=${timeRange.end}`,
    params
  );
  
  apiCalls.add(1);
  responseTrend.add(response.timings.duration);
  
  const success = check(response, {
    'Production summary status is 200': (r) => r.status === 200,
    'Production response time < 150ms': (r) => r.timings.duration < 150,
    'Production has summary data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.summary !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testCreateOperations(headers) {
  // Simulate creating production runs
  const equipmentId = getRandomElement(equipmentIds);
  const productId = getRandomElement(productIds);
  
  const payload = {
    equipmentId,
    productId,
    shiftId: 1,
    plannedQuantity: Math.floor(Math.random() * 1000) + 100,
    operatorId: `OP${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
  };
  
  const url = `${BASE_URL}/api/v2/production/start`;
  const params = {
    headers,
    tags: { endpoint: 'production_start' },
  };
  
  const response = http.post(url, JSON.stringify(payload), params);
  
  apiCalls.add(1);
  responseTrend.add(response.timings.duration);
  
  const success = check(response, {
    'Production start status is 201': (r) => r.status === 201,
    'Production start response time < 200ms': (r) => r.timings.duration < 200,
    'Production start returns ID': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testComplexAggregations(headers) {
  const timeRange = getRandomTimeRange();
  
  const url = `${BASE_URL}/api/v2/analytics/plant-summary`;
  const params = {
    headers,
    tags: { endpoint: 'plant_summary' },
  };
  
  const response = http.get(
    `${url}?start=${timeRange.start}&end=${timeRange.end}`,
    params
  );
  
  apiCalls.add(1);
  responseTrend.add(response.timings.duration);
  
  const success = check(response, {
    'Plant summary status is 200': (r) => r.status === 200,
    'Plant summary response time < 500ms': (r) => r.timings.duration < 500,
    'Plant summary has aggregated data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.totalOEE !== undefined && data.equipmentCount !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

export function teardown(data) {
  console.log('Load test completed');
  
  // Optional: Clean up test data
  // This would require additional API endpoints for cleanup
}

// Handle different test scenarios
export function handleSummary(data) {
  const summary = {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
  
  // Console output for CI/CD
  console.log('=== LOAD TEST SUMMARY ===');
  console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`Avg response time: ${data.metrics.http_req_duration.values.avg}ms`);
  console.log(`95th percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`99th percentile: ${data.metrics.http_req_duration.values['p(99)']}ms`);
  
  if (data.metrics.cache_hits) {
    console.log(`Cache hit rate: ${data.metrics.cache_hits.values.rate * 100}%`);
  }
  
  // Determine if test passed
  const thresholdsPassed = Object.keys(data.metrics).every(metricName => {
    const metric = data.metrics[metricName];
    return !metric.thresholds || Object.values(metric.thresholds).every(t => t.ok);
  });
  
  console.log(`\nTest result: ${thresholdsPassed ? 'PASSED' : 'FAILED'}`);
  
  return summary;
}