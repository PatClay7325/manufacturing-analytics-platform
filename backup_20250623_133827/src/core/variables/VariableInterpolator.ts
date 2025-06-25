/**
 * VariableInterpolator - Handles all variable interpolation logic
 * Supports all AnalyticsPlatform variable formats and syntax
 */

import { Variable, VariableOption } from './VariableTypes';
import { VariableManager } from './VariableManager';

export class VariableInterpolator {
  constructor(private variableManager: VariableManager) {}

  /**
   * Interpolate variables in a query string
   */
  interpolate(query: string, scopedVars?: Record<string, any>): string {
    let interpolated = query;

    // First, replace scoped variables (highest priority)
    if (scopedVars) {
      interpolated = this.interpolateScopedVars(interpolated, scopedVars);
    }

    // Then replace dashboard variables
    interpolated = this.interpolateDashboardVars(interpolated);

    // Finally, replace built-in variables
    interpolated = this.interpolateBuiltInVars(interpolated);

    return interpolated;
  }

  /**
   * Interpolate scoped variables (e.g., from repeating panels)
   */
  private interpolateScopedVars(query: string, scopedVars: Record<string, any>): string {
    let result = query;

    Object.entries(scopedVars).forEach(([name, scopedVar]) => {
      const value = scopedVar.value !== undefined ? scopedVar.value : scopedVar;
      
      // Support multiple regex patterns
      const patterns = [
        new RegExp(`\\$\\{${name}(?::([^}]+))?\\}`, 'g'), // ${var:format}
        new RegExp(`\\$${name}\\b`, 'g'), // $var
        new RegExp(`\\[\\[${name}(?::([^\\]]+))?\\]\\]`, 'g') // [[var:format]]
      ];

      patterns.forEach(pattern => {
        result = result.replace(pattern, (match, format) => {
          return this.formatValue(value, format);
        });
      });
    });

    return result;
  }

  /**
   * Interpolate dashboard variables
   */
  private interpolateDashboardVars(query: string): string {
    let result = query;
    const variables = this.variableManager.getVariables();

    variables.forEach(variable => {
      const patterns = [
        new RegExp(`\\$\\{${variable.name}(?::([^}]+))?\\}`, 'g'), // ${var:format}
        new RegExp(`\\$${variable.name}\\b`, 'g'), // $var
        new RegExp(`\\[\\[${variable.name}(?::([^\\]]+))?\\]\\]`, 'g') // [[var:format]]
      ];

      patterns.forEach(pattern => {
        result = result.replace(pattern, (match, format) => {
          return this.formatVariableValue(variable, format);
        });
      });
    });

    return result;
  }

  /**
   * Interpolate built-in variables
   */
  private interpolateBuiltInVars(query: string): string {
    let result = query;
    const builtInVars = this.variableManager.getBuiltInVariables();

    builtInVars.forEach(({ name, value }) => {
      const patterns = [
        new RegExp(`\\$\\{${name}\\}`, 'g'), // ${__var}
        new RegExp(`\\$${name}\\b`, 'g'), // $__var
        new RegExp(`\\[\\[${name}\\]\\]`, 'g') // [[__var]]
      ];

      const resolvedValue = typeof value === 'function' ? value() : value;

      patterns.forEach(pattern => {
        result = result.replace(pattern, resolvedValue);
      });
    });

    return result;
  }

  /**
   * Format variable value based on format specifier
   */
  private formatVariableValue(variable: Variable, format?: string): string {
    const value = variable.current.value;
    
    // Handle special 'All' value
    if (value === '$__all' || value === variable.allValue) {
      return this.formatAllValue(variable, format);
    }

    return this.formatValue(value, format);
  }

  /**
   * Format a value with optional format specifier
   */
  private formatValue(value: string | string[], format?: string): string {
    if (Array.isArray(value)) {
      return this.formatMultiValue(value, format);
    }

    // Single value formatting
    switch (format) {
      case 'raw':
        return String(value);
      case 'regex':
        return this.escapeRegex(String(value));
      case 'lucene':
        return this.escapeLucene(String(value));
      case 'pipe':
        return String(value);
      case 'distributed':
        return this.formatDistributed(String(value));
      case 'csv':
        return String(value);
      case 'json':
        return JSON.stringify(value);
      case 'percentencode':
        return encodeURIComponent(String(value));
      case 'singlequote':
        return `'${String(value)}'`;
      case 'doublequote':
        return `"${String(value)}"`;
      case 'sqlstring':
        return `'${String(value).replace(/'/g, "''")}'`;
      case 'date':
        return this.formatDate(String(value));
      case 'glob':
        return String(value);
      default:
        return String(value);
    }
  }

