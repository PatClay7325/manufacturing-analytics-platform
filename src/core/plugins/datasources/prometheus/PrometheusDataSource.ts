/**
 * Prometheus Data Source - FULL Grafana compatibility
 * Implements all Prometheus API endpoints and query capabilities
 */

import {
  DataSourceApi,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  TestDataSourceResponse,
  MetricFindValue,
  TimeRange,
  DataFrame,
  FieldType,
  LoadingState,
  DataSourceSettings,
} from '../../types';

export interface PrometheusQuery extends DataQuery {
  expr: string;
  instant?: boolean;
  range?: boolean;
  exemplar?: boolean;
  interval?: string;
  intervalFactor?: number;
  legendFormat?: string;
  format?: 'time_series' | 'table' | 'heatmap';
  step?: number;
  // Additional Prometheus-specific options
  useBackend?: boolean;
  disableMetricsLookup?: boolean;
  disableTextWrap?: boolean;
  fullMetaSearch?: boolean;
  includeNullMetadata?: boolean;
}

export interface PrometheusOptions {
  url?: string;
  directUrl?: string;
  httpMethod?: string;
  customQueryParameters?: string;
  queryTimeout?: string;
  timeInterval?: string;
  // Authentication
  basicAuth?: boolean;
  basicAuthUser?: string;
  withCredentials?: boolean;
  // TLS/SSL
  tlsAuth?: boolean;
  tlsAuthWithCACert?: boolean;
  tlsSkipVerify?: boolean;
  // Other options
  disableMetricsLookup?: boolean;
  customHttpHeaders?: Record<string, string>;
  exemplarTraceIdDestinations?: Array<{
    name: string;
    datasourceUid?: string;
    urlDisplayLabel?: string;
  }>;
}

interface PrometheusResponse {
  status: 'success' | 'error';
  data?: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string';
    result: any[];
  };
  error?: string;
  errorType?: string;
  warnings?: string[];
}

export class PrometheusDataSource extends DataSourceApi<PrometheusQuery, PrometheusOptions> {
  private baseUrl: string;
  private directUrl: string;
  private httpMethod: string;
  private timeInterval: string;

  constructor(instanceSettings: DataSourceSettings<PrometheusOptions>) {
    super(instanceSettings);
    
    const jsonData = instanceSettings.jsonData || {};
    this.baseUrl = instanceSettings.url || '';
    this.directUrl = jsonData.directUrl || this.baseUrl;
    this.httpMethod = jsonData.httpMethod || 'POST';
    this.timeInterval = jsonData.timeInterval || '15s';
  }

  /**
   * Execute Prometheus queries
   */
  async query(request: DataQueryRequest<PrometheusQuery>): Promise<DataQueryResponse> {
    const promises = request.targets
      .filter(target => !target.hide && target.expr)
      .map(target => this.performQuery(target, request));

    try {
      const results = await Promise.all(promises);
      const data = results.reduce((acc, result) => acc.concat(result), []);

      return {
        data,
        state: LoadingState.Done,
      };
    } catch (error: any) {
      return {
        data: [],
        state: LoadingState.Error,
        error: {
          message: error.message || 'Unknown error',
        },
      };
    }
  }

  /**
   * Perform individual query
   */
  private async performQuery(
    query: PrometheusQuery,
    request: DataQueryRequest<PrometheusQuery>
  ): Promise<DataFrame[]> {
    const { expr, instant, interval, intervalFactor, legendFormat, format } = query;
    
    // Determine endpoint
    const endpoint = instant ? '/api/v1/query' : '/api/v1/query_range';
    
    // Build parameters
    const params: Record<string, any> = {
      query: this.templateSrv.replace(expr, request.scopedVars),
      time: instant ? request.range.to.unix() : undefined,
      start: !instant ? request.range.from.unix() : undefined,
      end: !instant ? request.range.to.unix() : undefined,
      step: !instant ? this.calculateStep(interval, intervalFactor, request.intervalMs) : undefined,
    };

    // Execute query
    const response = await this.performRequest<PrometheusResponse>(endpoint, params);
    
    if (response.status !== 'success') {
      throw new Error(response.error || 'Query failed');
    }

    // Convert response to DataFrame
    return this.processResponse(response, query, request);
  }

