/**
 * TimescaleDB Data Source Plugin
 * Optimized for manufacturing time-series data via Prisma
 */

import { DataSourcePlugin, QueryOptions, QueryResult, MetricFindValue, VariableQueryOptions, DataSourceInstanceSettings } from '../DataSourcePlugin';
import { PrismaClient } from '@prisma/client';

export class TimescaleDataSource extends DataSourcePlugin {
  private prisma: PrismaClient;

  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.prisma = new PrismaClient();
  }

  async query(options: QueryOptions): Promise<QueryResult> {
    try {
      const { targets, timeRange, maxDataPoints = 100 } = options;
      const results = [];

      for (const target of targets) {
        const result = await this.executeQuery(target, timeRange, maxDataPoints);
        results.push(result);
      }

      return {
        state: 'success',
        data: results
      };
    } catch (error) {
      console.error('TimescaleDB query error:', error);
      return {
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeQuery(target: any, timeRange: any, maxDataPoints: number) {
    const { queryType, metric, workUnitId, aggregation = 'avg' } = target;
    
    // Calculate time range
    const now = new Date();
    const from = this.parseTimeRange(timeRange.from, now);
    const to = this.parseTimeRange(timeRange.to, now);
    
    // Calculate interval for time bucketing
    const intervalMs = (to.getTime() - from.getTime()) / maxDataPoints;
    const interval = this.formatInterval(intervalMs);

    switch (queryType) {
      case 'equipment_metrics':
        return this.queryEquipmentMetrics(metric, workUnitId, from, to, interval, aggregation);
      
      case 'oee_metrics':
        return this.queryOEEMetrics(workUnitId, from, to, interval);
      
      case 'quality_metrics':
        return this.queryQualityMetrics(workUnitId, from, to, interval);
      
      case 'alert_counts':
        return this.queryAlertCounts(workUnitId, from, to, interval);
      
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  private async queryEquipmentMetrics(metric: string, workUnitId: string, from: Date, to: Date, interval: string, aggregation: string) {
    // Use raw SQL for TimescaleDB time_bucket function
    const query = `
      SELECT 
        time_bucket($1::interval, timestamp) as time,
        ${aggregation}(value) as value
      FROM "Metric"
      WHERE name = $2
        AND "workUnitId" = $3
        AND timestamp >= $4
        AND timestamp <= $5
        AND "isValid" = true
      GROUP BY time
      ORDER BY time;
    `;

    const result = await this.prisma.$queryRaw`
      SELECT 
        time_bucket(${interval}::interval, timestamp) as time,
        avg(value) as value
      FROM "Metric"
      WHERE name = ${metric}
        AND "workUnitId" = ${workUnitId}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
        AND "isValid" = true
      GROUP BY time
      ORDER BY time;
    ` as Array<{ time: Date; value: number }>;

    return {
      target: `${metric} (${workUnitId})`,
      datapoints: result.map(row => [parseFloat(row.value.toString()), row.time.getTime()])
    };
  }

  private async queryOEEMetrics(workUnitId: string, from: Date, to: Date, interval: string) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        time_bucket(${interval}::interval, timestamp) as time,
        avg("oeeScore") as oee_score,
        avg(availability) as availability,
        avg(performance) as performance,
        avg(quality) as quality
      FROM "PerformanceMetric"
      WHERE "workUnitId" = ${workUnitId}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
        AND "oeeScore" IS NOT NULL
      GROUP BY time
      ORDER BY time;
    ` as Array<{ 
      time: Date; 
      oee_score: number; 
      availability: number; 
      performance: number; 
      quality: number; 
    }>;

    return {
      target: `OEE Score (${workUnitId})`,
      datapoints: result.map(row => [parseFloat(row.oee_score.toString()), row.time.getTime()])
    };
  }

  private async queryQualityMetrics(workUnitId: string, from: Date, to: Date, interval: string) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        time_bucket(${interval}::interval, timestamp) as time,
        avg(value) as avg_value,
        count(*) filter (where "isWithinSpec" = true) * 100.0 / count(*) as spec_compliance
      FROM "QualityMetric"
      WHERE "workUnitId" = ${workUnitId}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
      GROUP BY time
      ORDER BY time;
    ` as Array<{ 
      time: Date; 
      avg_value: number; 
      spec_compliance: number;
    }>;

    return {
      target: `Quality Compliance (${workUnitId})`,
      datapoints: result.map(row => [parseFloat(row.spec_compliance.toString()), row.time.getTime()])
    };
  }

  private async queryAlertCounts(workUnitId: string, from: Date, to: Date, interval: string) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        time_bucket(${interval}::interval, timestamp) as time,
        count(*) as alert_count,
        count(*) filter (where severity = 'critical') as critical_count
      FROM "Alert"
      WHERE "workUnitId" = ${workUnitId}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
      GROUP BY time
      ORDER BY time;
    ` as Array<{ 
      time: Date; 
      alert_count: number; 
      critical_count: number;
    }>;

    return {
      target: `Alert Count (${workUnitId})`,
      datapoints: result.map(row => [parseInt(row.alert_count.toString()), row.time.getTime()])
    };
  }

  async testDatasource(): Promise<{ status: string; message: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'success',
        message: 'TimescaleDB connection successful'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async metricFindQuery(query: string, options?: VariableQueryOptions): Promise<MetricFindValue[]> {
    try {
      if (query === 'work_units') {
        const workUnits = await this.prisma.workUnit.findMany({
          select: { id: true, name: true, code: true }
        });
        return workUnits.map(wu => ({
          text: `${wu.name} (${wu.code})`,
          value: wu.id
        }));
      }

      if (query === 'metric_names') {
        const metrics = await this.prisma.metric.findMany({
          select: { name: true },
          distinct: ['name']
        });
        return metrics.map(m => ({
          text: m.name,
          value: m.name
        }));
      }

      if (query.startsWith('metrics_for_unit:')) {
        const workUnitId = query.split(':')[1];
        const metrics = await this.prisma.metric.findMany({
          where: { workUnitId },
          select: { name: true },
          distinct: ['name']
        });
        return metrics.map(m => ({
          text: m.name,
          value: m.name
        }));
      }

      return [];
    } catch (error) {
      console.error('Metric find query error:', error);
      return [];
    }
  }

  private parseTimeRange(timeStr: string, now: Date): Date {
    if (timeStr === 'now') return now;
    
    const match = timeStr.match(/^now-(\d+)([smhd])$/);
    if (!match) return now;
    
    const [, amount, unit] = match;
    const ms = parseInt(amount) * this.getUnitMs(unit);
    return new Date(now.getTime() - ms);
  }

  private getUnitMs(unit: string): number {
    switch (unit) {
      case 's': return 1000;
      case 'm': return 60 * 1000;
      case 'h': return 60 * 60 * 1000;
      case 'd': return 24 * 60 * 60 * 1000;
      default: return 1000;
    }
  }

  private formatInterval(intervalMs: number): string {
    if (intervalMs < 60000) return '1 minute';
    if (intervalMs < 3600000) return `${Math.floor(intervalMs / 60000)} minutes`;
    if (intervalMs < 86400000) return `${Math.floor(intervalMs / 3600000)} hours`;
    return `${Math.floor(intervalMs / 86400000)} days`;
  }
}