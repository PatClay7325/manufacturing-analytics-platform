/**
 * Dashboard Service
 * Core service for managing dashboards with full manufacturingPlatform-like functionality
 * Adapted from manufacturingPlatform's dashboard management patterns
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

export interface DashboardPanel {
  id: number;
  key: string;
  title: string;
  type: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  datasource?: string;
  targets: any[];
  options: any;
  fieldConfig?: any;
}

export interface Dashboard {
  id?: string;
  uid: string;
  title: string;
  tags: string[];
  panels: DashboardPanel[];
  schemaVersion: number;
  version: number;
  timezone: string;
  editable: boolean;
  time: {
    from: string;
    to: string;
  };
  refresh?: string;
  templating?: {
    list: any[];
  };
  annotations?: {
    list: any[];
  };
}

export class DashboardService {
  private static instance: DashboardService;

  private constructor() {}

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  /**
   * Generate unique panel key following manufacturingPlatform pattern
   */
  generatePanelKey(panelId: number): string {
    return `panel-${panelId}-${uuidv4()}`;
  }

  /**
   * Ensure all panels have unique keys
   */
  ensurePanelKeys(panels: DashboardPanel[]): DashboardPanel[] {
    const panelMap = new Map<string, DashboardPanel>();
    
    return panels.map((panel) => {
      if (!panel.key) {
        panel.key = this.generatePanelKey(panel.id);
      }
      
      // Ensure unique key even if duplicate exists
      let key = panel.key;
      let counter = 1;
      while (panelMap.has(key)) {
        key = `${panel.key}-${counter}`;
        counter++;
      }
      
      const updatedPanel = { ...panel, key };
      panelMap.set(key, updatedPanel);
      
      // Truncate title to prevent issues
      if (updatedPanel.title) {
        updatedPanel.title = updatedPanel.title.substring(0, 5000);
      }
      
      return updatedPanel;
    });
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(dashboard: Partial<Dashboard>): Promise<Dashboard> {
    const uid = dashboard.uid || uuidv4();
    const now = new Date().toISOString();
    
    const newDashboard: Dashboard = {
      uid,
      title: dashboard.title || 'New Dashboard',
      tags: dashboard.tags || [],
      panels: this.ensurePanelKeys(dashboard.panels || []),
      schemaVersion: 30,
      version: 1,
      timezone: dashboard.timezone || 'browser',
      editable: true,
      time: dashboard.time || {
        from: 'now-6h',
        to: 'now'
      },
      refresh: dashboard.refresh || '30s',
      templating: dashboard.templating || { list: [] },
      annotations: dashboard.annotations || { list: [] }
    };

    // Save to database
    const saved = await prisma.dashboard.create({
      data: {
        id: uuidv4(),
        uid,
        title: newDashboard.title,
        slug: newDashboard.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        panels: newDashboard.panels,
        variables: newDashboard.templating?.list || [],
        time: newDashboard.time,
        refresh: newDashboard.refresh,
        tags: newDashboard.tags,
        isStarred: false,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
        version: 1,
        folderId: dashboard.folderId
      }
    });

    return { ...newDashboard, id: saved.id };
  }

  /**
   * Update existing dashboard
   */
  async updateDashboard(uid: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const existing = await prisma.dashboard.findUnique({
      where: { uid }
    });

    if (!existing) {
      throw new Error(`Dashboard with uid ${uid} not found`);
    }

    const updatedDashboard: Dashboard = {
      uid: existing.uid,
      title: updates.title || existing.title,
      tags: updates.tags || existing.tags,
      panels: updates.panels ? this.ensurePanelKeys(updates.panels) : (existing.panels as DashboardPanel[]),
      schemaVersion: 30,
      version: existing.version + 1,
      timezone: updates.timezone || 'browser',
      editable: true,
      time: updates.time || (existing.time as any),
      refresh: updates.refresh || existing.refresh || '30s',
      templating: updates.templating || { list: existing.variables || [] },
      annotations: updates.annotations || { list: [] }
    };

    const updated = await prisma.dashboard.update({
      where: { uid },
      data: {
        title: updatedDashboard.title,
        slug: updatedDashboard.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        panels: updatedDashboard.panels,
        variables: updatedDashboard.templating.list,
        time: updatedDashboard.time,
        refresh: updatedDashboard.refresh,
        tags: updatedDashboard.tags,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        version: updatedDashboard.version
      }
    });

    return { ...updatedDashboard, id: updated.id };
  }

  /**
   * Get dashboard by UID
   */
  async getDashboard(uid: string): Promise<Dashboard | null> {
    const dashboard = await prisma.dashboard.findUnique({
      where: { uid }
    });

    if (!dashboard) {
      return null;
    }

    return this.transformDashboardFromDb(dashboard);
  }

  /**
   * List all dashboards
   */
  async listDashboards(options?: {
    tags?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ dashboards: Dashboard[]; total: number }> {
    const where: any = {};

    if (options?.tags && options.tags.length > 0) {
      where.tags = {
        hasEvery: options.tags
      };
    }

    if (options?.query) {
      where.OR = [
        { title: { contains: options.query, mode: 'insensitive' } },
        { uid: { contains: options.query, mode: 'insensitive' } }
      ];
    }

    const [dashboards, total] = await Promise.all([
      prisma.dashboard.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.dashboard.count({ where })
    ]);

    return {
      dashboards: dashboards.map(d => this.transformDashboardFromDb(d)),
      total
    };
  }

  /**
   * Transform database dashboard to API format
   */
  private transformDashboardFromDb(dbDashboard: any): Dashboard {
    const panels = this.ensurePanelKeys(dbDashboard.panels as DashboardPanel[]);
    
    return {
      id: dbDashboard.id,
      uid: dbDashboard.uid,
      title: dbDashboard.title,
      tags: dbDashboard.tags,
      panels,
      schemaVersion: 30,
      version: dbDashboard.version,
      timezone: 'browser',
      editable: true,
      time: dbDashboard.time as any || { from: 'now-6h', to: 'now' },
      refresh: dbDashboard.refresh || '30s',
      templating: { list: dbDashboard.variables || [] },
      annotations: { list: [] }
    };
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(uid: string): Promise<void> {
    await prisma.dashboard.delete({
      where: { uid }
    });
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(uid: string, newTitle?: string): Promise<Dashboard> {
    const source = await this.getDashboard(uid);
    if (!source) {
      throw new Error(`Dashboard with uid ${uid} not found`);
    }

    const duplicate = {
      ...source,
      uid: uuidv4(),
      title: newTitle || `${source.title} (Copy)`,
      version: 1
    };

    delete duplicate.id;

    return this.createDashboard(duplicate);
  }

  /**
   * Export dashboard for sharing
   */
  async exportDashboard(uid: string, options?: {
    shareExternally?: boolean;
    includeVariables?: boolean;
  }): Promise<any> {
    const dashboard = await this.getDashboard(uid);
    if (!dashboard) {
      throw new Error(`Dashboard with uid ${uid} not found`);
    }

    const exported = { ...dashboard };
    
    // Remove internal fields
    delete exported.id;
    
    if (options?.shareExternally) {
      // Remove sensitive data for external sharing
      exported.editable = false;
      if (!options.includeVariables) {
        exported.templating = { list: [] };
      }
    }

    return exported;
  }

  /**
   * Import dashboard from JSON
   */
  async importDashboard(dashboardJson: any, options?: {
    overwrite?: boolean;
    folderId?: string;
  }): Promise<Dashboard> {
    const uid = dashboardJson.uid || uuidv4();
    
    if (!options?.overwrite) {
      const existing = await this.getDashboard(uid);
      if (existing) {
        throw new Error(`Dashboard with uid ${uid} already exists`);
      }
    }

    const dashboard = {
      ...dashboardJson,
      uid,
      version: 1
    };

    if (options?.overwrite && dashboardJson.uid) {
      return this.updateDashboard(dashboardJson.uid, dashboard);
    }

    return this.createDashboard(dashboard);
  }

  /**
   * Create default manufacturing dashboards
   */
  async createDefaultDashboards(): Promise<void> {
    const defaultDashboards = [
      {
        uid: 'manufacturing-overview',
        title: 'Manufacturing Overview',
        tags: ['manufacturing', 'overview'],
        panels: [
          {
            id: 1,
            key: this.generatePanelKey(1),
            title: 'Overall OEE',
            type: 'stat',
            gridPos: { x: 0, y: 0, w: 6, h: 4 },
            targets: [{ refId: 'A', metric: 'oee' }],
            options: { reduceOptions: { calcs: ['lastNotNull'] } }
          },
          {
            id: 2,
            key: this.generatePanelKey(2),
            title: 'Production Trend',
            type: 'timeseries',
            gridPos: { x: 6, y: 0, w: 18, h: 8 },
            targets: [{ refId: 'A', metric: 'production' }],
            options: {}
          }
        ]
      },
      {
        uid: 'equipment-monitoring',
        title: 'Equipment Monitoring',
        tags: ['equipment', 'monitoring'],
        panels: [
          {
            id: 1,
            key: this.generatePanelKey(1),
            title: 'Equipment Status',
            type: 'table',
            gridPos: { x: 0, y: 0, w: 24, h: 10 },
            targets: [{ refId: 'A', metric: 'equipment_status' }],
            options: {}
          }
        ]
      }
    ];

    for (const dashboard of defaultDashboards) {
      try {
        await this.createDashboard(dashboard);
      } catch (error) {
        console.log(`Dashboard ${dashboard.uid} already exists`);
      }
    }
  }
}