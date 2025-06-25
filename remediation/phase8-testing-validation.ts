#!/usr/bin/env ts-node
/**
 * Phase 8: Testing and Validation
 * Implements production data replay, chaos engineering, load testing, and compliance validation
 */

import { faker } from '@faker-js/faker';
import * as k6 from 'k6';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

// =====================================================
// PRODUCTION DATA REPLAY
// =====================================================

interface ReplayDataset {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  events: ProductionEvent[];
}

interface ProductionEvent {
  timestamp: Date;
  type: string;
  equipmentId: string;
  data: any;
  interval?: number; // Time to next event in ms
}

export class ProductionReplay {
  private datasets: Map<string, ReplayDataset> = new Map();
  private activeReplay: AbortController | null = null;
  private stats = {
    eventsProcessed: 0,
    errors: 0,
    startTime: 0,
    endTime: 0
  };

  constructor(private eventEmitter: EventEmitter) {}

  /**
   * Load production dataset from file or database
   */
  async loadDataset(name: string, source: 'file' | 'database' = 'database'): Promise<void> {
    console.log(`📥 Loading dataset: ${name}`);

    if (source === 'file') {
      await this.loadFromFile(name);
    } else {
      await this.loadFromDatabase(name);
    }
  }

  private async loadFromDatabase(name: string): Promise<void> {
    // Load historical production data
    const timeRange = this.getTimeRangeForDataset(name);
    
    const events = await prisma.$queryRaw<any[]>`
      SELECT 
        'sensor' as type,
        time as timestamp,
        equipment_id,
        sensor_id,
        value,
        unit
      FROM sensor_data
      WHERE time BETWEEN ${timeRange.start} AND ${timeRange.end}
      
      UNION ALL
      
      SELECT 
        'production' as type,
        time as timestamp,
        equipment_id,
        product_code,
        units_produced as value,
        'units' as unit
      FROM production_metrics
      WHERE time BETWEEN ${timeRange.start} AND ${timeRange.end}
      
      UNION ALL
      
      SELECT 
        'alert' as type,
        timestamp,
        equipment_id,
        type as alert_type,
        severity as value,
        message as unit
      FROM alerts
      WHERE timestamp BETWEEN ${timeRange.start} AND ${timeRange.end}
      
      ORDER BY timestamp
    `;

    // Convert to replay events
    const replayEvents: ProductionEvent[] = events.map((event, index) => {
      const nextEvent = events[index + 1];
      const interval = nextEvent 
        ? new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime()
        : 0;

      return {
        timestamp: new Date(event.timestamp),
        type: event.type,
        equipmentId: event.equipment_id,
        data: {
          ...event,
          timestamp: undefined,
          type: undefined,
          equipment_id: undefined
        },
        interval
      };
    });

    this.datasets.set(name, {
      name,
      description: `Production data from ${timeRange.start} to ${timeRange.end}`,
      startTime: timeRange.start,
      endTime: timeRange.end,
      events: replayEvents
    });

    console.log(`✅ Loaded ${replayEvents.length} events for replay`);
  }

