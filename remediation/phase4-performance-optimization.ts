#!/usr/bin/env ts-node
/**
 * Phase 4: Performance Optimization
 * Implements DataLoader pattern, cursor pagination, caching strategy
 */

import DataLoader from 'dataloader';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

// =====================================================
// DATALOADER IMPLEMENTATIONS
// =====================================================

/**
 * Equipment Metrics DataLoader
 * Batches and caches equipment metric queries
 */
export class EquipmentMetricsLoader extends DataLoader<string, any[]> {
  constructor(private timeRange: { start: Date; end: Date }) {
    super(
      async (equipmentIds: readonly string[]) => {
        console.log(`🔄 Batching ${equipmentIds.length} equipment metric queries`);
        
        const metrics = await prisma.$queryRaw<any[]>`
          SELECT 
            equipment_id,
            time,
            oee,
            availability,
            performance,
            quality,
            units_produced,
            units_good,
            runtime,
            downtime
          FROM production_metrics
          WHERE equipment_id = ANY(${equipmentIds}::uuid[])
            AND time >= ${this.timeRange.start}
            AND time <= ${this.timeRange.end}
          ORDER BY equipment_id, time DESC
        `;

        // Group results by equipment ID
        const grouped = equipmentIds.map(id => 
          metrics.filter(m => m.equipment_id === id)
        );

        return grouped;
      },
      {
        cacheKeyFn: (key) => `${key}:${this.timeRange.start.getTime()}:${this.timeRange.end.getTime()}`,
        maxBatchSize: 100
      }
    );
  }
}

/**
 * Alert DataLoader
 * Batches alert queries by equipment
 */
export class AlertLoader extends DataLoader<string, any[]> {
  constructor(private status: 'active' | 'resolved' | 'all' = 'all') {
    super(
      async (equipmentIds: readonly string[]) => {
        console.log(`🔄 Batching ${equipmentIds.length} alert queries`);
        
        let whereClause = 'equipment_id = ANY($1::uuid[])';
        const params: any[] = [equipmentIds];
        
        if (this.status !== 'all') {
          whereClause += ' AND status = $2';
          params.push(this.status);
        }

        const alerts = await prisma.$queryRawUnsafe<any[]>(`
          SELECT * FROM alerts
          WHERE ${whereClause}
          ORDER BY equipment_id, severity DESC, timestamp DESC
          LIMIT 100
        `, ...params);

        return equipmentIds.map(id => 
          alerts.filter(a => a.equipment_id === id)
        );
      },
      {
        maxBatchSize: 50
      }
    );
  }
}

/**
 * Sensor Data Loader
 * Efficiently loads sensor data with time-based partitioning awareness
 */
export class SensorDataLoader extends DataLoader<
  { equipmentId: string; sensorId: string; hours: number },
  any[]
> {
  constructor() {
    super(
      async (keys) => {
        console.log(`🔄 Batching ${keys.length} sensor data queries`);
        
        // Group by time range for efficient querying
        const timeGroups = new Map<number, typeof keys>();
        
        keys.forEach(key => {
          const group = timeGroups.get(key.hours) || [];
          group.push(key);
          timeGroups.set(key.hours, group);
        });

        const allResults = new Map<string, any[]>();

        // Query each time group separately (takes advantage of partitioning)
        for (const [hours, groupKeys] of timeGroups) {
          const equipmentIds = groupKeys.map(k => k.equipmentId);
          const sensorIds = groupKeys.map(k => k.sensorId);
          const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

          const data = await prisma.$queryRaw<any[]>`
            SELECT 
              equipment_id,
              sensor_id,
              time,
              value,
              unit,
              quality_flag
            FROM sensor_data
            WHERE equipment_id = ANY(${equipmentIds}::uuid[])
              AND sensor_id = ANY(${sensorIds}::text[])
              AND time >= ${startTime}
            ORDER BY time DESC
          `;

          // Store results
          groupKeys.forEach(key => {
            const keyStr = `${key.equipmentId}:${key.sensorId}`;
            allResults.set(keyStr, 
              data.filter(d => 
                d.equipment_id === key.equipmentId && 
                d.sensor_id === key.sensorId
              )
            );
          });
        }

        // Return in same order as keys
        return keys.map(key => {
          const keyStr = `${key.equipmentId}:${key.sensorId}`;
          return allResults.get(keyStr) || [];
        });
      },
      {
        cacheKeyFn: (key) => `${key.equipmentId}:${key.sensorId}:${key.hours}h`
      }
    );
  }
}

// =====================================================
// CURSOR-BASED PAGINATION
// =====================================================

