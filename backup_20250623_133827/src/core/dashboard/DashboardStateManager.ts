import { Dashboard, Panel, TimeRange, TemplateVariable } from '@/types/dashboard';
import { Variable } from '../variables/VariableTypes';
import { VariableManager } from '../variables/VariableManager';
import { dashboardURLSync } from './DashboardURLSync';

export interface DashboardState {
  dashboard: Dashboard;
  variables: Variable[];
  timeRange: TimeRange;
  refreshInterval: string;
  isRefreshing: boolean;
  selectedPanel?: Panel;
}

interface StateListener {
  (state: DashboardState): void;
}

/**
 * Manages the complete state of a dashboard including variables, time range, and panels
 */
export class DashboardStateManager {
  private state: DashboardState;
  private listeners = new Set<StateListener>();
  private variableManager: VariableManager;
  private refreshTimer?: NodeJS.Timeout;
  
  constructor(dashboard: Dashboard) {
    this.variableManager = new VariableManager();
    
    // Get initial state from URL
    const urlState = dashboardURLSync.getUrlState();
    
    // Initialize state with URL overrides
    this.state = {
      dashboard,
      variables: [],
      timeRange: {
        from: urlState.from || dashboard.time?.from || 'now-6h',
        to: urlState.to || dashboard.time?.to || 'now',
        raw: {
          from: urlState.from || dashboard.time?.raw?.from || 'now-6h',
          to: urlState.to || dashboard.time?.raw?.to || 'now'
        }
      },
      refreshInterval: urlState.refresh || dashboard.refresh as string || 'off',
      isRefreshing: false
    };
    
    // Initialize variables with URL values
    this.initializeVariables(urlState.variables);
    
    // Set up variable change listener
    this.variableManager.subscribe(this.handleVariableChange.bind(this));
    
    // Set up URL change listener
    dashboardURLSync.subscribe(this.handleUrlChange.bind(this));
    
    // Set up refresh timer
    this.setupRefreshTimer();
    
    // Sync initial state to URL
    this.syncToUrl();
  }
  
  /**
   * Initialize variables from dashboard configuration
   */
  private async initializeVariables(urlVariables?: Record<string, string | string[]>) {
    if (this.state.dashboard.templating?.list) {
      const variables = this.convertTemplateVariables(this.state.dashboard.templating.list);
      
      // Apply URL variable values
      if (urlVariables) {
        variables.forEach(variable => {
          const urlValue = urlVariables[variable.name];
          if (urlValue !== undefined) {
            variable.current = {
              text: Array.isArray(urlValue) ? urlValue.join(' + ') : urlValue,
              value: urlValue,
              selected: true
            };
          }
        });
      }
      
      await this.variableManager.initializeVariables(variables);
      this.state.variables = this.variableManager.getVariables();
      this.notifyListeners();
    }
  }
  
  /**
   * Convert AnalyticsPlatform template variables to our Variable type
   */
  private convertTemplateVariables(templateVars: TemplateVariable[]): Variable[] {
    return templateVars.map((tv, index) => ({
      id: tv.name,
      name: tv.name,
      type: tv.type,
      label: tv.label,
      description: tv.description,
      query: tv.query || '',
      datasource: tv.datasource,
      regex: tv.regex,
      sort: tv.sort,
      refresh: tv.refresh,
      options: tv.options || [],
      current: tv.current || { text: '', value: '', selected: false },
      multi: tv.multi,
      includeAll: tv.includeAll,
      allValue: tv.allValue,
      hide: tv.hide === 2 ? 'variable' : tv.hide === 1 ? 'label' : undefined,
      skipUrlSync: tv.skipUrlSync,
      index: index
    }));
  }
  
  /**
   * Handle variable changes
   */
  private handleVariableChange(variables: Variable[]) {
    this.state.variables = variables;
    
    // Update dashboard with new variable values
    this.updateDashboardWithVariables();
    
    // Sync to URL
    dashboardURLSync.syncVariables(variables);
    
    // Refresh panels if needed
    if (this.shouldRefreshOnVariableChange()) {
      this.refreshDashboard();
    }
    
    this.notifyListeners();
  }
  
  /**
   * Handle URL changes
   */
  private handleUrlChange(urlState: any) {
    let hasChanges = false;
    
    // Update time range if changed
    if (urlState.from && urlState.to && 
        (urlState.from !== this.state.timeRange.raw?.from || 
         urlState.to !== this.state.timeRange.raw?.to)) {
      this.state.timeRange = {
        from: urlState.from,
        to: urlState.to,
        raw: { from: urlState.from, to: urlState.to }
      };
      hasChanges = true;
      
      // Update built-in time variables
      this.variableManager.updateTimeRange(this.state.timeRange);
    }
    
    // Update refresh interval if changed
    if (urlState.refresh && urlState.refresh !== this.state.refreshInterval) {
      this.state.refreshInterval = urlState.refresh;
      this.setupRefreshTimer();
      hasChanges = true;
    }
    
    // Update variables if changed
    if (urlState.variables) {
      Object.entries(urlState.variables).forEach(([name, value]) => {
        this.variableManager.updateVariable(name, value as string | string[]);
      });
    }
    
    if (hasChanges) {
      this.notifyListeners();
    }
  }
  
