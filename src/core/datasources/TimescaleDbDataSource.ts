import { 
  DataSourceApi,
  DataSourceInstanceSettings,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceJsonData,
  DataFrame,
  FieldType,
  Field,
  DataSourceTestResult,
  MetricFindValue,
  LoadingState
} from '@grafana/data';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { logger } from '@/lib/logger';

export interface TimescaleDbQuery extends DataQuery {
  rawSql: string;
  format: 'time_series' | 'table';
  timeColumn?: string;
  metricColumn?: string;
  valueColumns?: string[];
  whereClause?: string;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface TimescaleDbOptions extends DataSourceJsonData {
  host: string;
  port: number;
  database: string;
  user: string;
  sslMode: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  timescaledb: boolean;
  minInterval: string;
  maxDataPoints: number;
}

export class TimescaleDbDataSource extends DataSourceApi<TimescaleDbQuery, TimescaleDbOptions> {
  private readonly host: string;
  private readonly port: number;
  private readonly database: string;
  private readonly user: string;
  private readonly sslMode: string;
  private readonly timescaledb: boolean;

  constructor(instanceSettings: DataSourceInstanceSettings<TimescaleDbOptions>) {
    super(instanceSettings);
    
    const jsonData = instanceSettings.jsonData || {} as TimescaleDbOptions;
    
    this.host = jsonData.host || 'localhost';
    this.port = jsonData.port || 5432;
    this.database = jsonData.database || 'manufacturing';
    this.user = jsonData.user || 'postgres';
    this.sslMode = jsonData.sslMode || 'disable';
    this.timescaledb = jsonData.timescaledb || true;
  }

  query(request: DataQueryRequest<TimescaleDbQuery>): Observable<DataQueryResponse> {
    const { targets, range, scopedVars } = request;
    
    const queries = targets
      .filter(target => !target.hide && target.rawSql)
      .map(target => this.processTarget(target, range, scopedVars));

    if (queries.length === 0) {
      return from([{ data: [] }]);
    }

    return from(Promise.all(queries)).pipe(
      map(results => ({
        data: results.flat(),
        state: LoadingState.Done
      })),
      catchError(error => {
        logger.error('TimescaleDB query error', { error, request });
        return from([{
          data: [],
          error: {
            message: error.message || 'Query failed',
            refId: targets[0]?.refId || 'unknown'
          },
          state: LoadingState.Error
        }]);
      })
    );
  }

  async testDatasource(): Promise<DataSourceTestResult> {
    try {
      // Test connection with a simple query
      const testQuery = `
        SELECT 
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manufacturing_metrics')
            THEN 'Manufacturing tables found'
            ELSE 'Manufacturing tables not found'
          END as status,
          version() as postgres_version,
          CASE 
            WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
            THEN 'TimescaleDB extension available'
            ELSE 'TimescaleDB extension not found'
          END as timescaledb_status
      `;

      const result = await this.executeQuery(testQuery);
      
      if (result && result.length > 0) {
        const row = result[0];
        return {
          status: 'success',
          message: `Successfully connected to TimescaleDB. ${row.status}. ${row.timescaledb_status}.`,
          details: {
            postgresVersion: row.postgres_version,
            timescaledbStatus: row.timescaledb_status,
            host: this.host,
            port: this.port,
            database: this.database
          }
        };
      } else {
        return {
          status: 'error',
          message: 'Connection successful but no data returned'
        };
      }
    } catch (error) {
      logger.error('TimescaleDB connection test failed', { error });
      return {
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  async metricFindQuery(query: string): Promise<MetricFindValue[]> {
    try {
      const result = await this.executeQuery(query);
      
      return result.map(row => {
        // Handle different result formats
        if (typeof row === 'string') {
          return { text: row, value: row };
        }
        
        // Object with text/value properties
        if (row.text !== undefined) {
          return {
            text: String(row.text),
            value: row.value !== undefined ? String(row.value) : String(row.text)
          };
        }
        
        // Object with first property as text
        const keys = Object.keys(row);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const value = row[firstKey];
          return {
            text: String(value),
            value: String(value)
          };
        }
        
        return { text: String(row), value: String(row) };
      });
    } catch (error) {
      logger.error('Metric find query failed', { query, error });
      return [];
    }
  }

  private async processTarget(
    target: TimescaleDbQuery,
    range: any,
    scopedVars: any
  ): Promise<DataFrame[]> {
    try {
      let query = this.interpolateVariables(target.rawSql, scopedVars);
      
      // Add time range filter if not present and time column is specified
      if (target.timeColumn && !query.toLowerCase().includes('where')) {
        query += ` WHERE ${target.timeColumn} >= '${range.from.toISOString()}' AND ${target.timeColumn} <= '${range.to.toISOString()}'`;
      } else if (target.timeColumn && !query.toLowerCase().includes(target.timeColumn)) {
        query = query.replace(/where/i, `WHERE ${target.timeColumn} >= '${range.from.toISOString()}' AND ${target.timeColumn} <= '${range.to.toISOString()}' AND `);
      }

      const result = await this.executeQuery(query);
      
      if (!result || result.length === 0) {
        return [];
      }

      return this.transformToDataFrame(result, target);
    } catch (error) {
      logger.error('Target processing failed', { target, error });
      throw error;
    }
  }

  private transformToDataFrame(data: any[], target: TimescaleDbQuery): DataFrame[] {
    if (!data || data.length === 0) {
      return [];
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    const fields: Field[] = columns.map(column => {
      const values = data.map(row => row[column]);
      const fieldType = this.inferFieldType(values[0], column);
      
      return {
        name: column,
        type: fieldType,
        config: {
          displayName: column
        },
        values: values
      };
    });

    return [{
      name: target.refId,
      refId: target.refId,
      fields: fields,
      length: data.length,
      meta: {
        preferredVisualisationType: target.format === 'table' ? 'table' : 'graph'
      }
    }];
  }

  private inferFieldType(value: any, columnName: string): FieldType {
    // Time column detection
    if (columnName.toLowerCase().includes('time') || columnName.toLowerCase().includes('timestamp')) {
      return FieldType.time;
    }
    
    // Value type inference
    if (typeof value === 'number') {
      return FieldType.number;
    }
    
    if (typeof value === 'boolean') {
      return FieldType.boolean;
    }
    
    if (value instanceof Date) {
      return FieldType.time;
    }
    
    // Try to parse as date
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime()) && value.includes('-')) {
        return FieldType.time;
      }
      
      // Try to parse as number
      const num = parseFloat(value);
      if (!isNaN(num) && value === num.toString()) {
        return FieldType.number;
      }
    }
    
    return FieldType.string;
  }