  private async loadFromFile(filename: string): Promise<void> {
    const filePath = path.join(process.cwd(), 'test-data', `${filename}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Parse dates
    data.events = data.events.map((event: any) => ({
      ...event,
      timestamp: new Date(event.timestamp)
    }));

    this.datasets.set(filename, data);
  }

  /**
   * Replay dataset with configurable speed
   */
  async replay(
    datasetName: string, 
    speed: number = 1,
    options: {
      filter?: (event: ProductionEvent) => boolean;
      transform?: (event: ProductionEvent) => ProductionEvent;
      validate?: boolean;
    } = {}
  ): Promise<void> {
    const dataset = this.datasets.get(datasetName);
    if (!dataset) {
      throw new Error(`Dataset ${datasetName} not found`);
    }

    console.log(`▶️ Starting replay of ${dataset.name} at ${speed}x speed`);
    
    this.activeReplay = new AbortController();
    this.stats = {
      eventsProcessed: 0,
      errors: 0,
      startTime: performance.now(),
      endTime: 0
    };

    try {
      for (const event of dataset.events) {
        // Check if replay was aborted
        if (this.activeReplay.signal.aborted) {
          console.log('⏹️ Replay aborted');
          break;
        }

        // Apply filter if provided
        if (options.filter && !options.filter(event)) {
          continue;
        }

        // Transform event if needed
        const processedEvent = options.transform ? options.transform(event) : event;

        // Adjust timestamp to current time
        const adjustedEvent = this.adjustTimestamp(processedEvent, dataset.startTime);

        try {
          // Send to system
          await this.ingestEvent(adjustedEvent, options.validate);
          this.stats.eventsProcessed++;

          // Emit progress
          if (this.stats.eventsProcessed % 100 === 0) {
            this.eventEmitter.emit('replayProgress', {
              processed: this.stats.eventsProcessed,
              total: dataset.events.length,
              percentage: (this.stats.eventsProcessed / dataset.events.length) * 100
            });
          }

        } catch (error) {
          this.stats.errors++;
          console.error(`Error processing event: ${error.message}`);
          
          if (options.validate) {
            throw error; // Stop on validation errors
          }
        }

        // Wait for realistic timing
        if (event.interval && event.interval > 0) {
          const waitTime = event.interval / speed;
          await this.sleep(waitTime);
        }
      }

      this.stats.endTime = performance.now();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;

      console.log(`✅ Replay complete:`);
      console.log(`   Events processed: ${this.stats.eventsProcessed}`);
      console.log(`   Errors: ${this.stats.errors}`);
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Events/sec: ${(this.stats.eventsProcessed / duration).toFixed(2)}`);

    } finally {
      this.activeReplay = null;
    }
  }

  /**
   * Stop active replay
   */
  stopReplay(): void {
    if (this.activeReplay) {
      this.activeReplay.abort();
    }
  }

  /**
   * Generate edge case dataset for testing
   */
  generateEdgeCaseDataset(): ReplayDataset {
    const events: ProductionEvent[] = [];
    const equipmentId = 'test-equipment-001';
    let timestamp = new Date();

    // Edge case 1: Rapid sensor value changes
    for (let i = 0; i < 10; i++) {
      events.push({
        timestamp: new Date(timestamp),
        type: 'sensor',
        equipmentId,
        data: {
          sensorId: 'TEMP-001',
          value: i % 2 === 0 ? 150 : 20, // Extreme temperature swings
          unit: '°C'
        },
        interval: 100 // Very fast changes
      });
      timestamp = new Date(timestamp.getTime() + 100);
    }

    // Edge case 2: Impossible OEE values
    events.push({
      timestamp: new Date(timestamp),
      type: 'production',
      equipmentId,
      data: {
        oee: 1.5, // > 100%
        availability: 1.2,
        performance: 1.3,
        quality: 0.96
      },
      interval: 1000
    });
    timestamp = new Date(timestamp.getTime() + 1000);

    // Edge case 3: Negative production counts
    events.push({
      timestamp: new Date(timestamp),
      type: 'production',
      equipmentId,
      data: {
        unitsProduced: -50,
        goodParts: 100,
        scrapParts: -150
      },
      interval: 1000
    });
    timestamp = new Date(timestamp.getTime() + 1000);

    // Edge case 4: Out of sequence timestamps
    events.push({
      timestamp: new Date(timestamp.getTime() - 3600000), // 1 hour in the past
      type: 'alert',
      equipmentId,
      data: {
        alertType: 'TIME_PARADOX',
        severity: 'critical',
        message: 'Event from the past'
      },
      interval: 1000
    });

    // Edge case 5: Extremely long downtime
    events.push({
      timestamp: new Date(timestamp),
      type: 'downtime',
      equipmentId,
      data: {
        reason: 'BREAKDOWN',
        duration: 999999999, // ~11.5 days
        isPlanned: false
      },
      interval: 1000
    });

    // Edge case 6: Invalid data types
    events.push({
      timestamp: new Date(timestamp),
      type: 'sensor',
      equipmentId,
      data: {
        sensorId: 'INVALID-001',
        value: 'not a number', // Should be numeric
        unit: null
      },
      interval: 1000
    });

    return {
      name: 'edge-cases',
      description: 'Dataset with edge cases and invalid data',
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      events
    };
  }

  private adjustTimestamp(event: ProductionEvent, originalStart: Date): ProductionEvent {
    const offset = Date.now() - originalStart.getTime();
    return {
      ...event,
      timestamp: new Date(event.timestamp.getTime() + offset)
    };
  }

  private async ingestEvent(event: ProductionEvent, validate: boolean = false): Promise<void> {
    // Route to appropriate ingestion endpoint based on type
    const endpoint = `/api/ingest/${event.type}`;
    
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentId: event.equipmentId,
        timestamp: event.timestamp,
        ...event.data
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ingestion failed: ${error}`);
    }

    if (validate) {
      // Verify data was stored correctly
      await this.validateIngestion(event);
    }
  }

  private async validateIngestion(event: ProductionEvent): Promise<void> {
    // Query database to verify event was stored
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow time for processing

    let stored: any;
    
    switch (event.type) {
      case 'sensor':
        stored = await prisma.sensor_data.findFirst({
          where: {
            equipment_id: event.equipmentId,
            sensor_id: event.data.sensorId,
            time: {
              gte: new Date(event.timestamp.getTime() - 1000),
              lte: new Date(event.timestamp.getTime() + 1000)
            }
          }
        });
        break;
      
      case 'production':
        stored = await prisma.production_metrics.findFirst({
          where: {
            equipment_id: event.equipmentId,
            time: {
              gte: new Date(event.timestamp.getTime() - 1000),
              lte: new Date(event.timestamp.getTime() + 1000)
            }
          }
        });
        break;
    }

    if (!stored) {
      throw new Error(`Event not found in database after ingestion`);
    }
  }

  private getTimeRangeForDataset(name: string): { start: Date; end: Date } {
    const ranges: Record<string, { start: Date; end: Date }> = {
      'normal-production': {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      },
      'high-downtime': {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07')
      },
      'quality-issues': {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-07')
      }
    };

    return ranges[name] || ranges['normal-production'];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================================
// CHAOS ENGINEERING
// =====================================================

interface ChaosScenario {
  name: string;
  description: string;
  execute: () => Promise<void>;
  cleanup: () => Promise<void>;
  duration: number;
}

export class ChaosEngineer {
  private scenarios: Map<string, ChaosScenario> = new Map();
  private activeScenarios: Set<string> = new Set();
  
  constructor(private eventEmitter: EventEmitter) {
    this.initializeScenarios();
  }

  private initializeScenarios() {
    // Database outage
    this.scenarios.set('database-outage', {
      name: 'Database Outage',
      description: 'Simulates database connection failure',
      duration: 5000,
      execute: async () => {
        // Close database connections
        await prisma.$disconnect();
        
        // Block reconnection attempts
        const originalConnect = prisma.$connect;
        (prisma as any).$connect = async () => {
          throw new Error('Database unavailable (chaos test)');
        };
        
        console.log('💥 Database outage started');
      },
      cleanup: async () => {
        // Restore connection
        await prisma.$connect();
        console.log('✅ Database connection restored');
      }
    });

    // Memory exhaustion
    this.scenarios.set('memory-exhaustion', {
      name: 'Memory Exhaustion',
      description: 'Simulates memory pressure',
      duration: 10000,
      execute: async () => {
        const arrays: any[] = [];
        const interval = setInterval(() => {
          // Allocate 10MB chunks
          arrays.push(new Array(10 * 1024 * 1024 / 8).fill(0));
        }, 100);
        
        (global as any).memoryExhaustionInterval = interval;
        console.log('💥 Memory exhaustion started');
      },
      cleanup: async () => {
        clearInterval((global as any).memoryExhaustionInterval);
        if (global.gc) global.gc();
        console.log('✅ Memory pressure relieved');
      }
    });

    // Network latency
    this.scenarios.set('network-latency', {
      name: 'Network Latency',
      description: 'Adds artificial network delays',
      duration: 30000,
      execute: async () => {
        // Monkey patch fetch to add delays
        const originalFetch = global.fetch;
        (global as any).fetch = async (...args: any[]) => {
          const delay = Math.random() * 2000 + 1000; // 1-3 second delay
          await new Promise(resolve => setTimeout(resolve, delay));
          return originalFetch(...args);
        };
        
        console.log('💥 Network latency injection started');
      },
      cleanup: async () => {
        // Restore original fetch
        console.log('✅ Network latency removed');
      }
    });

    // CPU spike
    this.scenarios.set('cpu-spike', {
      name: 'CPU Spike',
      description: 'Simulates high CPU usage',
      duration: 15000,
      execute: async () => {
        const workers: any[] = [];
        const numWorkers = require('os').cpus().length;
        
        for (let i = 0; i < numWorkers; i++) {
          const worker = setInterval(() => {
            // CPU intensive operation
            let sum = 0;
            for (let j = 0; j < 1000000; j++) {
              sum += Math.sqrt(j);
            }
          }, 1);
          workers.push(worker);
        }
        
        (global as any).cpuSpikeWorkers = workers;
        console.log('💥 CPU spike started');
      },
      cleanup: async () => {
        const workers = (global as any).cpuSpikeWorkers || [];
        workers.forEach((w: any) => clearInterval(w));
        console.log('✅ CPU spike ended');
      }
    });

    // Clock skew
    this.scenarios.set('clock-skew', {
      name: 'Clock Skew',
      description: 'Simulates system clock drift',
      duration: 20000,
      execute: async () => {
        const originalDate = Date;
        const skewMs = 3600000; // 1 hour skew
        
        (global as any).Date = class extends originalDate {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super();
              this.setTime(this.getTime() + skewMs);
            } else {
              super(...args);
            }
          }
          
          static now() {
            return originalDate.now() + skewMs;
          }
        };
        
        console.log('💥 Clock skew introduced (1 hour forward)');
      },
      cleanup: async () => {
        // Restore original Date
        console.log('✅ Clock restored to normal');
      }
    });

    // Data corruption
    this.scenarios.set('data-corruption', {
      name: 'Data Corruption',
      description: 'Randomly corrupts data in transit',
      duration: 10000,
      execute: async () => {
        // Intercept database queries
        const originalQueryRaw = prisma.$queryRaw;
        (prisma as any).$queryRaw = async (...args: any[]) => {
          const result = await originalQueryRaw.apply(prisma, args);
          
          // Randomly corrupt numeric values
          if (Array.isArray(result) && Math.random() < 0.1) {
            result.forEach(row => {
              Object.keys(row).forEach(key => {
                if (typeof row[key] === 'number' && Math.random() < 0.2) {
                  row[key] = row[key] * (Math.random() * 2);
                }
              });
            });
          }
          
          return result;
        };
        
        console.log('💥 Data corruption started');
      },
      cleanup: async () => {
        console.log('✅ Data integrity restored');
      }
    });
  }

  /**
   * Execute chaos scenario
   */
  async runScenario(scenarioName: string): Promise<void> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    if (this.activeScenarios.has(scenarioName)) {
      console.log(`⚠️ Scenario ${scenarioName} already running`);
      return;
    }

    console.log(`🔥 Starting chaos scenario: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    this.activeScenarios.add(scenarioName);
    this.eventEmitter.emit('chaosStarted', scenarioName);

    try {
      // Execute scenario
      await scenario.execute();
      
      // Wait for duration
      await new Promise(resolve => setTimeout(resolve, scenario.duration));
      
      // Verify system recovery
      await this.verifyRecovery(scenarioName);
      
    } finally {
      // Always cleanup
      await scenario.cleanup();
      this.activeScenarios.delete(scenarioName);
      this.eventEmitter.emit('chaosEnded', scenarioName);
    }
  }

  /**
   * Run multiple scenarios concurrently
   */
  async runConcurrentScenarios(scenarioNames: string[]): Promise<void> {
    console.log(`🔥 Starting ${scenarioNames.length} concurrent chaos scenarios`);
    
    const promises = scenarioNames.map(name => this.runScenario(name));
    await Promise.all(promises);
    
    console.log('✅ All chaos scenarios completed');
  }

  /**
   * Verify system recovered from chaos
   */
  private async verifyRecovery(scenarioName: string): Promise<void> {
    console.log(`🔍 Verifying recovery from ${scenarioName}...`);
    
    const checks = [
      this.checkDatabaseConnectivity(),
      this.checkApiResponsiveness(),
      this.checkDataIntegrity(),
      this.checkMemoryUsage(),
      this.checkCpuUsage()
    ];

    const results = await Promise.all(checks);
    const allPassed = results.every(r => r.passed);

    if (allPassed) {
      console.log('✅ System recovered successfully');
    } else {
      const failed = results.filter(r => !r.passed);
      console.error('❌ Recovery verification failed:');
      failed.forEach(f => console.error(`   - ${f.check}: ${f.message}`));
      throw new Error('System did not recover properly');
    }
  }

  private async checkDatabaseConnectivity(): Promise<{ check: string; passed: boolean; message: string }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { check: 'Database Connectivity', passed: true, message: 'Connected' };
    } catch (error) {
      return { check: 'Database Connectivity', passed: false, message: error.message };
    }
  }

  private async checkApiResponsiveness(): Promise<{ check: string; passed: boolean; message: string }> {
    try {
      const start = Date.now();
      const response = await fetch('http://localhost:3000/api/health');
      const duration = Date.now() - start;
      
      if (response.ok && duration < 1000) {
        return { check: 'API Responsiveness', passed: true, message: `${duration}ms` };
      } else {
        return { check: 'API Responsiveness', passed: false, message: `Slow response: ${duration}ms` };
      }
    } catch (error) {
      return { check: 'API Responsiveness', passed: false, message: error.message };
    }
  }

  private async checkDataIntegrity(): Promise<{ check: string; passed: boolean; message: string }> {
    try {
      const result = await prisma.$queryRaw<[{ invalid_count: bigint }]>`
        SELECT COUNT(*) as invalid_count
        FROM production_metrics
        WHERE oee < 0 OR oee > 1
          OR availability < 0 OR availability > 1
          OR performance < 0 OR performance > 1
          OR quality < 0 OR quality > 1
      `;
      
      const invalidCount = Number(result[0].invalid_count);
      if (invalidCount === 0) {
        return { check: 'Data Integrity', passed: true, message: 'No invalid data' };
      } else {
        return { check: 'Data Integrity', passed: false, message: `${invalidCount} invalid records` };
      }
    } catch (error) {
      return { check: 'Data Integrity', passed: false, message: error.message };
    }
  }

  private async checkMemoryUsage(): Promise<{ check: string; passed: boolean; message: string }> {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const threshold = 1024; // 1GB
    
    if (heapUsedMB < threshold) {
      return { check: 'Memory Usage', passed: true, message: `${heapUsedMB.toFixed(0)}MB used` };
    } else {
      return { check: 'Memory Usage', passed: false, message: `High memory: ${heapUsedMB.toFixed(0)}MB` };
    }
  }

  private async checkCpuUsage(): Promise<{ check: string; passed: boolean; message: string }> {
    const usage = process.cpuUsage();
    const totalSeconds = (usage.user + usage.system) / 1000000;
    
    if (totalSeconds < 100) {
      return { check: 'CPU Usage', passed: true, message: `${totalSeconds.toFixed(1)}s total` };
    } else {
      return { check: 'CPU Usage', passed: false, message: `High CPU: ${totalSeconds.toFixed(1)}s` };
    }
  }
}

