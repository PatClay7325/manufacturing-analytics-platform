import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DataSourceApi,
  DataSourcePlugin,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceTestResult,
  DataFrame,
  FieldType,
  LoadingState,
  MetricFindValue,
  AnnotationQueryRequest,
  AnnotationEvent,
  DataSourceJsonData,
  QueryEditorProps,
  DataSourceConfigEditorProps,
  VariableQueryEditorProps,
  VariableQuery,
  HealthCheckResult,
  DataSourceInstanceSettings,
  ScopedVars,
} from '../GrafanaDataSourcePlugin';

// TimescaleDB specific query structure
export interface TimescaleDBQuery extends DataQuery {
  rawSql?: string;
  format?: 'time_series' | 'table' | 'logs';
  fillMode?: { mode: string; value?: number };
  orderByTime?: 'ASC' | 'DESC';
  group?: { type: string; params: string[] }[];
  where?: { type: string; params: string[] }[];
  select?: Array<[{ type: string; params: string[] }, { type: string; params: string[] }]>;
  tags?: Array<{ key: string; value: string }>;
  groupBy?: Array<{ type: string; params: string[] }>;
  measurement?: string;
}

// TimescaleDB data source options
export interface TimescaleDBOptions extends DataSourceJsonData {
  database?: string;
  user?: string;
  postgresVersion?: number;
  timescaledbVersion?: string;
  maxOpenConns?: number;
  maxIdleConns?: number;
  connMaxLifetime?: number;
  sslmode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  tlsConfigurationMethod?: 'file-path' | 'file-content';
  sslRootCertFile?: string;
  sslCertFile?: string;
  sslKeyFile?: string;
  sslRootCert?: string;
  sslCert?: string;
  sslKey?: string;
  enableInterpolation?: boolean;
}