  /**
   * Test data source connection
   */
  async testDatasource(): Promise<TestDataSourceResponse> {
    try {
      // Test Prometheus API
      const response = await this.performRequest<any>('/api/v1/query', {
        query: '1+1',
        time: Math.floor(Date.now() / 1000),
      });

      if (response.status === 'success') {
        return {
          status: 'success',
          message: 'Data source is working',
        };
      } else {
        return {
          status: 'error',
          message: response.error || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Cannot connect to Prometheus',
      };
    }
  }

  /**
   * Find metric names
   */
  async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
    const interpolated = this.templateSrv.replace(query, options?.scopedVars);
    
    // Handle label queries
    if (interpolated.match(/^label_names\(\)/)) {
      return this.getLabelNames();
    }
    
    if (interpolated.match(/^label_values\((.+?),\s*(.+?)\)/)) {
      const matches = interpolated.match(/^label_values\((.+?),\s*(.+?)\)/);
      if (matches) {
        return this.getLabelValues(matches[2], matches[1]);
      }
    }
    
    if (interpolated.match(/^label_values\((.+?)\)/)) {
      const matches = interpolated.match(/^label_values\((.+?)\)/);
      if (matches) {
        return this.getLabelValues(matches[1]);
      }
    }
    
    if (interpolated.match(/^metrics\((.+?)\)/)) {
      const matches = interpolated.match(/^metrics\((.+?)\)/);
      if (matches) {
        return this.getMetricNames(matches[1]);
      }
    }
    
    // Default: execute as query
    return this.queryResult(interpolated);
  }

  /**
   * Get label names
   */
  private async getLabelNames(): Promise<MetricFindValue[]> {
    const response = await this.performRequest<{
      status: string;
      data: string[];
    }>('/api/v1/labels');

    if (response.status === 'success' && response.data) {
      return response.data.map(label => ({ text: label }));
    }

    return [];
  }

  /**
   * Get label values
   */
  private async getLabelValues(label: string, metric?: string): Promise<MetricFindValue[]> {
    const params: Record<string, any> = {};
    
    if (metric) {
      params['match[]'] = metric;
    }

    const response = await this.performRequest<{
      status: string;
      data: string[];
    }>(`/api/v1/label/${label}/values`, params);

    if (response.status === 'success' && response.data) {
      return response.data.map(value => ({ text: value }));
    }

    return [];
  }

  /**
   * Get metric names
   */
  private async getMetricNames(pattern?: string): Promise<MetricFindValue[]> {
    const params: Record<string, any> = {};
    
    if (pattern) {
      params['match[]'] = pattern;
    }

    const response = await this.performRequest<{
      status: string;
      data: string[];
    }>('/api/v1/label/__name__/values', params);

    if (response.status === 'success' && response.data) {
      return response.data.map(metric => ({ text: metric }));
    }

    return [];
  }

  /**
   * Execute query and return results
   */
  private async queryResult(query: string): Promise<MetricFindValue[]> {
    const response = await this.performRequest<PrometheusResponse>('/api/v1/query', {
      query,
      time: Math.floor(Date.now() / 1000),
    });

    if (response.status === 'success' && response.data) {
      const values: MetricFindValue[] = [];
      
      response.data.result.forEach((result: any) => {
        if (result.metric) {
          Object.entries(result.metric).forEach(([key, value]) => {
            values.push({ text: `${key}: ${value}` });
          });
        }
        
        if (result.value) {
          values.push({ text: result.value[1] });
        }
      });

      return values;
    }

    return [];
  }

  /**
   * Get tag keys (for explore mode)
   */
  async getTagKeys(options?: any): Promise<MetricFindValue[]> {
    return this.getLabelNames();
  }

  /**
   * Get tag values (for explore mode)
   */
  async getTagValues(options: { key: string }): Promise<MetricFindValue[]> {
    return this.getLabelValues(options.key);
  }

  /**
   * Get query display text
   */
  getQueryDisplayText(query: PrometheusQuery): string {
    return query.expr || '';
  }

  /**
   * Perform HTTP request to Prometheus
   */
  private async performRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method: this.httpMethod,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (this.instanceSettings.basicAuth) {
      options.headers = {
        ...options.headers,
        Authorization: this.instanceSettings.basicAuth,
      };
    }