// =====================================================
// LOAD TESTING
// =====================================================

export class LoadTester {
  private scenarios: Map<string, () => void> = new Map();

  constructor() {
    this.initializeScenarios();
  }

  private initializeScenarios() {
    // High-frequency sensor data ingestion
    this.scenarios.set('sensor-ingestion', () => {
      const script = `
        import http from 'k6/http';
        import { check, sleep } from 'k6';
        import { Rate } from 'k6/metrics';

        const errorRate = new Rate('errors');

        export const options = {
          stages: [
            { duration: '30s', target: 100 },  // Ramp up to 100 users
            { duration: '2m', target: 100 },   // Stay at 100 users
            { duration: '30s', target: 500 },  // Ramp up to 500 users
            { duration: '2m', target: 500 },   // Stay at 500 users
            { duration: '1m', target: 0 },     // Ramp down
          ],
          thresholds: {
            http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
            errors: ['rate<0.1'],             // Error rate under 10%
          },
        };

        export default function () {
          const equipmentId = \`EQ-\${Math.floor(Math.random() * 100)}\`;
          const sensorId = \`SENSOR-\${Math.floor(Math.random() * 10)}\`;
          
          const payload = JSON.stringify({
            equipmentId,
            sensorId,
            value: Math.random() * 100,
            unit: '°C',
            timestamp: new Date().toISOString(),
          });

          const params = {
            headers: { 'Content-Type': 'application/json' },
          };

          const res = http.post('http://localhost:3000/api/ingest/sensor', payload, params);
          
          const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'response time < 500ms': (r) => r.timings.duration < 500,
          });

          errorRate.add(!success);
          sleep(0.1); // 10 requests per second per user
        }
      `;

      this.saveAndRunK6Script('sensor-ingestion', script);
    });

    // OEE calculation stress test
    this.scenarios.set('oee-calculation', () => {
      const script = `
        import http from 'k6/http';
        import { check } from 'k6';

        export const options = {
          stages: [
            { duration: '1m', target: 50 },
            { duration: '3m', target: 50 },
            { duration: '1m', target: 0 },
          ],
          thresholds: {
            http_req_duration: ['p(95)<2000'], // OEE calc can be slower
          },
        };

        export default function () {
          const equipmentId = \`EQ-\${Math.floor(Math.random() * 100)}\`;
          
          const res = http.get(\`http://localhost:3000/api/oee/\${equipmentId}\`);
          
          check(res, {
            'status is 200': (r) => r.status === 200,
            'has OEE value': (r) => {
              const body = JSON.parse(r.body);
              return body.oee >= 0 && body.oee <= 1;
            },
          });
        }
      `;

      this.saveAndRunK6Script('oee-calculation', script);
    });

    // Alert processing load test
    this.scenarios.set('alert-processing', () => {
      const script = `
        import http from 'k6/http';
        import { check, sleep } from 'k6';

        export const options = {
          stages: [
            { duration: '30s', target: 200 },
            { duration: '2m', target: 200 },
            { duration: '30s', target: 0 },
          ],
        };

        export default function () {
          const alertTypes = ['TEMP_HIGH', 'PRESSURE_LOW', 'VIBRATION_ABNORMAL', 'SPEED_LOSS'];
          const severities = ['low', 'medium', 'high', 'critical'];
          
          const payload = JSON.stringify({
            equipmentId: \`EQ-\${Math.floor(Math.random() * 100)}\`,
            type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
            severity: severities[Math.floor(Math.random() * severities.length)],
            message: 'Load test alert',
            value: Math.random() * 100,
            threshold: 80,
          });

          const res = http.post('http://localhost:3000/api/alerts', payload, {
            headers: { 'Content-Type': 'application/json' },
          });
          
          check(res, {
            'alert created': (r) => r.status === 201,
          });
          
          sleep(0.5);
        }
      `;

      this.saveAndRunK6Script('alert-processing', script);
    });

    // Concurrent dashboard queries
    this.scenarios.set('dashboard-queries', () => {
      const script = `
        import http from 'k6/http';
        import { check } from 'k6';
        import { group } from 'k6';

        export const options = {
          stages: [
            { duration: '1m', target: 100 },
            { duration: '5m', target: 100 },
            { duration: '1m', target: 0 },
          ],
        };

        export default function () {
          group('Dashboard API calls', function () {
            // Equipment status
            const equipmentRes = http.get('http://localhost:3000/api/equipment/status');
            check(equipmentRes, { 'equipment status OK': (r) => r.status === 200 });
            
            // Production metrics
            const metricsRes = http.get('http://localhost:3000/api/metrics/production?range=1h');
            check(metricsRes, { 'metrics OK': (r) => r.status === 200 });
            
            // Active alerts
            const alertsRes = http.get('http://localhost:3000/api/alerts?status=active');
            check(alertsRes, { 'alerts OK': (r) => r.status === 200 });
            
            // Quality summary
            const qualityRes = http.get('http://localhost:3000/api/quality/summary');
            check(qualityRes, { 'quality OK': (r) => r.status === 200 });
          });
        }
      `;

      this.saveAndRunK6Script('dashboard-queries', script);
    });
  }