// TimescaleDB DataSource implementation
export class TimescaleDBDataSource extends DataSourceApi<TimescaleDBQuery, TimescaleDBOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<TimescaleDBOptions>) {
    super(instanceSettings);
  }

  query(request: DataQueryRequest<TimescaleDBQuery>): Observable<DataQueryResponse> {
    const promises = request.targets
      .filter(target => !target.hide)
      .map(target => this.runQuery(target, request));

    return from(Promise.all(promises)).pipe(
      map(data => {
        const frames = data.flat();
        return {
          data: frames,
          state: LoadingState.Done,
        };
      })
    );
  }

  private async runQuery(
    query: TimescaleDBQuery,
    request: DataQueryRequest<TimescaleDBQuery>
  ): Promise<DataFrame[]> {
    // Interpolate variables
    const interpolatedQuery = this.interpolateQuery(query, request.scopedVars);
    
    // Build SQL query
    const sql = this.buildQuery(interpolatedQuery, request);
    
    // Execute query via API
    const response = await fetch('/api/datasources/proxy/' + this.id + '/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [{
          datasourceId: this.id,
          format: query.format || 'time_series',
          rawSql: sql,
          refId: query.refId,
        }],
        from: request.range.from.valueOf().toString(),
        to: request.range.to.valueOf().toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return this.processQueryResult(result, query);
  }

  private buildQuery(query: TimescaleDBQuery, request: DataQueryRequest<TimescaleDBQuery>): string {
    if (query.rawSql) {
      return query.rawSql;
    }

    // Build query from visual query builder
    let sql = 'SELECT\n';
    
    // Time column
    sql += '  time_bucket($__interval, time) AS time,\n';
    
    // Metrics
    if (query.select) {
      const selects = query.select.map(([metric, agg]) => {
        const metricName = metric.params[0];
        const aggFunc = agg.type;
        return `  ${aggFunc}(${metricName}) AS "${metricName}_${aggFunc}"`;
      });
      sql += selects.join(',\n') + '\n';
    }
    
    sql += `FROM ${query.measurement || 'metrics'}\n`;
    
    // WHERE clause
    sql += 'WHERE\n';
    sql += '  time >= $__timeFrom AND time <= $__timeTo\n';
    
    if (query.where) {
      query.where.forEach(condition => {
        sql += `  AND ${condition.params.join(' ')}\n`;
      });
    }
    
    // GROUP BY
    sql += 'GROUP BY time';
    if (query.groupBy) {
      query.groupBy.forEach(group => {
        if (group.type === 'tag') {
          sql += `, ${group.params[0]}`;
        }
      });
    }
    sql += '\n';
    
    // ORDER BY
    sql += `ORDER BY time ${query.orderByTime || 'ASC'}`;
    
    return sql;
  }

  private processQueryResult(result: any, query: TimescaleDBQuery): DataFrame[] {
    if (!result.results || !result.results[query.refId]) {
      return [];
    }

    const queryResult = result.results[query.refId];
    
    if (query.format === 'table') {
      return this.processTableResult(queryResult);
    } else {
      return this.processTimeSeriesResult(queryResult);
    }
  }

  private processTimeSeriesResult(result: any): DataFrame[] {
    if (!result.series) {
      return [];
    }

    return result.series.map((series: any) => {
      const timeField = {
        name: 'Time',
        type: FieldType.time,
        config: {},
        values: [] as number[],
      };

      const valueField = {
        name: series.name || 'Value',
        type: FieldType.number,
        config: {},
        values: [] as number[],
        labels: series.tags || {},
      };

      series.points.forEach((point: [number, number]) => {
        valueField.values.push(point[0]);
        timeField.values.push(point[1]);
      });

      return {
        name: series.name,
        refId: series.refId,
        fields: [timeField, valueField],
        length: timeField.values.length,
      };
    });
  }

  private processTableResult(result: any): DataFrame[] {
    if (!result.tables || result.tables.length === 0) {
      return [];
    }

    const table = result.tables[0];
    const fields = table.columns.map((col: any) => ({
      name: col.text,
      type: this.getFieldType(col.type),
      config: {},
      values: [] as any[],
    }));

    table.rows.forEach((row: any[]) => {
      row.forEach((value, index) => {
        fields[index].values.push(value);
      });
    });

    return [{
      fields,
      length: table.rows.length,
    }];
  }

  private getFieldType(pgType: string): FieldType {
    switch (pgType) {
      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        return FieldType.time;
      case 'INT':
      case 'BIGINT':
      case 'FLOAT':
      case 'DOUBLE':
      case 'NUMERIC':
        return FieldType.number;
      case 'BOOLEAN':
        return FieldType.boolean;
      default:
        return FieldType.string;
    }
  }

  async testDatasource(): Promise<DataSourceTestResult> {
    try {
      const response = await fetch('/api/datasources/proxy/' + this.id + '/health', {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          status: 'error',
          message: `Connection failed: ${response.statusText}`,
        };
      }

      const result = await response.json();
      
      return {
        status: 'success',
        message: `Successfully connected to TimescaleDB ${result.version}`,
        details: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
    const interpolated = this.interpolateVariables(query, options?.scopedVars);
    
    const response = await fetch('/api/datasources/proxy/' + this.id + '/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [{
          datasourceId: this.id,
          format: 'table',
          rawSql: interpolated,
          refId: 'A',
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Metric query failed: ${response.statusText}`);
    }

    const result = await response.json();
    const table = result.results?.A?.tables?.[0];
    
    if (!table) {
      return [];
    }

    // Expect single column result
    return table.rows.map((row: any[]) => ({
      text: String(row[0]),
      value: row[0],
    }));
  }

  async getTagKeys(): Promise<MetricFindValue[]> {
    const query = `
      SELECT DISTINCT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND data_type IN ('text', 'varchar', 'char')
      ORDER BY column_name
    `;
    
    return this.metricFindQuery(query);
  }

  async getTagValues(options: any): Promise<MetricFindValue[]> {
    const key = options.key;
    const query = `SELECT DISTINCT ${key} FROM metrics WHERE ${key} IS NOT NULL ORDER BY ${key}`;
    
    return this.metricFindQuery(query);
  }

  async annotationQuery(options: AnnotationQueryRequest<TimescaleDBQuery>): Promise<AnnotationEvent[]> {
    const query = options.annotation.target;
    if (!query || !query.rawSql) {
      return [];
    }

    const response = await fetch('/api/datasources/proxy/' + this.id + '/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [{
          datasourceId: this.id,
          format: 'table',
          rawSql: query.rawSql,
          refId: 'Anno',
        }],
        from: options.range.from.valueOf().toString(),
        to: options.range.to.valueOf().toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Annotation query failed: ${response.statusText}`);
    }

    const result = await response.json();
    const table = result.results?.Anno?.tables?.[0];
    
    if (!table) {
      return [];
    }

    // Map table rows to annotation events
    return table.rows.map((row: any[]) => ({
      time: new Date(row[0]).getTime(),
      timeEnd: row[1] ? new Date(row[1]).getTime() : undefined,
      title: String(row[2] || ''),
      text: String(row[3] || ''),
      tags: row[4] ? String(row[4]).split(',') : [],
    }));
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const testResult = await this.testDatasource();
    
    return {
      status: testResult.status === 'success' ? 'ok' : 'error',
      message: testResult.message,
      details: testResult.details,
    };
  }

  interpolateVariablesInQueries(queries: TimescaleDBQuery[], scopedVars: ScopedVars): TimescaleDBQuery[] {
    return queries.map(query => this.interpolateQuery(query, scopedVars));
  }

  private interpolateQuery(query: TimescaleDBQuery, scopedVars: ScopedVars): TimescaleDBQuery {
    if (!query.rawSql) {
      return query;
    }

    return {
      ...query,
      rawSql: this.interpolateVariables(query.rawSql, scopedVars),
    };
  }

  private interpolateVariables(text: string, scopedVars?: ScopedVars): string {
    if (!scopedVars) {
      return text;
    }

    return text.replace(/\$(\w+)/g, (match, varName) => {
      const variable = scopedVars[varName];
      if (variable) {
        return Array.isArray(variable.value) 
          ? variable.value.join(',')
          : String(variable.value);
      }
      return match;
    });
  }
}

