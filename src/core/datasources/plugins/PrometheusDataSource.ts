import { 
  DataSourcePlugin, 
  QueryOptions, 
  QueryResult, 
  TestResult, 
  MetricFindValue,
  VariableQueryOptions,
  DataSourceInstanceSettings,
  TimeSeriesData
} from '../DataSourcePlugin';
import { DataQuery } from '@/types/dashboard';

interface PrometheusQuery extends DataQuery {
  expr: string;
  instant?: boolean;
  range?: boolean;
  exemplar?: boolean;
  interval?: string;
  intervalFactor?: number;
  step?: number;
  legendFormat?: string;
}

interface PrometheusResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string';
    result: Array<{
      metric: Record<string, string>;
      values?: Array<[number, string]>; // matrix
      value?: [number, string]; // vector/scalar
    }>;
  };
  error?: string;
  errorType?: string;
}

/**
 * Prometheus data source implementation
 */
export class PrometheusDataSource extends DataSourcePlugin {
  private baseURL: string;
  private headers: Record<string, string> = {};

  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseURL = instanceSettings.url;
    
    if (instanceSettings.basicAuth && instanceSettings.basicAuthUser) {
      this.headers['Authorization'] = `Basic ${btoa(`${instanceSettings.basicAuthUser}:${instanceSettings.secureJsonData?.basicAuthPassword || ''}`)}`;
    }
  }

  async query(options: QueryOptions): Promise<QueryResult> {
    const { targets, timeRange } = options;
    
    try {
      const promises = targets
        .filter(target => !target.hide)
        .map(target => this.executeQuery(target as PrometheusQuery, options));
      
      const results = await Promise.all(promises);
      
      return {
        data: results.flat(),
        state: 'done'
      };
    } catch (error) {
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Query failed',
        state: 'error'
      };
    }
  }

  private async executeQuery(query: PrometheusQuery, options: QueryOptions): Promise<TimeSeriesData[]> {
    const { timeRange } = options;
    
    // Convert time range to timestamps
    const start = this.getTime(timeRange.from);
    const end = this.getTime(timeRange.to);
    const step = this.calculateStep(start, end, options.interval);
    
    const params = new URLSearchParams({
      query: query.expr,
      start: start.toString(),
      end: end.toString(),
      step: step.toString()
    });

    const url = `${this.baseURL}/api/v1/query_range?${params}`;
    
    const response = await fetch(url, {
      headers: this.headers,
      credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const data: PrometheusResponse = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.error || 'Unknown error');
    }

    return this.transformResponse(data, query);
  }

  private transformResponse(response: PrometheusResponse, query: PrometheusQuery): TimeSeriesData[] {
    return response.data.result.map(series => {
      const labels = series.metric;
      const legend = this.formatLegend(query.legendFormat || '', labels);
      
      const datapoints: Array<[number, number]> = [];
      
      if (series.values) {
        // Range query
        series.values.forEach(([timestamp, value]) => {
          const floatValue = parseFloat(value);
          if (!isNaN(floatValue)) {
            datapoints.push([floatValue, timestamp * 1000]);
          }
        });
      } else if (series.value) {
        // Instant query
        const [timestamp, value] = series.value;
        const floatValue = parseFloat(value);
        if (!isNaN(floatValue)) {
          datapoints.push([floatValue, timestamp * 1000]);
        }
      }
      
      return {
        target: legend,
        datapoints,
        tags: labels
      };
    });
  }

  async testDatasource(): Promise<TestResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/query?query=1`, {
        headers: this.headers,
        credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
      });

      if (response.ok) {
        return {
          status: 'success',
          message: 'Data source is working'
        };
      } else {
        return {
          status: 'error',
          message: `Failed to connect: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async metricFindQuery(query: string, options?: VariableQueryOptions): Promise<MetricFindValue[]> {
    // Handle label_values queries
    const labelValuesMatch = query.match(/^label_values\((.+),\s*(.+)\)$/);
    if (labelValuesMatch) {
      const [, metric, label] = labelValuesMatch;
      return this.getLabelValues(metric, label);
    }

    // Handle label_names queries
    const labelNamesMatch = query.match(/^label_names\((.+)?\)$/);
    if (labelNamesMatch) {
      const [, metric] = labelNamesMatch;
      return this.getLabelNames(metric);
    }

    // Handle metrics queries
    const metricsMatch = query.match(/^metrics\((.+)\)$/);
    if (metricsMatch) {
      const [, pattern] = metricsMatch;
      return this.getMetrics(pattern);
    }

    // Handle query_result queries
    const queryResultMatch = query.match(/^query_result\((.+)\)$/);
    if (queryResultMatch) {
      const [, expr] = queryResultMatch;
      return this.getQueryResult(expr);
    }

    // Default: treat as metric name pattern
    return this.getMetrics(query);
  }

  private async getLabelValues(metric: string, label: string): Promise<MetricFindValue[]> {
    const params = new URLSearchParams();
    if (metric && metric !== '.*' && metric !== '.+') {
      params.set('match[]', metric);
    }

    const url = `${this.baseURL}/api/v1/label/${label}/values?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch label values: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        return data.data.map((value: string) => ({
          text: value,
          value
        }));
      }
      
      throw new Error(data.error || 'Failed to fetch label values');
    } catch (error) {
      console.error('Error fetching label values:', error);
      return [];
    }
  }

  private async getLabelNames(metric?: string): Promise<MetricFindValue[]> {
    const params = new URLSearchParams();
    if (metric) {
      params.set('match[]', metric);
    }

    const url = `${this.baseURL}/api/v1/labels?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch labels: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        return data.data.map((label: string) => ({
          text: label,
          value: label
        }));
      }
      
      throw new Error(data.error || 'Failed to fetch labels');
    } catch (error) {
      console.error('Error fetching labels:', error);
      return [];
    }
  }

  private async getMetrics(pattern: string): Promise<MetricFindValue[]> {
    const url = `${this.baseURL}/api/v1/label/__name__/values`;
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
        return data.data
          .filter((metric: string) => regex.test(metric))
          .map((metric: string) => ({
            text: metric,
            value: metric
          }));
      }
      
      throw new Error(data.error || 'Failed to fetch metrics');
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

  private async getQueryResult(expr: string): Promise<MetricFindValue[]> {
    const params = new URLSearchParams({
      query: expr,
      time: Date.now() / 1000 + ''
    });

    const url = `${this.baseURL}/api/v1/query?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        credentials: this.instanceSettings.withCredentials ? 'include' : 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const data: PrometheusResponse = await response.json();
      
      if (data.status === 'success') {
        const values = new Set<string>();
        
        data.data.result.forEach(series => {
          // Extract unique label values
          Object.values(series.metric).forEach(value => values.add(value));
          
          // Also add the metric value if it's a simple scalar
          if (series.value) {
            values.add(series.value[1]);
          }
        });
        
        return Array.from(values).map(value => ({
          text: value,
          value
        }));
      }
      
      throw new Error(data.error || 'Query failed');
    } catch (error) {
      console.error('Error executing query:', error);
      return [];
    }
  }

  async getTagKeys(): Promise<MetricFindValue[]> {
    return this.getLabelNames();
  }

  async getTagValues(key: string): Promise<MetricFindValue[]> {
    return this.getLabelValues('', key);
  }

  private getTime(time: string | Date): number {
    if (typeof time === 'string') {
      // Handle relative time
      if (time === 'now') {
        return Date.now() / 1000;
      }
      
      const match = time.match(/^now-(\d+)([smhd])$/);
      if (match) {
        const [, value, unit] = match;
        const multipliers: Record<string, number> = {
          's': 1,
          'm': 60,
          'h': 3600,
          'd': 86400
        };
        return (Date.now() / 1000) - (parseInt(value) * multipliers[unit]);
      }
    }
    
    return new Date(time).getTime() / 1000;
  }

  private calculateStep(start: number, end: number, interval?: string): number {
    if (interval) {
      const match = interval.match(/(\d+)([smhd])/);
      if (match) {
        const [, value, unit] = match;
        const multipliers: Record<string, number> = {
          's': 1,
          'm': 60,
          'h': 3600,
          'd': 86400
        };
        return parseInt(value) * multipliers[unit];
      }
    }
    
    // Auto calculate step based on time range
    const range = end - start;
    const dataPoints = 300; // Target number of data points
    return Math.max(Math.ceil(range / dataPoints), 1);
  }

  private formatLegend(format: string, labels: Record<string, string>): string {
    if (!format) {
      // Default format
      const parts = Object.entries(labels)
        .filter(([key]) => key !== '__name__')
        .map(([key, value]) => `${key}="${value}"`);
      
      if (labels.__name__) {
        return `${labels.__name__}{${parts.join(', ')}}`;
      }
      
      return `{${parts.join(', ')}}`;
    }
    
    // Replace label placeholders
    let legend = format;
    Object.entries(labels).forEach(([key, value]) => {
      legend = legend.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    });
    
    return legend;
  }
}