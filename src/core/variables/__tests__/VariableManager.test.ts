// Jest test - using global test functions
import { VariableManager } from '../VariableManager';
import { Variable, CustomVariable, QueryVariable, IntervalVariable } from '../VariableTypes';

describe('VariableManager', () => {
  let manager: VariableManager;

  beforeEach(() => {
    manager = new VariableManager();
  });

  describe('initializeVariables', () => {
    it('should initialize variables in correct order based on dependencies', async () => {
      const variables: Variable[] = [
        {
          id: '1',
          name: 'datasource',
          type: 'datasource',
          query: 'prometheus',
          current: { text: '', value: '', selected: false },
          options: []
        },
        {
          id: '2',
          name: 'server',
          type: 'query',
          datasource: '$datasource',
          query: 'label_values(up, instance)',
          current: { text: '', value: '', selected: false },
          options: []
        }
      ];

      await manager.initializeVariables(variables);
      const allVars = manager.getVariables();
      
      expect(allVars).toHaveLength(2);
      expect(allVars[0].name).toBe('datasource');
      expect(allVars[1].name).toBe('server');
    });

    it('should detect circular dependencies', async () => {
      const variables: Variable[] = [
        {
          id: '1',
          name: 'var1',
          type: 'custom',
          query: '$var2',
          current: { text: '', value: '', selected: false },
          options: []
        },
        {
          id: '2',
          name: 'var2',
          type: 'custom',
          query: '$var1',
          current: { text: '', value: '', selected: false },
          options: []
        }
      ];

      await expect(manager.initializeVariables(variables)).rejects.toThrow('Circular dependency');
    });
  });

  describe('interpolateQuery', () => {
    it('should interpolate single value variables', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'server',
        type: 'custom',
        query: 'server1,server2,server3',
        current: { text: 'server1', value: 'server1', selected: true },
        options: []
      };

      await manager.initializeVariables([variable]);
      
      const query = 'SELECT * FROM metrics WHERE host = "$server"';
      const interpolated = manager.interpolateQuery(query);
      
      expect(interpolated).toBe('SELECT * FROM metrics WHERE host = "server1"');
    });

    it('should support multiple value formatting', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'servers',
        type: 'custom',
        query: 'server1,server2,server3',
        multi: true,
        current: { 
          text: 'server1 + server2', 
          value: ['server1', 'server2'], 
          selected: true 
        },
        options: []
      };

      await manager.initializeVariables([variable]);
      
      expect(manager.interpolateQuery('$servers')).toBe('server1,server2');
      expect(manager.interpolateQuery('${servers}')).toBe('server1,server2');
      expect(manager.interpolateQuery('${servers:pipe}')).toBe('server1|server2');
      expect(manager.interpolateQuery('${servers:regex}')).toBe('(server1|server2)');
      expect(manager.interpolateQuery('${servers:glob}')).toBe('{server1,server2}');
      expect(manager.interpolateQuery('${servers:csv}')).toBe('server1,server2');
      expect(manager.interpolateQuery('${servers:json}')).toBe('["server1","server2"]');
    });

    it('should interpolate built-in variables', () => {
      const query = 'rate(metric[$__interval])';
      const interpolated = manager.interpolateQuery(query);
      
      // Should replace with calculated interval
      expect(interpolated).toMatch(/rate\(metric\[\d+[smhd]\]\)/);
    });

    it('should support scoped variables', () => {
      const query = 'SELECT * FROM $table WHERE value > $threshold';
      const scopedVars = {
        table: 'metrics',
        threshold: 100
      };
      
      const interpolated = manager.interpolateQuery(query, scopedVars);
      expect(interpolated).toBe('SELECT * FROM metrics WHERE value > 100');
    });
  });

  describe('custom variables', () => {
    it('should parse CSV values correctly', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'env',
        type: 'custom',
        query: 'dev,staging,prod',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const env = manager.getVariable('env');
      
      expect(env?.options).toHaveLength(3);
      expect(env?.options[0]).toEqual({ text: 'dev', value: 'dev', selected: true });
      expect(env?.options[1]).toEqual({ text: 'staging', value: 'staging', selected: false });
      expect(env?.options[2]).toEqual({ text: 'prod', value: 'prod', selected: false });
    });

    it('should support key:value format', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'region',
        type: 'custom',
        query: 'US East : us-east-1, US West : us-west-2, Europe : eu-west-1',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const region = manager.getVariable('region');
      
      expect(region?.options).toHaveLength(3);
      expect(region?.options[0]).toEqual({ text: 'US East', value: 'us-east-1', selected: true });
      expect(region?.options[1]).toEqual({ text: 'US West', value: 'us-west-2', selected: false });
    });
  });

  describe('interval variables', () => {
    it('should create interval options', async () => {
      const variable: IntervalVariable = {
        id: '1',
        name: 'interval',
        type: 'interval',
        query: '1m,5m,10m,30m,1h',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const interval = manager.getVariable('interval');
      
      expect(interval?.options).toHaveLength(5);
      expect(interval?.options.map(o => o.value)).toEqual(['1m', '5m', '10m', '30m', '1h']);
    });

    it('should add auto option when enabled', async () => {
      const variable: IntervalVariable = {
        id: '1',
        name: 'interval',
        type: 'interval',
        query: '1m,5m,10m',
        auto: true,
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const interval = manager.getVariable('interval');
      
      expect(interval?.options[0].text).toBe('auto');
      expect(interval?.options).toHaveLength(4);
    });
  });

  describe('variable features', () => {
    it('should apply regex filter', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'metrics',
        type: 'custom',
        query: 'cpu_usage,memory_usage,disk_read,disk_write,network_in,network_out',
        regex: '.*_usage',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const metrics = manager.getVariable('metrics');
      
      expect(metrics?.options).toHaveLength(2);
      expect(metrics?.options.map(o => o.value)).toEqual(['cpu_usage', 'memory_usage']);
    });

    it('should sort options', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'numbers',
        type: 'custom',
        query: '10,2,30,1,20',
        sort: 'numerical',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const numbers = manager.getVariable('numbers');
      
      expect(numbers?.options.map(o => o.value)).toEqual(['1', '2', '10', '20', '30']);
    });

    it('should add "All" option when includeAll is true', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'servers',
        type: 'custom',
        query: 'server1,server2,server3',
        includeAll: true,
        multi: true,
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      const servers = manager.getVariable('servers');
      
      expect(servers?.options[0]).toEqual({ text: 'All', value: '$__all', selected: true });
      expect(servers?.options).toHaveLength(4);
    });
  });

  describe('updateVariable', () => {
    it('should update variable value and notify listeners', async () => {
      const variable: CustomVariable = {
        id: '1',
        name: 'env',
        type: 'custom',
        query: 'dev,staging,prod',
        current: { text: '', value: '', selected: false },
        options: []
      };

      await manager.initializeVariables([variable]);
      
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      
      manager.updateVariable('env', 'staging');
      
      expect(listener).toHaveBeenCalled();
      const env = manager.getVariable('env');
      expect(env?.current.value).toBe('staging');
      
      unsubscribe();
    });

    it('should refresh dependent variables', async () => {
      const variables: Variable[] = [
        {
          id: '1',
          name: 'datasource',
          type: 'custom',
          query: 'prometheus,influxdb',
          current: { text: '', value: '', selected: false },
          options: []
        },
        {
          id: '2',
          name: 'metric',
          type: 'custom',
          query: 'metrics_for_$datasource',
          current: { text: '', value: '', selected: false },
          options: []
        }
      ];

      await manager.initializeVariables(variables);
      
      // Change datasource should refresh metric
      manager.updateVariable('datasource', 'influxdb');
      
      const metric = manager.getVariable('metric');
      expect(metric?.query).toBe('metrics_for_$datasource');
    });
  });
});