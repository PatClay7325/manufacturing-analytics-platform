/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Dashboard Engine - Core dashboard management and rendering system
 * 
 * This is the heart of the dashboard system, handling all dashboard operations
 */

import { 
  Dashboard, 
  Panel, 
  GridPos, 
  TimeRange, 
  TemplateVariable,
  DashboardMeta,
  ManufacturingDashboard,
  ManufacturingConfig
} from '@/types/dashboard';
import { DataFrame, DataSourceRequest, DataSourceResponse } from '@/types/datasource';
import { EventEmitter } from 'events';

// ============================================================================
// DASHBOARD ENGINE CLASS
// ============================================================================

export class DashboardEngine extends EventEmitter {
  private dashboards: Map<string, Dashboard> = new Map();
  private activeDashboard: Dashboard | null = null;
  private queryExecutor: QueryExecutor;
  private templateVariableResolver: TemplateVariableResolver;
  private panelRenderer: PanelRenderer;
  private dashboardStorage: DashboardStorage;
  
  constructor() {
    super();
    this.queryExecutor = new QueryExecutor();
    this.templateVariableResolver = new TemplateVariableResolver();
    this.panelRenderer = new PanelRenderer();
    this.dashboardStorage = new DashboardStorage();
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  // ============================================================================
  // DASHBOARD LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Load a dashboard by ID or UID
   */
  async loadDashboard(identifier: string): Promise<Dashboard> {
    try {
      // Try to get from cache first
      if (this.dashboards.has(identifier)) {
        const dashboard = this.dashboards.get(identifier)!;
        this.setActiveDashboard(dashboard);
        return dashboard;
      }

      // Load from storage
      const dashboardData = await this.dashboardStorage.load(identifier);
      const dashboard = this.deserializeDashboard(dashboardData);
      
      // Initialize dashboard
      await this.initializeDashboard(dashboard);
      
      // Cache and activate
      this.dashboards.set(dashboard.uid, dashboard);
      this.setActiveDashboard(dashboard);
      
      this.emit('dashboardLoaded', dashboard);
      return dashboard;
    } catch (error) {
      this.emit('dashboardLoadError', error);
      throw new Error(`Failed to load dashboard: ${error}`);
    }
  }

  /**
   * Save a dashboard
   */
  async saveDashboard(dashboard: Dashboard): Promise<Dashboard> {
    try {
      // Validate dashboard
      this.validateDashboard(dashboard);
      
      // Update version and timestamps
      dashboard.version += 1;
      dashboard.meta.updated = new Date().toISOString();
      
      // Serialize and save
      const serializedDashboard = this.serializeDashboard(dashboard);
      await this.dashboardStorage.save(dashboard.uid, serializedDashboard);
      
      // Update cache
      this.dashboards.set(dashboard.uid, dashboard);
      
      this.emit('dashboardSaved', dashboard);
      return dashboard;
    } catch (error) {
      this.emit('dashboardSaveError', error);
      throw new Error(`Failed to save dashboard: ${error}`);
    }
  }

  /**
   * Create a new dashboard
   */
  createDashboard(title: string, config?: Partial<ManufacturingConfig>): ManufacturingDashboard {
    const dashboard: ManufacturingDashboard = {
      id: this.generateId(),
      uid: this.generateUid(),
      title,
      description: '',
      tags: [],
      panels: [],
      templating: { list: [] },
      annotations: [],
      links: [],
      time: {
        from: 'now-6h',
        to: 'now'
      },
      timepicker: {
        refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
        time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
      },
      refresh: '30s',
      schemaVersion: 1,
      version: 1,
      timezone: 'browser',
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: 'monday',
      style: 'dark',
      editable: true,
      hideControls: false,
      graphTooltip: 1,
      preload: false,
      meta: {
        canSave: true,
        canEdit: true,
        canAdmin: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: 1
      },
      manufacturingConfig: {
        oeeMeasurement: true,
        qualityTracking: true,
        maintenanceAlerts: true,
        energyMonitoring: false,
        ...config
      }
    };

    // Add to dashboard cache
    this.dashboards.set(dashboard.uid, dashboard);
    this.setActiveDashboard(dashboard);
    
    this.emit('dashboardCreated', dashboard);
    return dashboard;
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(uid: string): Promise<void> {
    try {
      await this.dashboardStorage.delete(uid);
      this.dashboards.delete(uid);
      
      if (this.activeDashboard?.uid === uid) {
        this.activeDashboard = null;
      }
      
      this.emit('dashboardDeleted', uid);
    } catch (error) {
      this.emit('dashboardDeleteError', error);
      throw new Error(`Failed to delete dashboard: ${error}`);
    }
  }

  /**
   * Duplicate a dashboard
   */
  async duplicateDashboard(uid: string, newTitle?: string): Promise<Dashboard> {
    const originalDashboard = await this.loadDashboard(uid);
    const duplicatedDashboard = this.cloneDashboard(originalDashboard, newTitle);
    return await this.saveDashboard(duplicatedDashboard);
  }

  // ============================================================================
  // PANEL MANAGEMENT
  // ============================================================================

  /**
   * Add a panel to the dashboard
   */
  addPanel(dashboardUid: string, panel: Omit<Panel, 'id' | 'gridPos'>): Panel {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      console.error(`Dashboard with UID ${dashboardUid} not found in cache. Available dashboards:`, Array.from(this.dashboards.keys()));
      throw new Error(`Dashboard not found: ${dashboardUid}`);
    }

    const newPanel: Panel = {
      ...panel,
      id: this.generatePanelId(dashboard),
      gridPos: this.findOptimalPanelPosition(dashboard, panel.gridPos?.w || 12, panel.gridPos?.h || 9)
    };

    dashboard.panels.push(newPanel);
    this.emit('panelAdded', newPanel, dashboard);
    
    return newPanel;
  }

  /**
   * Update a panel
   */
  updatePanel(dashboardUid: string, panelId: number, updates: Partial<Panel>): Panel {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const panelIndex = dashboard.panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) {
      throw new Error('Panel not found');
    }

    dashboard.panels[panelIndex] = { ...dashboard.panels[panelIndex], ...updates };
    this.emit('panelUpdated', dashboard.panels[panelIndex], dashboard);
    
    return dashboard.panels[panelIndex];
  }

