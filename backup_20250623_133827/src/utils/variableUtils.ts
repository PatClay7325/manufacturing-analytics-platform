/**
 * Variable utilities for dashboard components
 */

import { Dashboard, Panel } from '@/types/dashboard';
import { variableService } from '@/services/variableService';

/**
 * Interpolate variables in panel configuration
 */
export function interpolatePanel(panel: Panel, dashboard: Dashboard): Panel {
  const context = variableService.initializeVariables(dashboard);
  
  // Create a deep copy to avoid mutating the original
  const interpolatedPanel = JSON.parse(JSON.stringify(panel));
  
  // Interpolate title
  if (interpolatedPanel.title) {
    interpolatedPanel.title = variableService.interpolate(interpolatedPanel.title, context);
  }
  
  // Interpolate description
  if (interpolatedPanel.description) {
    interpolatedPanel.description = variableService.interpolate(interpolatedPanel.description, context);
  }
  
  // Interpolate queries
  if (interpolatedPanel.targets) {
    interpolatedPanel.targets = interpolatedPanel.targets.map(target => ({
      ...target,
      query: target.query ? variableService.interpolate(target.query, context) : target.query,
      // Interpolate other query fields that might contain variables
      ...(target.rawSql && { rawSql: variableService.interpolate(target.rawSql, context) }),
      ...(target.expr && { expr: variableService.interpolate(target.expr, context) }),
      ...(target.target && { target: variableService.interpolate(target.target, context) })
    }));
  }
  
  // Interpolate field config defaults
  if (interpolatedPanel.fieldConfig?.defaults?.displayName) {
    interpolatedPanel.fieldConfig.defaults.displayName = variableService.interpolate(
      interpolatedPanel.fieldConfig.defaults.displayName,
      context
    );
  }
  
  // Interpolate panel options (specific to panel type)
  if (interpolatedPanel.options) {
    interpolatedPanel.options = interpolateOptions(interpolatedPanel.options, interpolatedPanel.type, context);
  }
  
  return interpolatedPanel;
}

/**
 * Interpolate variables in panel options based on panel type
 */
function interpolateOptions(options: Record<string, any>, panelType: string, context: any): Record<string, any> {
  const interpolated = { ...options };
  
  switch (panelType) {
    case 'text':
      if (interpolated.content) {
        interpolated.content = variableService.interpolate(interpolated.content, context);
      }
      break;
      
    case 'stat':
    case 'gauge':
      if (interpolated.prefix) {
        interpolated.prefix = variableService.interpolate(interpolated.prefix, context);
      }
      if (interpolated.suffix) {
        interpolated.suffix = variableService.interpolate(interpolated.suffix, context);
      }
      break;
      
    case 'table':
      // Interpolate column titles if configured
      if (interpolated.columns) {
        interpolated.columns = interpolated.columns.map(col => ({
          ...col,
          title: col.title ? variableService.interpolate(col.title, context) : col.title
        }));
      }
      break;
  }
  
  return interpolated;
}

/**
 * Get available variables for a dashboard
 */
export function getAvailableVariables(dashboard: Dashboard): Array<{ name: string; value: string; description: string }> {
  const variables: Array<{ name: string; value: string; description: string }> = [];
  
  // Add template variables
  dashboard.templating.list.forEach(variable => {
    const value = variableService.getVariableValue(variable);
    variables.push({
      name: variable.name,
      value: Array.isArray(value.value) ? value.value.join(',') : String(value.value),
      description: variable.label || variable.name
    });
  });
  
  // Add built-in variables
  variables.push(
    { name: '__interval', value: '1m', description: 'Auto interval based on time range' },
    { name: '__from', value: dashboard.time.from.toString(), description: 'Start of time range' },
    { name: '__to', value: dashboard.time.to.toString(), description: 'End of time range' },
    { name: '__timeFilter', value: 'time >= ... AND time <= ...', description: 'SQL time filter' },
    { name: '__dashboard', value: dashboard.title, description: 'Dashboard name' },
    { name: '__user', value: 'current user', description: 'Current user' },
    { name: '__org', value: 'current org', description: 'Current organization' }
  );
  
  return variables;
}

/**
 * Highlight variables in text for display
 */
export function highlightVariables(text: string): string {
  if (!text) return text;
  
  // Replace variables with highlighted version
  return text.replace(
    /(\$\{?\w+\}?|\[\[\w+\]\])/g,
    '<span class="text-blue-400 bg-blue-900 bg-opacity-30 px-1 rounded">$1</span>'
  );
}

/**
 * Extract variables from text
 */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  
  const variables = new Set<string>();
  
  // Match $varname, ${varname}, and [[varname]] patterns
  const matches = text.matchAll(/\$\{?(\w+)\}?|\[\[(\w+)\]\]/g);
  
  for (const match of matches) {
    const varName = match[1] || match[2];
    if (varName) {
      variables.add(varName);
    }
  }
  
  return Array.from(variables);
}

/**
 * Validate if a string contains valid variable syntax
 */
export function hasValidVariableSyntax(text: string): boolean {
  if (!text) return true;
  
  // Check for unclosed braces
  const openBraces = (text.match(/\$\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) return false;
  
  // Check for unclosed brackets
  const openBrackets = (text.match(/\[\[/g) || []).length;
  const closeBrackets = (text.match(/\]\]/g) || []).length;
  if (openBrackets !== closeBrackets) return false;
  
  return true;
}