interface PaginationOptions {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

export class CursorPagination {
  /**
   * Encode cursor from object
   */
  static encodeCursor(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Decode cursor to object
   */
  static decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      throw new Error('Invalid cursor');
    }
  }

  /**
   * Paginate production metrics with cursor
   */
  static async paginateProductionMetrics(
    options: PaginationOptions & { equipmentId?: string; startDate?: Date; endDate?: Date }
  ): Promise<PaginatedResult<any>> {
    const limit = Math.min(options.limit || 50, 100);
    const orderBy = options.orderBy || 'time';
    const orderDirection = options.orderDirection || 'desc';

    let whereConditions = [];
    let whereParams: any = {};
    let paramIndex = 1;

    // Build where conditions
    if (options.equipmentId) {
      whereConditions.push(`equipment_id = $${paramIndex}`);
      whereParams[paramIndex++] = options.equipmentId;
    }

    if (options.startDate) {
      whereConditions.push(`time >= $${paramIndex}`);
      whereParams[paramIndex++] = options.startDate;
    }

    if (options.endDate) {
      whereConditions.push(`time <= $${paramIndex}`);
      whereParams[paramIndex++] = options.endDate;
    }

    // Handle cursor
    if (options.cursor) {
      const decoded = this.decodeCursor(options.cursor);
      const cursorOp = orderDirection === 'desc' ? '<' : '>';
      whereConditions.push(`(${orderBy}, id) ${cursorOp} ($${paramIndex}, $${paramIndex + 1})`);
      whereParams[paramIndex++] = decoded[orderBy];
      whereParams[paramIndex++] = decoded.id;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Fetch data with one extra for hasNextPage check
    const query = `
      SELECT *
      FROM production_metrics
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}, id ${orderDirection}
      LIMIT ${limit + 1}
    `;

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...Object.values(whereParams));
    
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    // Get total count (optional, can be expensive)
    let totalCount;
    if (options.cursor === undefined) {
      const countQuery = `
        SELECT COUNT(*) as count
        FROM production_metrics
        ${whereClause}
      `;
      const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        countQuery, 
        ...Object.values(whereParams).slice(0, -2) // Exclude cursor params
      );
      totalCount = Number(countResult[0].count);
    }

    return {
      data,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!options.cursor,
        startCursor: data.length > 0 
          ? this.encodeCursor({ [orderBy]: data[0][orderBy], id: data[0].id })
          : undefined,
        endCursor: data.length > 0 
          ? this.encodeCursor({ [orderBy]: data[data.length - 1][orderBy], id: data[data.length - 1].id })
          : undefined,
        totalCount
      }
    };
  }
}

// =====================================================
// MULTI-LAYER CACHING STRATEGY
// =====================================================

interface CacheLayerOptions {
  ttl: number;
  maxSize?: number;
  updateOnHit?: boolean;
}

export class MultiLayerCache {
  private l1Cache: LRUCache<string, any>; // In-memory
  private l2Cache: Redis;                 // Distributed
  private stats = {
    hits: { l1: 0, l2: 0, miss: 0 },
    sets: 0,
    evictions: 0
  };