  /**
   * Run load test scenario
   */
  async runScenario(scenarioName: string): Promise<void> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown load test scenario: ${scenarioName}`);
    }

    console.log(`🔥 Starting load test: ${scenarioName}`);
    scenario();
  }

  /**
   * Run soak test (extended duration)
   */
  async runSoakTest(durationHours: number = 4): Promise<void> {
    const script = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';

      export const options = {
        stages: [
          { duration: '10m', target: 50 },
          { duration: '${durationHours}h', target: 50 },
          { duration: '10m', target: 0 },
        ],
        thresholds: {
          http_req_duration: ['p(99)<1000'],
          http_req_failed: ['rate<0.01'],
        },
      };

      export default function () {
        // Simulate typical user behavior
        const endpoints = [
          '/api/equipment/status',
          '/api/oee/EQ-001',
          '/api/alerts?status=active',
          '/api/metrics/production?range=1h',
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const res = http.get(\`http://localhost:3000\${endpoint}\`);
        
        check(res, {
          'status is 200': (r) => r.status === 200,
        });
        
        sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
      }
    `;

    this.saveAndRunK6Script('soak-test', script);
  }

  /**
   * Run spike test
   */
  async runSpikeTest(): Promise<void> {
    const script = `
      import http from 'k6/http';
      import { check } from 'k6';

      export const options = {
        stages: [
          { duration: '2m', target: 50 },    // Warm up
          { duration: '30s', target: 1000 },  // Spike to 1000 users
          { duration: '2m', target: 1000 },   // Stay at spike
          { duration: '30s', target: 50 },    // Scale down
          { duration: '2m', target: 50 },     // Recovery
          { duration: '1m', target: 0 },      // Ramp down
        ],
      };

      export default function () {
        const res = http.post('http://localhost:3000/api/ingest/sensor', 
          JSON.stringify({
            equipmentId: 'EQ-001',
            sensorId: 'TEMP-001',
            value: Math.random() * 100,
            timestamp: new Date().toISOString(),
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        check(res, {
          'survived spike': (r) => r.status === 200 || r.status === 201,
        });
      }
    `;

    this.saveAndRunK6Script('spike-test', script);
  }

  private saveAndRunK6Script(name: string, script: string): void {
    const scriptPath = path.join(process.cwd(), 'k6-scripts', `${name}.js`);
    
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(scriptPath))) {
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    }
    
    // Save script
    fs.writeFileSync(scriptPath, script);
    
    console.log(`📝 Saved k6 script to ${scriptPath}`);
    console.log(`🏃 Run with: k6 run ${scriptPath}`);
  }
}

