// Jest test - using global test functions
import { VariableService } from '@/services/variableService';
import { Dashboard, TemplateVariable } from '@/types/dashboard';

describe('VariableService', () => {
  let service: VariableService;
  let mockDashboard: Dashboard;

  beforeEach(() => {
    service = VariableService.getInstance();
    service.clearCache();

    mockDashboard = {
      uid: 'test-dashboard',
      title: 'Test Dashboard',
      time: { from: 'now-6h', to: 'now' },
      templating: {
        list: [
          {
            name: 'facility',
            type: 'custom',
            label: 'Facility',
            options: [
              { text: 'Factory A', value: 'factory_a' },
              { text: 'Factory B', value: 'factory_b' }
            ],
            current: { text: 'Factory A', value: 'factory_a' }
          },
          {
            name: 'equipment',
            type: 'query',
            query: 'SELECT name FROM equipment WHERE facility = \'$facility\'',
            multi: true,
            current: { text: ['Line 1', 'Line 2'], value: ['line1', 'line2'] }
          },
          {
            name: 'interval',
            type: 'interval',
            query: '1m,5m,10m,30m,1h',
            current: { text: '5m', value: '5m' }
          }
        ]
      }
    } as any;
  });

  describe('Variable Interpolation', () => {
    it('should interpolate simple variables', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Facility: $facility', context);
      expect(result).toBe('Facility: factory_a');
    });

    it('should interpolate variables with braces', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Facility: ${facility}', context);
      expect(result).toBe('Facility: factory_a');
    });

    it('should interpolate variables with double brackets', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Facility: [[facility]]', context);
      expect(result).toBe('Facility: factory_a');
    });

    it('should handle multi-value variables', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Equipment: $equipment', context);
      expect(result).toBe('Equipment: line1,line2');
    });

    it('should interpolate built-in variables', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Dashboard: $__dashboard, Interval: $__interval', context);
      expect(result).toContain('Dashboard: Test Dashboard');
      expect(result).toContain('Interval:');
    });

    it('should handle missing variables', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('Unknown: $unknown_var', context);
      expect(result).toBe('Unknown: $unknown_var');
    });

    it('should interpolate multiple variables in one string', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate(
        'SELECT * FROM metrics WHERE facility = \'$facility\' AND equipment IN ($equipment) AND time > $__from',
        context
      );
      expect(result).toContain('facility = \'factory_a\'');
      expect(result).toContain('equipment IN (line1,line2)');
      expect(result).toContain('time > now-6h');
    });
  });

  describe('Object Interpolation', () => {
    it('should interpolate variables in objects', () => {
      const context = service.initializeVariables(mockDashboard);
      const obj = {
        query: 'SELECT * FROM metrics WHERE facility = \'$facility\'',
        title: 'Metrics for ${facility}',
        nested: {
          equipment: '$equipment',
          interval: '$interval'
        }
      };

      const result = service.interpolateObject(obj, context);
      expect(result.query).toContain('facility = \'factory_a\'');
      expect(result.title).toBe('Metrics for factory_a');
      expect(result.nested.equipment).toBe('line1,line2');
      expect(result.nested.interval).toBe('5m');
    });

    it('should handle arrays in objects', () => {
      const context = service.initializeVariables(mockDashboard);
      const obj = {
        queries: [
          'SELECT * FROM metrics WHERE facility = \'$facility\'',
          'SELECT * FROM equipment WHERE name IN ($equipment)'
        ],
        tags: ['facility:$facility', 'dashboard:$__dashboard']
      };

      const result = service.interpolateObject(obj, context);
      expect(result.queries[0]).toContain('facility = \'factory_a\'');
      expect(result.queries[1]).toContain('name IN (line1,line2)');
      expect(result.tags[0]).toBe('facility:factory_a');
      expect(result.tags[1]).toBe('dashboard:Test Dashboard');
    });
  });

  describe('Variable Value Management', () => {
    it('should get variable value', () => {
      const variable: TemplateVariable = {
        name: 'test',
        type: 'custom',
        current: { text: 'Test Value', value: 'test_value' }
      };

      const value = service.getVariableValue(variable);
      expect(value).toEqual({ text: 'Test Value', value: 'test_value' });
    });

    it('should set variable value', () => {
      const variable: TemplateVariable = {
        name: 'test',
        type: 'custom',
        options: [
          { text: 'Option 1', value: 'opt1' },
          { text: 'Option 2', value: 'opt2' }
        ]
      };

      service.setVariableValue(variable, { text: 'Option 2', value: 'opt2' });
      expect(variable.current).toEqual({ text: 'Option 2', value: 'opt2' });
    });

    it('should handle default values for different variable types', () => {
      const intervalVar: TemplateVariable = {
        name: 'interval',
        type: 'interval'
      };
      expect(service.getVariableValue(intervalVar)).toEqual({ text: '1m', value: '1m' });

      const textboxVar: TemplateVariable = {
        name: 'textbox',
        type: 'textbox',
        query: 'default_text'
      };
      expect(service.getVariableValue(textboxVar)).toEqual({ 
        text: 'default_text', 
        value: 'default_text' 
      });

      const constantVar: TemplateVariable = {
        name: 'constant',
        type: 'constant',
        query: 'const_value'
      };
      expect(service.getVariableValue(constantVar)).toEqual({ 
        text: 'const_value', 
        value: 'const_value' 
      });
    });
  });

  describe('Time Variables', () => {
    it('should handle __timeFilter variable', () => {
      const context = service.initializeVariables(mockDashboard);
      const result = service.interpolate('WHERE $__timeFilter', context);
      expect(result).toContain('time >=');
      expect(result).toContain('time <=');
    });

    it('should calculate appropriate intervals', () => {
      // Test different time ranges
      const testCases = [
        { from: 'now-30m', to: 'now', expectedContains: ['10s', '30s'] },
        { from: 'now-6h', to: 'now', expectedContains: ['30s', '1m', '5m'] },
        { from: 'now-24h', to: 'now', expectedContains: ['5m', '10m'] },
        { from: 'now-7d', to: 'now', expectedContains: ['30m', '1h'] }
      ];

      testCases.forEach(testCase => {
        const dashboard = { ...mockDashboard, time: testCase };
        const context = service.initializeVariables(dashboard);
        const interval = context.variables.get('__interval')?.value;
        expect(testCase.expectedContains).toContain(interval);
      });
    });
  });

  describe('Variable Name Validation', () => {
    it('should validate correct variable names', () => {
      expect(service.validateVariableName('validName')).toEqual({ valid: true });
      expect(service.validateVariableName('valid_name')).toEqual({ valid: true });
      expect(service.validateVariableName('_validName')).toEqual({ valid: true });
      expect(service.validateVariableName('validName123')).toEqual({ valid: true });
    });

    it('should reject invalid variable names', () => {
      expect(service.validateVariableName('')).toEqual({ 
        valid: false, 
        error: 'Variable name is required' 
      });
      
      expect(service.validateVariableName('123invalid')).toEqual({ 
        valid: false, 
        error: 'Variable name must be alphanumeric and start with letter or underscore' 
      });
      
      expect(service.validateVariableName('invalid-name')).toEqual({ 
        valid: false, 
        error: 'Variable name must be alphanumeric and start with letter or underscore' 
      });
      
      expect(service.validateVariableName('invalid name')).toEqual({ 
        valid: false, 
        error: 'Variable name must be alphanumeric and start with letter or underscore' 
      });
    });

    it('should reject reserved variable names', () => {
      expect(service.validateVariableName('__interval')).toEqual({ 
        valid: false, 
        error: 'This is a reserved variable name' 
      });
      
      expect(service.validateVariableName('__from')).toEqual({ 
        valid: false, 
        error: 'This is a reserved variable name' 
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache variable values', () => {
      const variable: TemplateVariable = {
        name: 'cached',
        type: 'custom',
        refresh: 'never',
        current: { text: 'Initial', value: 'initial' }
      };

      // First call
      const value1 = service.getVariableValue(variable);
      expect(value1).toEqual({ text: 'Initial', value: 'initial' });

      // Change current value
      variable.current = { text: 'Changed', value: 'changed' };

      // Second call should return cached value
      const value2 = service.getVariableValue(variable);
      expect(value2).toEqual({ text: 'Initial', value: 'initial' });

      // Clear cache and try again
      service.clearCache();
      const value3 = service.getVariableValue(variable);
      expect(value3).toEqual({ text: 'Changed', value: 'changed' });
    });
  });
});