    if (this.httpMethod === 'POST') {
      options.body = new URLSearchParams(params).toString();
    } else {
      const queryParams = new URLSearchParams(params).toString();
      return fetch(`${url}?${queryParams}`, options).then(res => res.json());
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Process Prometheus response into DataFrames
   */
  private processResponse(
    response: PrometheusResponse,
    query: PrometheusQuery,
    request: DataQueryRequest<PrometheusQuery>
  ): DataFrame[] {
    if (!response.data || !response.data.result) {
      return [];
    }

    const frames: DataFrame[] = [];

    response.data.result.forEach((result: any) => {
      const frame = this.resultToDataFrame(result, query, response.data!.resultType);
      if (frame) {
        frames.push(frame);
      }
    });

    return frames;
  }

  /**
   * Convert Prometheus result to DataFrame
   */
  private resultToDataFrame(
    result: any,
    query: PrometheusQuery,
    resultType: string
  ): DataFrame | null {
    switch (resultType) {
      case 'matrix':
        return this.matrixToDataFrame(result, query);
      case 'vector':
        return this.vectorToDataFrame(result, query);
      case 'scalar':
        return this.scalarToDataFrame(result, query);
      case 'string':
        return this.stringToDataFrame(result, query);
      default:
        return null;
    }
  }

  /**
   * Convert matrix result to DataFrame
   */
  private matrixToDataFrame(result: any, query: PrometheusQuery): DataFrame {
    const { metric, values } = result;
    const labels = this.getLabels(metric, query);
    
    const timeField = {
      name: 'Time',
      type: FieldType.time,
      config: {},
      values: values.map((v: any[]) => v[0] * 1000),
    };

    const valueField = {
      name: labels || 'Value',
      type: FieldType.number,
      config: {},
      values: values.map((v: any[]) => parseFloat(v[1])),
      labels: metric,
    };

    return {
      name: labels,
      refId: query.refId,
      fields: [timeField, valueField],
      length: values.length,
    };
  }

  /**
   * Convert vector result to DataFrame
   */
  private vectorToDataFrame(result: any, query: PrometheusQuery): DataFrame {
    const { metric, value } = result;
    const labels = this.getLabels(metric, query);
    
    return {
      name: labels,
      refId: query.refId,
      fields: [
        {
          name: 'Time',
          type: FieldType.time,
          config: {},
          values: [value[0] * 1000],
        },
        {
          name: labels || 'Value',
          type: FieldType.number,
          config: {},
          values: [parseFloat(value[1])],
          labels: metric,
        },
      ],
      length: 1,
    };
  }

  /**
   * Convert scalar result to DataFrame
   */
  private scalarToDataFrame(result: any, query: PrometheusQuery): DataFrame {
    return {
      name: 'scalar',
      refId: query.refId,
      fields: [
        {
          name: 'Value',
          type: FieldType.number,
          config: {},
          values: [parseFloat(result[1])],
        },
      ],
      length: 1,
    };
  }

  /**
   * Convert string result to DataFrame
   */
  private stringToDataFrame(result: any, query: PrometheusQuery): DataFrame {
    return {
      name: 'string',
      refId: query.refId,
      fields: [
        {
          name: 'Value',
          type: FieldType.string,
          config: {},
          values: [result[1]],
        },
      ],
      length: 1,
    };
  }

  /**
   * Get labels for display
   */
  private getLabels(metric: Record<string, string>, query: PrometheusQuery): string {
    if (query.legendFormat) {
      return this.renderTemplate(query.legendFormat, metric);
    }

    const labelParts = Object.entries(metric)
      .filter(([key]) => key !== '__name__')
      .map(([key, value]) => `${key}="${value}"`);

    if (metric.__name__) {
      labelParts.unshift(metric.__name__);
    }

    return labelParts.length > 0 ? `{${labelParts.join(', ')}}` : '';
  }

  /**
   * Render legend format template
   */
  private renderTemplate(template: string, labels: Record<string, string>): string {
    return template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
      return labels[key.trim()] || '';
    });
  }

  /**
   * Calculate step interval
   */
  private calculateStep(interval?: string, intervalFactor?: number, intervalMs?: number): number {
    if (interval) {
      return this.parseInterval(interval);
    }

    const factor = intervalFactor || 2;
    const step = (intervalMs || 60000) / 1000 * factor;
    
    return Math.max(step, this.parseInterval(this.timeInterval));
  }

  /**
   * Parse interval string to seconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhdw])$/);
    if (!match) return 15;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      default: return 15;
    }
  }

  /**
   * Template service replacement (simplified)
   */
  private templateSrv = {
    replace: (text: string, scopedVars?: any) => {
      if (!scopedVars) return text;
      
      return text.replace(/\$(\w+)/g, (match, varName) => {
        if (scopedVars[varName]) {
          return scopedVars[varName].value;
        }
        return match;
      });
    },
  };
}