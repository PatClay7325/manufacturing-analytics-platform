/**
 * Variable Service - Handles template variable interpolation and substitution
 * 
 * This service manages dashboard variables, their values, and interpolation
 * in queries, panel titles, and other dashboard elements.
 */

import { TemplateVariable, VariableOption, Dashboard } from '@/types/dashboard';

export interface VariableValue {
  text: string | string[];
  value: string | string[];
}

export interface VariableContext {
  variables: Map<string, VariableValue>;
  timeRange?: {
    from: string | Date;
    to: string | Date;
  };
  interval?: string;
}

export class VariableService {
  private static instance: VariableService;
  private variableCache: Map<string, VariableValue> = new Map();

  private constructor() {}

  static getInstance(): VariableService {
    if (!VariableService.instance) {
      VariableService.instance = new VariableService();
    }
    return VariableService.instance;
  }

  /**
   * Initialize variables from dashboard
   */
  initializeVariables(dashboard: Dashboard): VariableContext {
    const context: VariableContext = {
      variables: new Map(),
      timeRange: dashboard.time,
      interval: '1m'
    };

    // Process each variable
    dashboard.templating.list.forEach(variable => {
      const value = this.getVariableValue(variable);
      context.variables.set(variable.name, value);
    });

    // Add built-in variables
    this.addBuiltInVariables(context, dashboard);

    return context;
  }

  /**
   * Get current value of a variable
   */
  getVariableValue(variable: TemplateVariable): VariableValue {
    // Check cache first
    const cached = this.variableCache.get(variable.name);
    if (cached && variable.refresh === 'never') {
      return cached;
    }

    // Get current value or default
    if (variable.current) {
      return {
        text: variable.current.text,
        value: variable.current.value
      };
    }

    // Return first option or empty
    if (variable.options && variable.options.length > 0) {
      return {
        text: variable.options[0].text,
        value: variable.options[0].value
      };
    }

    // Default value based on type
    switch (variable.type) {
      case 'interval':
        return { text: '1m', value: '1m' };
      case 'datasource':
        return { text: 'default', value: 'default' };
      case 'textbox':
      case 'constant':
        return { text: variable.query || '', value: variable.query || '' };
      default:
        return { text: '', value: '' };
    }
  }

  /**
   * Set variable value
   */
  setVariableValue(variable: TemplateVariable, value: VariableOption): void {
    variable.current = value;
    this.variableCache.set(variable.name, {
      text: value.text,
      value: value.value
    });
  }

  /**
   * Interpolate variables in a string
   * Supports formats: $varname, ${varname}, [[varname]]
   */
  interpolate(text: string, context: VariableContext): string {
    if (!text) return text;

    let result = text;

    // Replace $varname and ${varname} format
    result = result.replace(/\$(\{)?(\w+)\}?/g, (match, brace, varName) => {
      const value = this.getInterpolatedValue(varName, context);
      return value !== null ? value : match;
    });

    // Replace [[varname]] format (Grafana compatibility)
    result = result.replace(/\[\[(\w+)\]\]/g, (match, varName) => {
      const value = this.getInterpolatedValue(varName, context);
      return value !== null ? value : match;
    });

    return result;
  }