  /**
   * Remove a panel
   */
  removePanel(dashboardUid: string, panelId: number): void {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const panelIndex = dashboard.panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) {
      throw new Error('Panel not found');
    }

    const removedPanel = dashboard.panels.splice(panelIndex, 1)[0];
    this.emit('panelRemoved', removedPanel, dashboard);
  }

  /**
   * Move/resize a panel
   */
  updatePanelGridPos(dashboardUid: string, panelId: number, gridPos: GridPos): void {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const panel = dashboard.panels.find(p => p.id === panelId);
    if (!panel) {
      throw new Error('Panel not found');
    }

    panel.gridPos = gridPos;
    this.emit('panelMoved', panel, dashboard);
  }

  // ============================================================================
  // QUERY EXECUTION AND DATA MANAGEMENT
  // ============================================================================

  /**
   * Execute queries for all panels in a dashboard
   */
  async refreshDashboard(dashboardUid?: string): Promise<void> {
    const dashboard = dashboardUid ? this.dashboards.get(dashboardUid) : this.activeDashboard;
    if (!dashboard) {
      throw new Error('No dashboard to refresh');
    }

    try {
      this.emit('dashboardRefreshStarted', dashboard);
      
      // Resolve template variables first
      await this.templateVariableResolver.resolveAll(dashboard);
      
      // Execute queries for all panels in parallel
      const queryPromises = dashboard.panels.map(panel => 
        this.refreshPanel(dashboard, panel.id)
      );
      
      await Promise.allSettled(queryPromises);
      
      this.emit('dashboardRefreshCompleted', dashboard);
    } catch (error) {
      this.emit('dashboardRefreshError', error, dashboard);
      throw error;
    }
  }

  /**
   * Refresh a specific panel
   */
  async refreshPanel(dashboard: Dashboard, panelId: number): Promise<DataFrame[]> {
    const panel = dashboard.panels.find(p => p.id === panelId);
    if (!panel) {
      throw new Error('Panel not found');
    }

    try {
      this.emit('panelRefreshStarted', panel, dashboard);
      
      // Execute panel queries
      const results = await this.queryExecutor.executeQueries(
        panel.targets,
        dashboard.time,
        dashboard.templating.list,
        {
          maxDataPoints: panel.maxDataPoints,
          interval: panel.interval,
          panelId: panel.id,
          dashboardId: dashboard.uid
        }
      );
      
      this.emit('panelRefreshCompleted', panel, results, dashboard);
      return results;
    } catch (error) {
      this.emit('panelRefreshError', panel, error, dashboard);
      throw error;
    }
  }

  // ============================================================================
  // TEMPLATE VARIABLE MANAGEMENT
  // ============================================================================

  /**
   * Add a template variable
   */
  addTemplateVariable(dashboardUid: string, variable: TemplateVariable): void {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    dashboard.templating.list.push(variable);
    this.emit('templateVariableAdded', variable, dashboard);
  }

  /**
   * Update a template variable
   */
  updateTemplateVariable(dashboardUid: string, variableName: string, updates: Partial<TemplateVariable>): void {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const variableIndex = dashboard.templating.list.findIndex(v => v.name === variableName);
    if (variableIndex === -1) {
      throw new Error('Template variable not found');
    }

    dashboard.templating.list[variableIndex] = { 
      ...dashboard.templating.list[variableIndex], 
      ...updates 
    };
    
    this.emit('templateVariableUpdated', dashboard.templating.list[variableIndex], dashboard);
  }

  /**
   * Update template variable value
   */
  async setTemplateVariableValue(dashboardUid: string, variableName: string, value: any): Promise<void> {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const variable = dashboard.templating.list.find(v => v.name === variableName);
    if (!variable) {
      throw new Error('Template variable not found');
    }

    await this.templateVariableResolver.setValue(variable, value);
    
    // Refresh panels that depend on this variable
    await this.refreshDependentPanels(dashboard, variableName);
    
    this.emit('templateVariableValueChanged', variable, dashboard);
  }

  // ============================================================================
  // TIME RANGE MANAGEMENT
  // ============================================================================

  /**
   * Update dashboard time range
   */
  async setTimeRange(dashboardUid: string, timeRange: TimeRange): Promise<void> {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    dashboard.time = timeRange;
    
    // Refresh all panels with new time range
    await this.refreshDashboard(dashboardUid);
    
    this.emit('timeRangeChanged', timeRange, dashboard);
  }

  /**
   * Set auto-refresh interval
   */
  setRefreshInterval(dashboardUid: string, interval: string): void {
    const dashboard = this.dashboards.get(dashboardUid);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    dashboard.refresh = interval;
    this.emit('refreshIntervalChanged', interval, dashboard);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get the currently active dashboard
   */
  getActiveDashboard(): Dashboard | null {
    return this.activeDashboard;
  }

  /**
   * Set the active dashboard
   */
  private setActiveDashboard(dashboard: Dashboard): void {
    this.activeDashboard = dashboard;
    this.emit('activeDashboardChanged', dashboard);
  }

  /**
   * Get all loaded dashboards
   */
  getLoadedDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Search dashboards
   */
  async searchDashboards(query: string, tags?: string[]): Promise<Dashboard[]> {
    return await this.dashboardStorage.search(query, tags);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async initializeDashboard(dashboard: Dashboard): Promise<void> {
    // Initialize template variables
    await this.templateVariableResolver.initialize(dashboard.templating.list);
    
    // Set up auto-refresh if enabled
    if (dashboard.refresh && dashboard.refresh !== false) {
      this.setupAutoRefresh(dashboard);
    }
  }

  private setupAutoRefresh(dashboard: Dashboard): void {
    if (typeof dashboard.refresh === 'string') {
      const interval = this.parseRefreshInterval(dashboard.refresh);
      if (interval > 0) {
        setInterval(() => {
          if (this.activeDashboard?.uid === dashboard.uid) {
            this.refreshDashboard(dashboard.uid);
          }
        }, interval);
      }
    }
  }

  private parseRefreshInterval(refresh: string): number {
    const match = refresh.match(/^(\d+)([smhd])$/);
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

  private validateDashboard(dashboard: Dashboard): void {
    if (!dashboard.title) {
      throw new Error('Dashboard title is required');
    }
    
    if (!dashboard.uid) {
      throw new Error('Dashboard UID is required');
    }
    
    // Validate panels
    dashboard.panels.forEach((panel, index) => {
      if (!panel.id) {
        throw new Error(`Panel at index ${index} is missing an ID`);
      }
      
      if (!panel.type) {
        throw new Error(`Panel ${panel.id} is missing a type`);
      }
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateUid(): string {
    return 'af_' + Math.random().toString(36).substr(2, 16);
  }

  private generatePanelId(dashboard: Dashboard): number {
    const existingIds = dashboard.panels.map(p => p.id);
    let id = 1;
    while (existingIds.includes(id)) {
      id++;
    }
    return id;
  }

  private findOptimalPanelPosition(dashboard: Dashboard, width: number, height: number): GridPos {
    // Simple grid placement algorithm
    const gridWidth = 24;
    let x = 0;
    let y = 0;
    
    // Find the lowest available position
    for (let row = 0; row < 100; row++) {
      for (let col = 0; col <= gridWidth - width; col++) {
        const position = { x: col, y: row * height, w: width, h: height };
        if (!this.isPositionOccupied(dashboard, position)) {
          return position;
        }
      }
    }
    
    // Fallback to bottom
    const maxY = Math.max(0, ...dashboard.panels.map(p => p.gridPos.y + p.gridPos.h));
    return { x: 0, y: maxY, w: width, h: height };
  }

  private isPositionOccupied(dashboard: Dashboard, position: GridPos): boolean {
    return dashboard.panels.some(panel => {
      const p = panel.gridPos;
      return !(
        position.x >= p.x + p.w ||
        position.x + position.w <= p.x ||
        position.y >= p.y + p.h ||
        position.y + position.h <= p.y
      );
    });
  }

  private cloneDashboard(dashboard: Dashboard, newTitle?: string): Dashboard {
    const cloned = JSON.parse(JSON.stringify(dashboard)) as Dashboard;
    cloned.id = this.generateId();
    cloned.uid = this.generateUid();
    cloned.title = newTitle || `${dashboard.title} - Copy`;
    cloned.version = 1;
    cloned.meta = {
      ...cloned.meta,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: 1
    };
    
    return cloned;
  }

  private serializeDashboard(dashboard: Dashboard): string {
    return JSON.stringify(dashboard, null, 2);
  }

  private deserializeDashboard(data: string): Dashboard {
    return JSON.parse(data) as Dashboard;
  }

  private async refreshDependentPanels(dashboard: Dashboard, variableName: string): Promise<void> {
    const dependentPanels = dashboard.panels.filter(panel =>
      panel.targets.some(target =>
        JSON.stringify(target).includes(`$${variableName}`)
      )
    );

    const refreshPromises = dependentPanels.map(panel =>
      this.refreshPanel(dashboard, panel.id)
    );

    await Promise.allSettled(refreshPromises);
  }

  private setupEventHandlers(): void {
    // Set up internal event handlers for coordinating dashboard operations
    this.on('templateVariableValueChanged', async (variable, dashboard) => {
      // Auto-refresh panels that use this variable
      await this.refreshDependentPanels(dashboard, variable.name);
    });
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

class QueryExecutor {
  async executeQueries(
    targets: any[],
    timeRange: TimeRange,
    variables: TemplateVariable[],
    options: any
  ): Promise<DataFrame[]> {
    // Implementation for executing data source queries
    // This will be implemented with the data source system
    return [];
  }
}

class TemplateVariableResolver {
  async initialize(variables: TemplateVariable[]): Promise<void> {
    // Initialize all template variables
  }

  async resolveAll(dashboard: Dashboard): Promise<void> {
    // Resolve all template variables for the dashboard
  }

  async setValue(variable: TemplateVariable, value: any): Promise<void> {
    // Set a template variable value
  }
}

class PanelRenderer {
  // Panel rendering logic will be implemented with the panel system
}

class DashboardStorage {
  private storage: Map<string, string> = new Map();
  
  constructor() {
    // Initialize with some default dashboards
    this.initializeDefaultDashboards();
  }

  async load(identifier: string): Promise<string> {
    const data = this.storage.get(identifier);
    if (!data) {
      throw new Error(`Dashboard ${identifier} not found`);
    }
    return data;
  }

  async save(uid: string, data: string): Promise<void> {
    this.storage.set(uid, data);
    // In production, this would save to a database
  }

  async delete(uid: string): Promise<void> {
    this.storage.delete(uid);
    // In production, this would delete from a database
  }

  async search(query: string = '', tags?: string[]): Promise<Dashboard[]> {
    const dashboards: Dashboard[] = [];
    
    for (const [uid, data] of this.storage.entries()) {
      try {
        const dashboard = JSON.parse(data) as Dashboard;
        
        // Filter by query
        if (query) {
          const searchLower = query.toLowerCase();
          const matchesQuery = 
            dashboard.title.toLowerCase().includes(searchLower) ||
            dashboard.description?.toLowerCase().includes(searchLower) ||
            dashboard.tags.some(tag => tag.toLowerCase().includes(searchLower));
          
          if (!matchesQuery) continue;
        }
        
        // Filter by tags
        if (tags && tags.length > 0) {
          const hasAllTags = tags.every(tag => dashboard.tags.includes(tag));
          if (!hasAllTags) continue;
        }
        
        dashboards.push(dashboard);
      } catch (error) {
        console.error(`Error parsing dashboard ${uid}:`, error);
      }
    }
    
    // Sort by updated date, most recent first
    dashboards.sort((a, b) => {
      const dateA = new Date(a.meta?.updated || 0).getTime();
      const dateB = new Date(b.meta?.updated || 0).getTime();
      return dateB - dateA;
    });
    
    return dashboards;
  }
  
  private initializeDefaultDashboards() {
    // Manufacturing Overview Dashboard
    const manufacturingOverview: Dashboard = {
      uid: 'manufacturing-overview',
      title: 'Manufacturing Overview',
      description: 'Real-time overview of manufacturing operations',
      tags: ['manufacturing', 'oee', 'production'],
      version: 1,
      schemaVersion: 21,
      time: { from: 'now-6h', to: 'now' },
      refresh: '30s',
      panels: [
        {
          id: 1,
          type: 'gauge',
          title: 'Overall Equipment Effectiveness',
          gridPos: { x: 0, y: 0, w: 8, h: 8 },
          targets: [],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 65, color: 'yellow' },
                  { value: 85, color: 'green' }
                ]
              }
            },
            overrides: []
          },
          options: {}
        },
        {
          id: 2,
          type: 'timeseries',
          title: 'Production Rate',
          gridPos: { x: 8, y: 0, w: 16, h: 8 },
          targets: [],
          fieldConfig: {
            defaults: { unit: 'short' },
            overrides: []
          },
          options: {}
        }
      ],
      templating: { list: [] },
      annotations: { list: [] },
      links: [],
      meta: {
        created: '2024-01-15T10:00:00Z',
        updated: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
        version: 1
      }
    };
    
    // Quality Dashboard
    const qualityDashboard: Dashboard = {
      uid: 'quality-dashboard',
      title: 'Quality Control Dashboard',
      description: 'Monitor quality metrics and defect rates',
      tags: ['quality', 'spc', 'defects'],
      version: 1,
      schemaVersion: 21,
      time: { from: 'now-24h', to: 'now' },
      refresh: '1m',
      panels: [
        {
          id: 1,
          type: 'stat',
          title: 'First Pass Yield',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 1 },
            overrides: []
          },
          options: {}
        },
        {
          id: 2,
          type: 'barchart',
          title: 'Defect Pareto',
          gridPos: { x: 6, y: 0, w: 18, h: 8 },
          targets: [],
          fieldConfig: { defaults: {}, overrides: [] },
          options: {}
        }
      ],
      templating: { list: [] },
      annotations: { list: [] },
      links: [],
      meta: {
        created: '2024-01-14T09:00:00Z',
        updated: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
        version: 1
      }
    };
    
    // Energy Dashboard
    const energyDashboard: Dashboard = {
      uid: 'energy-monitoring',
      title: 'Energy Monitoring',
      description: 'Track energy consumption and efficiency',
      tags: ['energy', 'sustainability', 'iso50001'],
      version: 1,
      schemaVersion: 21,
      time: { from: 'now-7d', to: 'now' },
      refresh: '5m',
      panels: [
        {
          id: 1,
          type: 'timeseries',
          title: 'Energy Consumption',
          gridPos: { x: 0, y: 0, w: 24, h: 8 },
          targets: [],
          fieldConfig: {
            defaults: { unit: 'kwatth' },
            overrides: []
          },
          options: {}
        }
      ],
      templating: { list: [] },
      annotations: { list: [] },
      links: [],
      meta: {
        created: '2024-01-10T08:00:00Z',
        updated: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
        version: 1
      }
    };
    
    // Save default dashboards
    this.storage.set('manufacturing-overview', JSON.stringify(manufacturingOverview));
    this.storage.set('quality-dashboard', JSON.stringify(qualityDashboard));
    this.storage.set('energy-monitoring', JSON.stringify(energyDashboard));
  }
}

// Export the engine as a singleton
export const dashboardEngine = new DashboardEngine();
export default DashboardEngine;