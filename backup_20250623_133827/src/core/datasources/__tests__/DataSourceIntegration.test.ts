import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDataSourceManager } from '../DataSourceManager';
import { PrometheusDataSource } from '../plugins/PrometheusDataSource';
import { VariableManager } from '../../variables/VariableManager';
import { dashboardURLSync } from '../../dashboard/DashboardURLSync';

// Mock fetch for tests
global.fetch = vi.fn();

describe('DataSource Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PrometheusDataSource', () => {
    it('should execute metric find queries', async () => {
      const mockResponse = {
        status: 'success',
        data: ['up', 'http_requests_total', 'node_cpu_seconds_total']
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const ds = new PrometheusDataSource({
        id: 1,
        uid: 'test-prometheus',
        type: 'prometheus',
        name: 'Test Prometheus',
        url: 'http://localhost:9090',
        jsonData: {}
      });

      const results = await ds.metricFindQuery('.*');
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ text: 'up', value: 'up' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:9090/api/v1/label/__name__/values',
        expect.any(Object)
      );
    });

    it('should execute label_values queries', async () => {
      const mockResponse = {
        status: 'success',
        data: ['server1', 'server2', 'server3']
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const ds = new PrometheusDataSource({
        id: 1,
        uid: 'test-prometheus',
        type: 'prometheus',
        name: 'Test Prometheus',
        url: 'http://localhost:9090',
        jsonData: {}
      });

      const results = await ds.metricFindQuery('label_values(up, instance)');
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ text: 'server1', value: 'server1' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/label/instance/values'),
        expect.any(Object)
      );
    });

    it('should execute time series queries', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [{
            metric: { __name__: 'up', instance: 'server1' },
            values: [
              [1640995200, '1'],
              [1640995260, '1'],
              [1640995320, '0']
            ]
          }]
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const ds = new PrometheusDataSource({
        id: 1,
        uid: 'test-prometheus',
        type: 'prometheus',
        name: 'Test Prometheus',
        url: 'http://localhost:9090',
        jsonData: {}
      });

      const result = await ds.query({
        targets: [{
          refId: 'A',
          expr: 'up{instance="server1"}'
        }],
        timeRange: {
          from: 'now-1h',
          to: 'now',
          raw: { from: 'now-1h', to: 'now' }
        }
      });
      
      expect(result.state).toBe('done');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].target).toBe('up{instance="server1"}');
      expect(result.data[0].datapoints).toHaveLength(3);
    });
  });

  describe('VariableManager with DataSource', () => {
    it('should fetch variable options from datasource', async () => {
      // Mock data source manager
      const dsManager = getDataSourceManager();
      
      // Mock prometheus response
      const mockResponse = {
        status: 'success',
        data: ['production', 'staging', 'development']
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const manager = new VariableManager();
      
      const variables = [{
        id: 'env',
        name: 'environment',
        type: 'query' as const,
        query: 'label_values(up, environment)',
        datasource: { uid: 'prometheus-manufacturing', type: 'prometheus' },
        current: { text: '', value: '', selected: false },
        options: [],
        multi: false,
        refresh: 'never' as const
      }];

      await manager.initializeVariables(variables);
      
      const envVar = manager.getVariable('environment');
      expect(envVar?.options).toHaveLength(3);
      expect(envVar?.options[0].value).toBe('production');
    });
  });

  describe('URL Synchronization', () => {
    it('should sync variables to URL', () => {
      const originalLocation = window.location;
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: '',
        pathname: '/dashboards/test'
      } as any;

      const mockReplaceState = vi.fn();
      window.history.replaceState = mockReplaceState;

      const variables = [
        {
          id: '1',
          name: 'server',
          type: 'custom' as const,
          current: { text: 'server1', value: 'server1', selected: true },
          options: [],
          skipUrlSync: false
        },
        {
          id: '2',
          name: 'env',
          type: 'custom' as const,
          current: { text: 'prod', value: 'prod', selected: true },
          options: [],
          skipUrlSync: false
        }
      ];

      dashboardURLSync.syncVariables(variables);

      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('var-server=server1')
      );
      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('var-env=prod')
      );

      // Restore original location
      window.location = originalLocation;
    });

    it('should parse variables from URL', () => {
      const originalLocation = window.location;
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: '?var-server=server2&var-env=staging&from=now-3h&to=now&refresh=10s',
        pathname: '/dashboards/test'
      } as any;

      const state = dashboardURLSync.getUrlState();

      expect(state.variables).toEqual({
        server: 'server2',
        env: 'staging'
      });
      expect(state.from).toBe('now-3h');
      expect(state.to).toBe('now');
      expect(state.refresh).toBe('10s');

      // Restore original location
      window.location = originalLocation;
    });
  });
});