  /**
   * Update dashboard panels with interpolated variables
   */
  private updateDashboardWithVariables() {
    // Don't automatically interpolate panel titles and queries in state
    // This should be done at render time to preserve the original templates
    // Just notify listeners that variables have changed
  }
  
  /**
   * Recursively interpolate all strings in an object
   */
  private interpolateObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.variableManager.interpolateQuery(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.interpolateObject(obj[key]);
        }
      }
      return result;
    }
    
    return obj;
  }
  
  /**
   * Check if dashboard should refresh when variables change
   */
  private shouldRefreshOnVariableChange(): boolean {
    return this.state.variables.some(v => 
      v.refresh === 'onTimeRangeChanged' || v.refresh === 'onDashboardLoad'
    );
  }
  
  /**
   * Sync current state to URL
   */
  private syncToUrl() {
    dashboardURLSync.syncTimeRange(this.state.timeRange, this.state.refreshInterval);
    dashboardURLSync.syncVariables(this.state.variables);
  }
  
  /**
   * Set up auto-refresh timer
   */
  private setupRefreshTimer() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    // Set up new timer if needed
    if (this.state.refreshInterval && this.state.refreshInterval !== 'off') {
      const interval = this.parseRefreshInterval(this.state.refreshInterval);
      if (interval > 0) {
        this.refreshTimer = setInterval(() => {
          this.refreshDashboard();
        }, interval);
      }
    }
  }
  
  /**
   * Parse refresh interval string to milliseconds
   */
  private parseRefreshInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }
  
  /**
   * Get current dashboard state
   */
  getState(): DashboardState {
    return { ...this.state };
  }
  
  /**
   * Update time range
   */
  setTimeRange(timeRange: TimeRange) {
    this.state.timeRange = timeRange;
    
    // Update built-in time variables
    this.variableManager.updateTimeRange(timeRange);
    
    // Sync to URL
    dashboardURLSync.syncTimeRange(timeRange, this.state.refreshInterval);
    
    // Refresh if needed
    const shouldRefresh = this.state.variables.some(v => v.refresh === 'onTimeRangeChanged');
    if (shouldRefresh) {
      this.refreshDashboard();
    }
    
    this.notifyListeners();
  }
  
  /**
   * Update refresh interval
   */
  setRefreshInterval(interval: string) {
    this.state.refreshInterval = interval;
    this.setupRefreshTimer();
    this.notifyListeners();
  }
  
  /**
   * Update a variable value
   */
  updateVariable(name: string, value: string | string[]) {
    this.variableManager.updateVariable(name, value);
  }
  
  /**
   * Get interpolated query string
   */
  interpolateQuery(query: string, scopedVars?: Record<string, any>): string {
    return this.variableManager.interpolateQuery(query, scopedVars);
  }
  
  /**
   * Refresh dashboard data
   */
  async refreshDashboard() {
    if (this.state.isRefreshing) return;
    
    this.state.isRefreshing = true;
    this.notifyListeners();
    
    try {
      // Add a small delay to ensure state changes are captured in tests
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Refresh variables that need it
      const variablesToRefresh = this.state.variables.filter(v => 
        v.type === 'query' && (v.refresh === 'onDashboardLoad' || v.refresh === 'onTimeRangeChanged')
      );
      
      for (const variable of variablesToRefresh) {
        // In a real implementation, this would query the datasource
        // For now, we'll just mark it as refreshed
        console.log(`Refreshing variable: ${variable.name}`);
      }
      
      // Trigger panel data refresh
      // This would typically emit an event that panels listen to
      console.log('Refreshing panel data...');
      
    } finally {
      this.state.isRefreshing = false;
      this.notifyListeners();
    }
  }
  
  /**
   * Select a panel
   */
  selectPanel(panel: Panel | undefined) {
    this.state.selectedPanel = panel;
    this.notifyListeners();
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.listeners.clear();
  }
}

// Export singleton instance for easy access
let instance: DashboardStateManager | null = null;

export function getDashboardStateManager(dashboard?: Dashboard): DashboardStateManager {
  if (!instance && dashboard) {
    instance = new DashboardStateManager(dashboard);
  }
  if (!instance) {
    throw new Error('DashboardStateManager not initialized');
  }
  return instance;
}

export function clearDashboardStateManager() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}