  constructor(
    private name: string,
    l1Options: CacheLayerOptions,
    redisClient?: Redis
  ) {
    this.l1Cache = new LRUCache({
      max: l1Options.maxSize || 1000,
      ttl: l1Options.ttl * 1000, // Convert to ms
      updateAgeOnGet: l1Options.updateOnHit || false,
      dispose: () => this.stats.evictions++
    });

    this.l2Cache = redisClient || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      keyPrefix: `cache:${name}:`
    });
  }

  /**
   * Get value with cache-aside pattern
   */
  async get<T>(
    key: string, 
    factory: () => Promise<T>,
    options?: { ttl?: number; skip?: boolean }
  ): Promise<T> {
    if (options?.skip) {
      return factory();
    }

    // Check L1 cache
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      this.stats.hits.l1++;
      return l1Value;
    }

    // Check L2 cache
    const l2Value = await this.l2Cache.get(key);
    if (l2Value) {
      this.stats.hits.l2++;
      const parsed = JSON.parse(l2Value);
      
      // Promote to L1
      this.l1Cache.set(key, parsed);
      
      return parsed;
    }

    // Cache miss - compute value
    this.stats.hits.miss++;
    const value = await factory();
    
    // Set in both layers
    await this.set(key, value, options?.ttl);
    
    return value;
  }

  /**
   * Set value in all cache layers
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.stats.sets++;
    
    // Set in L1
    this.l1Cache.set(key, value);
    
    // Set in L2 with TTL
    const effectiveTtl = ttl || 300; // Default 5 minutes
    await this.l2Cache.setex(key, effectiveTtl, JSON.stringify(value));
  }

  /**
   * Invalidate across all layers
   */
  async invalidate(pattern: string): Promise<void> {
    // Clear from L1
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
      }
    }
    
    // Clear from L2
    const keys = await this.l2Cache.keys(`cache:${this.name}:${pattern}*`);
    if (keys.length > 0) {
      await this.l2Cache.del(...keys);
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmUp(warmUpFn: () => Promise<Array<{ key: string; value: any; ttl?: number }>>): Promise<void> {
    console.log(`🔥 Warming up ${this.name} cache...`);
    
    const items = await warmUpFn();
    
    for (const item of items) {
      await this.set(item.key, item.value, item.ttl);
    }
    
    console.log(`✅ Warmed up ${items.length} items in ${this.name} cache`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits.l1 + this.stats.hits.l2 + this.stats.hits.miss;
    const hitRate = total > 0 
      ? ((this.stats.hits.l1 + this.stats.hits.l2) / total * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      l1Size: this.l1Cache.size,
      l1Capacity: this.l1Cache.max
    };
  }
}

// =====================================================
// QUERY OPTIMIZATION SERVICE
// =====================================================

export class QueryOptimizationService {
  private cache: MultiLayerCache;
  private metricsLoader: EquipmentMetricsLoader;
  private alertLoader: AlertLoader;
  private sensorLoader: SensorDataLoader;

  constructor() {
    this.cache = new MultiLayerCache('queries', {
      ttl: 300, // 5 minutes
      maxSize: 500
    });
  }

  /**
   * Get OEE dashboard data with optimized queries
   */
  async getOEEDashboard(siteCode?: string): Promise<any> {
    const cacheKey = `oee:dashboard:${siteCode || 'all'}`;
    
    return this.cache.get(cacheKey, async () => {
      console.log('📊 Computing OEE dashboard data...');
      
      // Use continuous aggregates for performance
      const query = siteCode
        ? `SELECT * FROM production_daily WHERE site_code = $1 AND day >= CURRENT_DATE - INTERVAL '30 days'`
        : `SELECT * FROM production_daily WHERE day >= CURRENT_DATE - INTERVAL '30 days'`;
      
      const params = siteCode ? [siteCode] : [];
      
      const [dailyMetrics, currentAlerts, topPerformers] = await Promise.all([
        // Daily aggregated metrics
        prisma.$queryRawUnsafe<any[]>(query, ...params),
        
        // Current alerts
        prisma.$queryRaw<any[]>`
          SELECT 
            e.site_code,
            COUNT(*) FILTER (WHERE a.severity = 'high') as critical_alerts,
            COUNT(*) FILTER (WHERE a.severity = 'medium') as warning_alerts,
            COUNT(*) as total_alerts
          FROM alerts a
          JOIN equipment e ON a.equipment_id = e.id
          WHERE a.status = 'active'
            ${siteCode ? `AND e.site_code = $1` : ''}
          GROUP BY e.site_code
        `,
        
        // Top performers
        prisma.$queryRaw<any[]>`
          SELECT 
            equipment_id,
            equipment_code,
            equipment_name,
            AVG(oee) as avg_oee,
            COUNT(*) as data_points
          FROM production_metrics
          WHERE time >= NOW() - INTERVAL '24 hours'
            ${siteCode ? `AND site_code = $1` : ''}
          GROUP BY equipment_id, equipment_code, equipment_name
          HAVING COUNT(*) > 10
          ORDER BY avg_oee DESC
          LIMIT 5
        `
      ]);

      return {
        dailyMetrics,
        currentAlerts,
        topPerformers,
        timestamp: new Date()
      };
    }, { ttl: 60 }); // Cache for 1 minute
  }

  /**
   * Get equipment details with related data
   */
  async getEquipmentDetails(equipmentId: string, timeRange: { hours: number }): Promise<any> {
    // Initialize loaders for this request
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange.hours * 60 * 60 * 1000);
    
    this.metricsLoader = new EquipmentMetricsLoader({ start: startTime, end: endTime });
    this.alertLoader = new AlertLoader('active');
    this.sensorLoader = new SensorDataLoader();

    // Batch load all data
    const [metrics, alerts, temperature, pressure, vibration] = await Promise.all([
      this.metricsLoader.load(equipmentId),
      this.alertLoader.load(equipmentId),
      this.sensorLoader.load({ equipmentId, sensorId: 'TEMP-001', hours: timeRange.hours }),
      this.sensorLoader.load({ equipmentId, sensorId: 'PRES-001', hours: timeRange.hours }),
      this.sensorLoader.load({ equipmentId, sensorId: 'VIB-001', hours: timeRange.hours })
    ]);

    return {
      equipmentId,
      metrics,
      alerts,
      sensors: {
        temperature,
        pressure,
        vibration
      }
    };
  }

  /**
   * Get downtime analysis with root cause
   */
  async getDowntimeAnalysis(
    equipmentId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    const cacheKey = crypto.createHash('md5')
      .update(`downtime:${equipmentId}:${startDate.getTime()}:${endDate.getTime()}`)
      .digest('hex');

    return this.cache.get(cacheKey, async () => {
      const [downtimeEvents, impactAnalysis, patterns] = await Promise.all([
        // Downtime events with reasons
        prisma.$queryRaw<any[]>`
          SELECT 
            de.*,
            dr.description as reason_description,
            dr.category as reason_category
          FROM downtime_events de
          JOIN downtime_reason dr ON de.reason_code = dr.code
          WHERE de.equipment_id = ${equipmentId}
            AND de.time BETWEEN ${startDate} AND ${endDate}
          ORDER BY de.duration_seconds DESC
        `,
        
        // Impact analysis
        prisma.$queryRaw<any[]>`
          SELECT 
            reason_code,
            reason_category,
            COUNT(*) as occurrences,
            SUM(duration_seconds) as total_duration,
            AVG(duration_seconds) as avg_duration,
            SUM(duration_seconds) * 100.0 / 
              SUM(SUM(duration_seconds)) OVER () as percentage
          FROM downtime_events
          WHERE equipment_id = ${equipmentId}
            AND time BETWEEN ${startDate} AND ${endDate}
          GROUP BY reason_code, reason_category
          ORDER BY total_duration DESC
        `,
        
        // Time patterns
        prisma.$queryRaw<any[]>`
          SELECT 
            EXTRACT(hour FROM time) as hour_of_day,
            EXTRACT(dow FROM time) as day_of_week,
            COUNT(*) as event_count,
            AVG(duration_seconds) as avg_duration
          FROM downtime_events
          WHERE equipment_id = ${equipmentId}
            AND time BETWEEN ${startDate} AND ${endDate}
          GROUP BY hour_of_day, day_of_week
          ORDER BY event_count DESC
        `
      ]);

      // Calculate Pareto analysis
      let cumulativePercentage = 0;
      const paretoAnalysis = impactAnalysis.map(item => {
        cumulativePercentage += parseFloat(item.percentage);
        return {
          ...item,
          cumulative_percentage: cumulativePercentage
        };
      });

      return {
        summary: {
          totalEvents: downtimeEvents.length,
          totalDowntime: downtimeEvents.reduce((sum, e) => sum + e.duration_seconds, 0),
          mtbf: this.calculateMTBF(downtimeEvents),
          mttr: this.calculateMTTR(downtimeEvents)
        },
        events: downtimeEvents.slice(0, 20), // Top 20 longest
        impactAnalysis,
        paretoAnalysis,
        patterns
      };
    }, { ttl: 300 }); // Cache for 5 minutes
  }

  /**
   * Calculate Mean Time Between Failures
   */
  private calculateMTBF(events: any[]): number {
    if (events.length <= 1) return 0;
    
    const sortedEvents = events.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    let totalTimeBetween = 0;
    for (let i = 1; i < sortedEvents.length; i++) {
      const timeBetween = new Date(sortedEvents[i].time).getTime() - 
                         new Date(sortedEvents[i-1].time).getTime();
      totalTimeBetween += timeBetween / 1000; // Convert to seconds
    }
    
    return totalTimeBetween / (events.length - 1);
  }

  /**
   * Calculate Mean Time To Repair
   */
  private calculateMTTR(events: any[]): number {
    if (events.length === 0) return 0;
    
    const totalDuration = events.reduce((sum, e) => sum + e.duration_seconds, 0);
    return totalDuration / events.length;
  }

  /**
   * Prefetch and warm critical caches
   */
  async warmCaches(): Promise<void> {
    console.log('🔥 Starting cache warm-up...');
    
    // Warm OEE dashboard cache
    await this.cache.warmUp(async () => {
      const sites = await prisma.site.findMany({ select: { code: true } });
      const items = [];
      
      for (const site of sites) {
        const data = await this.getOEEDashboard(site.code);
        items.push({
          key: `oee:dashboard:${site.code}`,
          value: data,
          ttl: 300
        });
      }
      
      return items;
    });

    // Warm equipment status cache
    const activeEquipment = await prisma.equipment.findMany({
      where: { is_active: true },
      select: { id: true }
    });

    for (const equipment of activeEquipment.slice(0, 10)) { // Top 10 for warm-up
      await this.getEquipmentDetails(equipment.id, { hours: 1 });
    }
    
    console.log('✅ Cache warm-up complete');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// =====================================================
// DATABASE QUERY MONITORING
// =====================================================

export class QueryMonitor {
  private slowQueryThreshold = 100; // ms
  private queryStats = new Map<string, {
    count: number;
    totalTime: number;
    maxTime: number;
    lastExecution: Date;
  }>();

  /**
   * Monitor and log slow queries
   */
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      
      this.updateStats(queryName, duration);
      
      if (duration > this.slowQueryThreshold) {
        console.warn(`⚠️ Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.updateStats(queryName, duration);
      throw error;
    }
  }

  private updateStats(queryName: string, duration: number) {
    const stats = this.queryStats.get(queryName) || {
      count: 0,
      totalTime: 0,
      maxTime: 0,
      lastExecution: new Date()
    };
    
    stats.count++;
    stats.totalTime += duration;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastExecution = new Date();
    
    this.queryStats.set(queryName, stats);
  }

  /**
   * Get query performance report
   */
  getReport() {
    const report = [];
    
    for (const [query, stats] of this.queryStats.entries()) {
      report.push({
        query,
        ...stats,
        avgTime: Math.round(stats.totalTime / stats.count),
        isSlowQuery: stats.maxTime > this.slowQueryThreshold
      });
    }
    
    return report.sort((a, b) => b.avgTime - a.avgTime);
  }

  /**
   * Reset statistics
   */
  reset() {
    this.queryStats.clear();
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function demonstrateOptimizations() {
  console.log('🚀 Performance Optimization Demonstration\n');

  const queryService = new QueryOptimizationService();
  const queryMonitor = new QueryMonitor();

  // 1. Demonstrate cursor pagination
  console.log('📄 Testing cursor-based pagination...');
  const page1 = await queryMonitor.monitorQuery('pagination:page1', 
    () => CursorPagination.paginateProductionMetrics({ limit: 10 })
  );
  console.log(`  Page 1: ${page1.data.length} items, hasNext: ${page1.pageInfo.hasNextPage}`);

  if (page1.pageInfo.endCursor) {
    const page2 = await queryMonitor.monitorQuery('pagination:page2',
      () => CursorPagination.paginateProductionMetrics({ 
        limit: 10, 
        cursor: page1.pageInfo.endCursor 
      })
    );
    console.log(`  Page 2: ${page2.data.length} items, hasNext: ${page2.pageInfo.hasNextPage}`);
  }

  // 2. Demonstrate DataLoader batching
  console.log('\n🔄 Testing DataLoader batching...');
  const equipment = await prisma.equipment.findMany({ take: 5 });
  
  const equipmentDetails = await queryMonitor.monitorQuery('dataloader:batch',
    () => Promise.all(
      equipment.map(e => queryService.getEquipmentDetails(e.id, { hours: 1 }))
    )
  );
  console.log(`  Loaded details for ${equipmentDetails.length} equipment units`);

  // 3. Demonstrate cache effectiveness
  console.log('\n💾 Testing multi-layer cache...');
  
  // First call - cache miss
  const dashboard1 = await queryMonitor.monitorQuery('cache:miss',
    () => queryService.getOEEDashboard()
  );
  
  // Second call - cache hit
  const dashboard2 = await queryMonitor.monitorQuery('cache:hit',
    () => queryService.getOEEDashboard()
  );
  
  const cacheStats = queryService.getCacheStats();
  console.log(`  Cache stats:`, cacheStats);

  // 4. Show query performance report
  console.log('\n📊 Query Performance Report:');
  const report = queryMonitor.getReport();
  console.table(report);

  // 5. Demonstrate cache warming
  console.log('\n🔥 Testing cache warm-up...');
  await queryMonitor.monitorQuery('cache:warmup',
    () => queryService.warmCaches()
  );

  console.log('\n✅ Performance optimization demonstration complete!');
}

// Run if executed directly
if (require.main === module) {
  demonstrateOptimizations()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  EquipmentMetricsLoader,
  AlertLoader,
  SensorDataLoader,
  CursorPagination,
  MultiLayerCache,
  QueryOptimizationService,
  QueryMonitor
};