// Query Editor Component
export const TimescaleDBQueryEditor: React.FC<QueryEditorProps<TimescaleDBQuery, TimescaleDBOptions>> = ({
  query,
  onChange,
  onRunQuery,
  datasource,
}) => {
  // Implementation would go here
  return null;
};

// Config Editor Component
export const TimescaleDBConfigEditor: React.FC<DataSourceConfigEditorProps<TimescaleDBOptions>> = ({
  options,
  onOptionsChange,
}) => {
  // Implementation would go here
  return null;
};

// Variable Query Editor Component
export const TimescaleDBVariableQueryEditor: React.FC<VariableQueryEditorProps<TimescaleDBQuery, TimescaleDBOptions>> = ({
  datasource,
  query,
  onChange,
}) => {
  // Implementation would go here
  return null;
};

// TimescaleDB Plugin Definition
export const timescaleDBPlugin: DataSourcePlugin<TimescaleDBQuery, TimescaleDBOptions> = {
  id: 'timescaledb',
  name: 'TimescaleDB',
  type: 'timescaledb',
  module: 'core:datasource/timescaledb',
  info: {
    id: 'timescaledb',
    type: 'datasource',
    name: 'TimescaleDB',
    info: {
      author: {
        name: 'Manufacturing Analytics Platform',
        url: 'https://github.com/manufacturing-analytics',
      },
      description: 'Native TimescaleDB data source with manufacturing-specific features',
      links: [
        {
          name: 'Documentation',
          url: 'https://docs.timescale.com',
        },
      ],
      logos: {
        small: 'public/plugins/timescaledb/img/timescaledb_logo.svg',
        large: 'public/plugins/timescaledb/img/timescaledb_logo.svg',
      },
      build: {},
      screenshots: [],
      version: '1.0.0',
      updated: '2024-01-01',
      keywords: ['timescaledb', 'postgresql', 'timeseries', 'manufacturing'],
    },
    dependencies: {
      grafanaVersion: '9.0.0',
      plugins: [],
    },
    baseUrl: 'public/plugins/timescaledb',
    annotations: true,
    metrics: true,
    alerting: true,
    explore: true,
    logs: false,
    tracing: false,
    streaming: true,
    backend: true,
    category: 'sql',
    signature: 'internal',
  },
  components: {
    QueryEditor: TimescaleDBQueryEditor,
    ConfigEditor: TimescaleDBConfigEditor,
    VariableQueryEditor: TimescaleDBVariableQueryEditor,
  },
  DataSource: TimescaleDBDataSource,
};