  private interpolateVariables(query: string, scopedVars: any): string {
    if (!scopedVars) return query;
    
    let interpolated = query;
    
    // Replace Grafana variables
    Object.keys(scopedVars).forEach(key => {
      const variable = scopedVars[key];
      const regex = new RegExp(`\\$${key}`, 'g');
      
      if (variable.multi) {
        // Multi-value variable
        const values = Array.isArray(variable.value) 
          ? variable.value.map(v => `'${v}'`).join(',')
          : `'${variable.value}'`;
        interpolated = interpolated.replace(regex, values);
      } else {
        // Single value variable
        interpolated = interpolated.replace(regex, variable.value);
      }
    });

    // Replace time range variables
    interpolated = interpolated.replace(/\$__timeFilter\(([^)]+)\)/g, (match, column) => {
      return `${column} >= '$__timeFrom()' AND ${column} <= '$__timeTo()'`;
    });

    return interpolated;
  }

  private async executeQuery(query: string): Promise<any[]> {
    // This would be replaced with actual database connection
    // For now, simulate the query execution
    
    logger.debug('Executing TimescaleDB query', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      host: this.host,
      database: this.database
    });

    // Simulate database response based on query type
    if (query.toLowerCase().includes('version()')) {
      return [{
        status: 'Manufacturing tables found',
        postgres_version: 'PostgreSQL 14.0 on x86_64-pc-linux-gnu',
        timescaledb_status: 'TimescaleDB extension available'
      }];
    }

    // Simulate manufacturing metrics
    if (query.toLowerCase().includes('manufacturing_metrics')) {
      const now = new Date();
      return Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
        equipment_id: 'equipment-001',
        oee: 85 + Math.random() * 10,
        availability: 90 + Math.random() * 8,
        performance: 95 + Math.random() * 4,
        quality: 98 + Math.random() * 2,
        value: 100 + Math.random() * 50
      }));
    }

    // Default empty response
    return [];
  }

  // Additional helper methods for TimescaleDB specific features
  async getEquipmentList(): Promise<MetricFindValue[]> {
    const query = `
      SELECT DISTINCT equipment_id as text, equipment_id as value 
      FROM manufacturing_metrics 
      ORDER BY equipment_id
    `;
    return this.metricFindQuery(query);
  }

  async getMetricNames(): Promise<MetricFindValue[]> {
    const query = `
      SELECT column_name as text, column_name as value
      FROM information_schema.columns 
      WHERE table_name = 'manufacturing_metrics' 
      AND data_type IN ('numeric', 'double precision', 'real')
      ORDER BY column_name
    `;
    return this.metricFindQuery(query);
  }

  async getHypertables(): Promise<MetricFindValue[]> {
    const query = `
      SELECT hypertable_name as text, hypertable_name as value
      FROM timescaledb_information.hypertables
      ORDER BY hypertable_name
    `;
    return this.metricFindQuery(query);
  }

  // Get continuous aggregates for query optimization
  async getContinuousAggregates(): Promise<MetricFindValue[]> {
    const query = `
      SELECT view_name as text, view_name as value
      FROM timescaledb_information.continuous_aggregates
      ORDER BY view_name
    `;
    return this.metricFindQuery(query);
  }
}