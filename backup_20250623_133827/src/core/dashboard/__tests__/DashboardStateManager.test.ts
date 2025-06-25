import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardStateManager } from '../DashboardStateManager';
import { Dashboard, TimeRange } from '@/types/dashboard';

describe('DashboardStateManager', () => {
  let mockDashboard: Dashboard;
  let manager: DashboardStateManager;

  beforeEach(() => {
    mockDashboard = {
      id: 'test-dashboard',
      uid: 'test-dashboard',
      title: 'Test Dashboard',
      tags: [],
      panels: [
        {
          id: 1,
          title: 'Test Panel - $server',
          type: 'timeseries',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [
            {
              refId: 'A',
              query: 'SELECT * FROM metrics WHERE server = "$server"'
            }
          ],
          fieldConfig: { defaults: {}, overrides: [] },
          options: {},
          transparent: false,
          links: [],
          transformations: []
        }
      ],
      templating: {
        list: [
          {
            name: 'server',
            type: 'custom',
            query: 'server1,server2,server3',
            current: {
              text: 'server1',
              value: 'server1',
              selected: true
            },
            options: [],
            multi: false,
            hide: 0
          }
        ]
      },
      annotations: [],
      links: [],
      time: {
        from: 'now-6h',
        to: 'now',
        raw: { from: 'now-6h', to: 'now' }
      },
      timepicker: {
        refresh_intervals: ['5s', '10s', '30s', '1m', '5m'],
        time_options: ['5m', '15m', '1h', '6h', '12h', '24h']
      },
      refresh: '30s',
      schemaVersion: 30,
      version: 1,
      timezone: 'browser',
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: 'monday',
      style: 'dark',
      editable: true,
      hideControls: false,
      graphTooltip: 0,
      preload: false,
      meta: {}
    };

    manager = new DashboardStateManager(mockDashboard);
  });

  describe('initialization', () => {
    it('should initialize with correct state', () => {
      const state = manager.getState();
      
      expect(state.dashboard.id).toBe('test-dashboard');
      expect(state.variables).toHaveLength(1);
      expect(state.variables[0].name).toBe('server');
      expect(state.timeRange.raw.from).toBe('now-6h');
      expect(state.refreshInterval).toBe('30s');
      expect(state.isRefreshing).toBe(false);
    });

    it('should initialize variables with correct values', () => {
      const state = manager.getState();
      const serverVar = state.variables[0];
      
      expect(serverVar.options).toHaveLength(3);
      expect(serverVar.options[0].value).toBe('server1');
      // First option should be selected by default
      expect(serverVar.current.value).toBe('server1');
    });

    it('should preserve original panel templates', () => {
      const state = manager.getState();
      const panel = state.dashboard.panels[0];
      
      // The title should NOT be interpolated in state - only at render time
      expect(panel.title).toBe('Test Panel - $server');
      
      // The query should NOT be interpolated in state - only at execution time
      expect(panel.targets[0].query).toBe('SELECT * FROM metrics WHERE server = "$server"');
    });
  });

  describe('variable updates', () => {
    it('should update variable value', () => {
      manager.updateVariable('server', 'server2');
      
      const state = manager.getState();
      const serverVar = state.variables[0];
      
      expect(serverVar.current.value).toBe('server2');
    });

    it('should update variable value but preserve query templates', () => {
      manager.updateVariable('server', 'server2');
      
      const state = manager.getState();
      const query = state.dashboard.panels[0].targets[0].query;
      
      // Query template should remain unchanged in state
      expect(query).toBe('SELECT * FROM metrics WHERE server = "$server"');
      
      // But interpolation should use the new value
      const interpolated = manager.interpolateQuery(query);
      expect(interpolated).toBe('SELECT * FROM metrics WHERE server = "server2"');
    });

    it('should notify listeners when variables change', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      
      manager.updateVariable('server', 'server2');
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        variables: expect.arrayContaining([
          expect.objectContaining({
            name: 'server',
            current: expect.objectContaining({ value: 'server2' })
          })
        ])
      }));
      
      unsubscribe();
    });
  });

  describe('time range updates', () => {
    it('should update time range', () => {
      const newTimeRange: TimeRange = {
        from: 'now-1h',
        to: 'now',
        raw: { from: 'now-1h', to: 'now' }
      };
      
      manager.setTimeRange(newTimeRange);
      
      const state = manager.getState();
      expect(state.timeRange.raw.from).toBe('now-1h');
    });

    it('should refresh variables when time range changes', () => {
      // Add a variable that refreshes on time range change
      const dashboard = {
        ...mockDashboard,
        templating: {
          list: [
            {
              ...mockDashboard.templating.list[0],
              refresh: 'onTimeRangeChanged' as const
            }
          ]
        }
      };
      
      const manager2 = new DashboardStateManager(dashboard);
      const listener = vi.fn();
      manager2.subscribe(listener);
      
      const newTimeRange: TimeRange = {
        from: 'now-1h',
        to: 'now',
        raw: { from: 'now-1h', to: 'now' }
      };
      
      manager2.setTimeRange(newTimeRange);
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('refresh interval', () => {
    it('should update refresh interval', () => {
      manager.setRefreshInterval('5s');
      
      const state = manager.getState();
      expect(state.refreshInterval).toBe('5s');
    });

    it('should handle "off" refresh interval', () => {
      manager.setRefreshInterval('off');
      
      const state = manager.getState();
      expect(state.refreshInterval).toBe('off');
    });
  });

  describe('query interpolation', () => {
    it('should interpolate simple variable', () => {
      const query = 'SELECT * FROM metrics WHERE server = "$server"';
      const result = manager.interpolateQuery(query);
      
      expect(result).toBe('SELECT * FROM metrics WHERE server = "server1"');
    });

    it('should interpolate with scoped variables', () => {
      const query = 'SELECT * FROM $table WHERE value > $threshold';
      const scopedVars = {
        table: 'metrics',
        threshold: 100
      };
      
      const result = manager.interpolateQuery(query, scopedVars);
      
      expect(result).toBe('SELECT * FROM metrics WHERE value > 100');
    });

    it('should interpolate built-in variables', () => {
      const query = 'rate(metric[$__interval])';
      const result = manager.interpolateQuery(query);
      
      // Should replace with calculated interval
      expect(result).toMatch(/rate\(metric\[\d+[smhd]\]\)/);
    });
  });

  describe('dashboard refresh', () => {
    it('should set isRefreshing during refresh', async () => {
      const promise = manager.refreshDashboard();
      
      // Check state during refresh
      let state = manager.getState();
      expect(state.isRefreshing).toBe(true);
      
      await promise;
      
      // Check state after refresh
      state = manager.getState();
      expect(state.isRefreshing).toBe(false);
    });
  });

  describe('panel selection', () => {
    it('should select panel', () => {
      const panel = mockDashboard.panels[0];
      manager.selectPanel(panel);
      
      const state = manager.getState();
      expect(state.selectedPanel).toEqual(panel);
    });

    it('should clear panel selection', () => {
      const panel = mockDashboard.panels[0];
      manager.selectPanel(panel);
      manager.selectPanel(undefined);
      
      const state = manager.getState();
      expect(state.selectedPanel).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.destroy();
      
      // Should not notify after destroy
      manager.updateVariable('server', 'server3');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});