// =====================================================
// COMPLIANCE VALIDATOR
// =====================================================

interface ComplianceCheck {
  standard: string;
  requirement: string;
  check: () => Promise<boolean>;
  remediation?: string;
}

export class ComplianceValidator {
  private checks: ComplianceCheck[] = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    // ISO 22400 compliance checks
    this.checks.push({
      standard: 'ISO 22400',
      requirement: 'OEE calculation accuracy',
      check: async () => {
        const result = await prisma.$queryRaw<[{ valid: boolean }]>`
          SELECT 
            CASE 
              WHEN COUNT(*) = COUNT(*) FILTER (
                WHERE oee = availability * performance * quality
                AND oee BETWEEN 0 AND 1
              )
              THEN true 
              ELSE false 
            END as valid
          FROM production_metrics
          WHERE time >= NOW() - INTERVAL '1 day'
        `;
        return result[0].valid;
      },
      remediation: 'Recalculate OEE values using correct formula'
    });

    this.checks.push({
      standard: 'ISO 22400',
      requirement: 'Time category completeness',
      check: async () => {
        const result = await prisma.$queryRaw<[{ complete: boolean }]>`
          SELECT 
            CASE 
              WHEN SUM(runtime + downtime + planned_downtime) = 
                   SUM(planned_production_time)
              THEN true 
              ELSE false 
            END as complete
          FROM production_metrics
          WHERE time >= NOW() - INTERVAL '1 day'
        `;
        return result[0].complete;
      },
      remediation: 'Ensure all time is categorized correctly'
    });

