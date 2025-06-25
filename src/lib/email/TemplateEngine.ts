import handlebars from 'handlebars';
import { EmailTemplate, EmailTemplateVariable } from './types';
import { format } from 'date-fns';

export class TemplateEngine {
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private customHelpers: Record<string, handlebars.HelperDelegate> = {};

  constructor() {
    this.registerDefaultHelpers();
  }

  private registerDefaultHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date: Date | string, formatStr: string = 'PPP') => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, formatStr);
    });

    // Number formatting helper
    handlebars.registerHelper('formatNumber', (num: number, decimals: number = 2) => {
      if (typeof num !== 'number') return '';
      return num.toFixed(decimals);
    });

    // Currency formatting helper
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      if (typeof amount !== 'number') return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Percentage formatting helper
    handlebars.registerHelper('formatPercent', (value: number, decimals: number = 1) => {
      if (typeof value !== 'number') return '';
      return `${(value * 100).toFixed(decimals)}%`;
    });

    // Conditional helpers
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    handlebars.registerHelper('gte', (a: any, b: any) => a >= b);

    // String helpers
    handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Array helpers
    handlebars.registerHelper('join', (arr: any[], separator: string = ', ') => {
      if (!Array.isArray(arr)) return '';
      return arr.join(separator);
    });

    // Alert severity helper
    handlebars.registerHelper('severityColor', (severity: string) => {
      const colors: Record<string, string> = {
        critical: '#FF0000',
        high: '#FF6B6B',
        medium: '#FFA500',
        low: '#FFD700',
        info: '#4ECDC4',
      };
      return colors[severity] || '#666666';
    });

    // Alert status helper
    handlebars.registerHelper('statusIcon', (status: string) => {
      const icons: Record<string, string> = {
        active: '🔴',
        acknowledged: '🟡',
        resolved: '🟢',
        muted: '🔇',
      };
      return icons[status] || '⚪';
    });
  }

  registerHelper(name: string, helper: handlebars.HelperDelegate) {
    this.customHelpers[name] = helper;
    handlebars.registerHelper(name, helper);
  }

  compileTemplate(template: EmailTemplate): handlebars.TemplateDelegate {
    const cached = this.templates.get(template.id);
    if (cached) return cached;

    const compiled = handlebars.compile(template.html);
    this.templates.set(template.id, compiled);
    return compiled;
  }

  render(template: EmailTemplate, data: Record<string, any>): string {
    const compiledTemplate = this.compileTemplate(template);
    return compiledTemplate(data);
  }

  renderText(template: string, data: Record<string, any>): string {
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  validateTemplateData(
    variables: EmailTemplateVariable[],
    data: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const variable of variables) {
      const value = data[variable.name];

      // Check required fields
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      // Skip optional fields that are not provided
      if (!variable.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      switch (variable.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Variable '${variable.name}' must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Variable '${variable.name}' must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Variable '${variable.name}' must be a boolean`);
          }
          break;
        case 'date':
          if (!(value instanceof Date) && !Date.parse(value)) {
            errors.push(`Variable '${variable.name}' must be a valid date`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Variable '${variable.name}' must be an array`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push(`Variable '${variable.name}' must be an object`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  extractVariables(templateHtml: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(templateHtml)) !== null) {
      const variable = match[1].trim();
      // Extract the main variable name (before any helpers or conditions)
      const mainVariable = variable.split(/[\s(#/]/, 2)[0];
      if (mainVariable && !mainVariable.startsWith('!')) {
        variables.add(mainVariable);
      }
    }

    return Array.from(variables);
  }

  previewTemplate(template: EmailTemplate, sampleData?: Record<string, any>): string {
    const data = sampleData || this.generateSampleData(template.variables);
    return this.render(template, data);
  }

  private generateSampleData(variables: string[]): Record<string, any> {
    const sampleData: Record<string, any> = {};

    for (const variable of variables) {
      // Generate sample data based on variable name patterns
      if (variable.includes('name') || variable.includes('Name')) {
        sampleData[variable] = 'John Doe';
      } else if (variable.includes('email') || variable.includes('Email')) {
        sampleData[variable] = 'john.doe@example.com';
      } else if (variable.includes('date') || variable.includes('Date')) {
        sampleData[variable] = new Date();
      } else if (variable.includes('count') || variable.includes('number')) {
        sampleData[variable] = 42;
      } else if (variable.includes('url') || variable.includes('link')) {
        sampleData[variable] = 'https://example.com';
      } else if (variable.includes('title') || variable.includes('subject')) {
        sampleData[variable] = 'Sample Title';
      } else if (variable.includes('description') || variable.includes('message')) {
        sampleData[variable] = 'This is a sample description text.';
      } else {
        sampleData[variable] = `Sample ${variable}`;
      }
    }

    return sampleData;
  }
}