  /**
   * Format multi-value variables
   */
  private formatMultiValue(values: string[], format?: string): string {
    switch (format) {
      case 'csv':
        return values.join(',');
      case 'pipe':
        return values.join('|');
      case 'regex':
        return `(${values.map(v => this.escapeRegex(v)).join('|')})`;
      case 'lucene':
        return `(${values.map(v => this.escapeLucene(v)).join(' OR ')})`;
      case 'glob':
        return `{${values.join(',')}}`;
      case 'json':
        return JSON.stringify(values);
      case 'distributed':
        return values.map(v => this.formatDistributed(v)).join(',');
      case 'singlequote':
        return values.map(v => `'${v}'`).join(',');
      case 'doublequote':
        return values.map(v => `"${v}"`).join(',');
      case 'sqlstring':
        return values.map(v => `'${v.replace(/'/g, "''")}'`).join(',');
      case 'percentencode':
        return values.map(v => encodeURIComponent(v)).join(',');
      default:
        return values.join(',');
    }
  }

  /**
   * Format the special 'All' value
   */
  private formatAllValue(variable: Variable, format?: string): string {
    // If custom allValue is set, use it
    if (variable.allValue && variable.allValue !== '$__all') {
      return variable.allValue;
    }

    // Otherwise, format all option values
    const values = variable.options
      .filter(opt => opt.value !== '$__all' && opt.value !== variable.allValue)
      .map(opt => opt.value as string);

    return this.formatMultiValue(values, format);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escape Lucene query syntax
   */
  private escapeLucene(value: string): string {
    // Escape special Lucene characters
    return value.replace(/[+\-&|!(){}[\]^"~*?:\\]/g, '\\$&');
  }

  /**
   * Format for distributed queries (Graphite)
   */
  private formatDistributed(value: string): string {
    // For Graphite distributed queries
    return value.split('.').map(part => `'${part}'`).join('.');
  }

  /**
   * Format date values
   */
  private formatDate(value: string, dateFormat?: string): string {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value;
      }

      // Default ISO format
      if (!dateFormat) {
        return date.toISOString();
      }

      // Would implement full date formatting here
      // For now, return ISO format
      return date.toISOString();
    } catch {
      return value;
    }
  }

  /**
   * Check if a string contains variables
   */
  containsVariables(query: string): boolean {
    // Check for any variable syntax
    const patterns = [
      /\$\w+/,        // $var
      /\$\{[^}]+\}/,  // ${var}
      /\[\[[^\]]+\]\]/ // [[var]]
    ];

    return patterns.some(pattern => pattern.test(query));
  }

  /**
   * Extract variable names from a query
   */
  extractVariableNames(query: string): string[] {
    const names = new Set<string>();
    
    // Extract $var format
    const simpleMatches = query.match(/\$(\w+)/g) || [];
    simpleMatches.forEach(match => {
      const name = match.substring(1);
      if (!name.startsWith('__')) { // Skip built-in vars
        names.add(name);
      }
    });

    // Extract ${var} format
    const bracedMatches = query.match(/\$\{([^:}]+)(?::[^}]+)?\}/g) || [];
    bracedMatches.forEach(match => {
      const name = match.match(/\$\{([^:}]+)/)?.[1];
      if (name && !name.startsWith('__')) {
        names.add(name);
      }
    });

    // Extract [[var]] format
    const bracketMatches = query.match(/\[\[([^:\]]+)(?::[^\]]+)?\]\]/g) || [];
    bracketMatches.forEach(match => {
      const name = match.match(/\[\[([^:\]]+)/)?.[1];
      if (name && !name.startsWith('__')) {
        names.add(name);
      }
    });

    return Array.from(names);
  }
}