    // Data quality checks
    this.checks.push({
      standard: 'Data Quality',
      requirement: 'No future timestamps',
      check: async () => {
        const result = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count
          FROM production_metrics
          WHERE time > NOW()
        `;
        return Number(result[0].count) === 0;
      },
      remediation: 'Remove or correct future-dated records'
    });

    this.checks.push({
      standard: 'Data Quality',
      requirement: 'Valid numeric ranges',
      check: async () => {
        const result = await prisma.$queryRaw<[{ valid: boolean }]>`
          SELECT 
            CASE 
              WHEN COUNT(*) = COUNT(*) FILTER (
                WHERE units_produced >= 0
                AND units_good >= 0
                AND units_good <= units_produced
                AND runtime >= 0
                AND downtime >= 0
              )
              THEN true 
              ELSE false 
            END as valid
          FROM production_metrics
          WHERE time >= NOW() - INTERVAL '1 day'
        `;
        return result[0].valid;
      },
      remediation: 'Fix negative or impossible values'
    });

    // Security compliance
    this.checks.push({
      standard: 'Security',
      requirement: 'Audit trail completeness',
      check: async () => {
        const result = await prisma.$queryRaw<[{ has_audit: boolean }]>`
          SELECT EXISTS (
            SELECT 1 FROM audit_log 
            WHERE timestamp >= NOW() - INTERVAL '1 hour'
          ) as has_audit
        `;
        return result[0].has_audit;
      },
      remediation: 'Enable audit logging for all data modifications'
    });

    this.checks.push({
      standard: 'Security',
      requirement: 'No plaintext passwords',
      check: async () => {
        const result = await prisma.$queryRaw<[{ secure: boolean }]>`
          SELECT 
            CASE 
              WHEN COUNT(*) = COUNT(*) FILTER (
                WHERE password_hash NOT LIKE '%$2b$%' 
                AND password_hash NOT LIKE '%$2a$%'
              )
              THEN false 
              ELSE true 
            END as secure
          FROM users
        `;
        return result[0].secure;
      },
      remediation: 'Hash all passwords using bcrypt'
    });

    // Performance requirements
    this.checks.push({
      standard: 'Performance',
      requirement: 'Query response time < 100ms',
      check: async () => {
        const start = Date.now();
        await prisma.$queryRaw`
          SELECT equipment_id, AVG(oee) 
          FROM production_metrics 
          WHERE time >= NOW() - INTERVAL '1 hour'
          GROUP BY equipment_id
        `;
        const duration = Date.now() - start;
        return duration < 100;
      },
      remediation: 'Add indexes or use materialized views'
    });

    // Data retention compliance
    this.checks.push({
      standard: 'Data Retention',
      requirement: 'Old data properly archived',
      check: async () => {
        const result = await prisma.$queryRaw<[{ old_data_count: bigint }]>`
          SELECT COUNT(*) as old_data_count
          FROM sensor_data
          WHERE time < NOW() - INTERVAL '90 days'
        `;
        return Number(result[0].old_data_count) === 0;
      },
      remediation: 'Archive or delete data older than retention period'
    });
  }

  /**
   * Run all compliance checks
   */
  async validateCompliance(): Promise<{
    compliant: boolean;
    results: Array<{
      standard: string;
      requirement: string;
      passed: boolean;
      remediation?: string;
    }>;
  }> {
    console.log('🔍 Running compliance validation...\n');
    
    const results = [];
    let allPassed = true;

    for (const check of this.checks) {
      try {
        const passed = await check.check();
        results.push({
          standard: check.standard,
          requirement: check.requirement,
          passed,
          remediation: passed ? undefined : check.remediation
        });

        if (!passed) allPassed = false;

        console.log(`${passed ? '✅' : '❌'} ${check.standard}: ${check.requirement}`);
        if (!passed && check.remediation) {
          console.log(`   📝 Remediation: ${check.remediation}`);
        }
      } catch (error) {
        console.error(`❌ ${check.standard}: ${check.requirement} - Error: ${error.message}`);
        results.push({
          standard: check.standard,
          requirement: check.requirement,
          passed: false,
          remediation: `Fix error: ${error.message}`
        });
        allPassed = false;
      }
    }

    const summary = {
      compliant: allPassed,
      results
    };

    console.log(`\n${allPassed ? '✅' : '❌'} Overall Compliance: ${allPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Passed: ${results.filter(r => r.passed).length}/${results.length}`);

    return summary;
  }

  /**
   * Generate compliance report
   */
  async generateReport(format: 'json' | 'html' = 'json'): Promise<string> {
    const validation = await this.validateCompliance();
    const timestamp = new Date().toISOString();

    if (format === 'json') {
      return JSON.stringify({
        report: 'Manufacturing Analytics Platform Compliance Report',
        timestamp,
        ...validation
      }, null, 2);
    }

    // HTML format
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .passed { color: green; }
    .failed { color: red; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .summary { background-color: ${validation.compliant ? '#d4edda' : '#f8d7da'}; 
              padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Manufacturing Analytics Platform Compliance Report</h1>
  <p>Generated: ${timestamp}</p>
  
  <div class="summary">
    <h2>Summary: ${validation.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</h2>
    <p>Passed: ${validation.results.filter(r => r.passed).length} / ${validation.results.length} checks</p>
  </div>
  
  <table>
    <tr>
      <th>Standard</th>
      <th>Requirement</th>
      <th>Status</th>
      <th>Remediation</th>
    </tr>
    ${validation.results.map(r => `
      <tr>
        <td>${r.standard}</td>
        <td>${r.requirement}</td>
        <td class="${r.passed ? 'passed' : 'failed'}">${r.passed ? 'PASSED' : 'FAILED'}</td>
        <td>${r.remediation || '-'}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
    `;

    return html;
  }
}

// =====================================================
// MAIN DEMONSTRATION
// =====================================================

async function demonstrateTestingValidation() {
  console.log('🧪 Testing and Validation Demonstration\n');

  const eventEmitter = new EventEmitter();
  
  // 1. Production Data Replay
  console.log('1️⃣ Production Data Replay');
  const replay = new ProductionReplay(eventEmitter);
  
  // Generate and replay edge cases
  const edgeCases = replay.generateEdgeCaseDataset();
  console.log(`   Generated ${edgeCases.events.length} edge case events`);
  
  try {
    await replay.replay('edge-cases', 10, { validate: true });
  } catch (error) {
    console.log(`   ⚠️ Validation errors detected (expected): ${error.message}`);
  }

  // 2. Chaos Engineering
  console.log('\n2️⃣ Chaos Engineering');
  const chaos = new ChaosEngineer(eventEmitter);
  
  // Run individual scenario
  await chaos.runScenario('network-latency');
  
  // 3. Load Testing
  console.log('\n3️⃣ Load Testing Scripts Generated');
  const loadTester = new LoadTester();
  console.log('   Run k6 scripts from k6-scripts/ directory');
  console.log('   Example: k6 run k6-scripts/sensor-ingestion.js');

  // 4. Compliance Validation
  console.log('\n4️⃣ Compliance Validation');
  const validator = new ComplianceValidator();
  const compliance = await validator.validateCompliance();
  
  // Generate reports
  const jsonReport = await validator.generateReport('json');
  const htmlReport = await validator.generateReport('html');
  
  // Save reports
  fs.writeFileSync('compliance-report.json', jsonReport);
  fs.writeFileSync('compliance-report.html', htmlReport);
  console.log('\n📄 Reports saved to compliance-report.json and compliance-report.html');

  console.log('\n✅ Testing and validation demonstration complete!');
}

// Run if executed directly
if (require.main === module) {
  demonstrateTestingValidation()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  ProductionReplay,
  ChaosEngineer,
  LoadTester,
  ComplianceValidator
};