  /**
   * Interpolate variables in an object (deep)
   */
  interpolateObject<T extends Record<string, any>>(obj: T, context: VariableContext): T {
    const result = {} as T;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key as keyof T] = this.interpolate(value, context) as T[keyof T];
      } else if (Array.isArray(value)) {
        result[key as keyof T] = value.map(item => 
          typeof item === 'string' ? this.interpolate(item, context) : 
          typeof item === 'object' && item !== null ? this.interpolateObject(item, context) : 
          item
        ) as T[keyof T];
      } else if (typeof value === 'object' && value !== null) {
        result[key as keyof T] = this.interpolateObject(value, context) as T[keyof T];
      } else {
        result[key as keyof T] = value;
      }
    }

    return result;
  }

  /**
   * Get interpolated value for a variable
   */
  private getInterpolatedValue(varName: string, context: VariableContext): string | null {
    // Check custom variables
    const variable = context.variables.get(varName);
    if (variable) {
      // Handle multi-value variables
      if (Array.isArray(variable.value)) {
        return variable.value.join(',');
      }
      return String(variable.value);
    }

    // Check built-in variables
    switch (varName) {
      case '__interval':
      case 'interval':
        return context.interval || '1m';
      
      case '__from':
      case 'timeFrom':
        return this.formatTime(context.timeRange?.from);
      
      case '__to':
      case 'timeTo':
        return this.formatTime(context.timeRange?.to);
      
      case '__timeFilter':
        return this.buildTimeFilter(context.timeRange);
      
      case '__dashboard':
        return 'current';
      
      case '__user':
        return 'anonymous';
      
      case '__org':
        return 'default';
      
      default:
        return null;
    }
  }

  /**
   * Add built-in variables to context
   */
  private addBuiltInVariables(context: VariableContext, dashboard: Dashboard): void {
    // Time range variables
    context.variables.set('__from', {
      text: this.formatTime(dashboard.time.from),
      value: this.formatTime(dashboard.time.from)
    });
    
    context.variables.set('__to', {
      text: this.formatTime(dashboard.time.to),
      value: this.formatTime(dashboard.time.to)
    });

    // Dashboard variables
    context.variables.set('__dashboard', {
      text: dashboard.title,
      value: dashboard.uid
    });

    // Interval variable
    const interval = this.calculateInterval(dashboard.time);
    context.variables.set('__interval', {
      text: interval,
      value: interval
    });
  }

  /**
   * Format time value
   */
  private formatTime(time: string | Date | undefined): string {
    if (!time) return 'now';
    
    if (typeof time === 'string') {
      // Handle relative time (now-6h, now, etc)
      if (time.startsWith('now')) {
        return time;
      }
      // Try to parse as date
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return time;
    }
    
    if (time instanceof Date) {
      return time.toISOString();
    }
    
    return 'now';
  }

  /**
   * Build time filter for SQL queries
   */
  private buildTimeFilter(timeRange?: { from: string | Date; to: string | Date }): string {
    if (!timeRange) return '1=1';
    
    const from = this.formatTime(timeRange.from);
    const to = this.formatTime(timeRange.to);
    
    // Convert relative times to SQL
    const fromSql = this.convertToSqlTime(from);
    const toSql = this.convertToSqlTime(to);
    
    return `time >= ${fromSql} AND time <= ${toSql}`;
  }

  /**
   * Convert time to SQL format
   */
  private convertToSqlTime(time: string): string {
    if (time === 'now') {
      return 'NOW()';
    }
    
    if (time.startsWith('now-')) {
      const duration = time.substring(4);
      return `NOW() - INTERVAL '${duration}'`;
    }
    
    if (time.startsWith('now+')) {
      const duration = time.substring(4);
      return `NOW() + INTERVAL '${duration}'`;
    }
    
    // ISO date
    return `'${time}'::timestamptz`;
  }

  /**
   * Calculate auto interval based on time range
   */
  private calculateInterval(timeRange: { from: string | Date; to: string | Date }): string {
    // This is a simplified calculation
    // In production, this would be more sophisticated
    const from = new Date(this.formatTime(timeRange.from));
    const to = new Date(this.formatTime(timeRange.to));
    const diffMs = to.getTime() - from.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours <= 1) return '10s';
    if (diffHours <= 6) return '30s';
    if (diffHours <= 12) return '1m';
    if (diffHours <= 24) return '5m';
    if (diffHours <= 48) return '10m';
    if (diffHours <= 168) return '30m';
    if (diffHours <= 720) return '1h';
    return '1d';
  }

  /**
   * Validate variable name
   */
  validateVariableName(name: string): { valid: boolean; error?: string } {
    if (!name) {
      return { valid: false, error: 'Variable name is required' };
    }
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return { 
        valid: false, 
        error: 'Variable name must be alphanumeric and start with letter or underscore' 
      };
    }
    
    // Reserved names
    const reserved = ['__interval', '__from', '__to', '__dashboard', '__user', '__org'];
    if (reserved.includes(name)) {
      return { valid: false, error: 'This is a reserved variable name' };
    }
    
    return { valid: true };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.variableCache.clear();
  }
}

// Export singleton instance
export const variableService = VariableService.getInstance();