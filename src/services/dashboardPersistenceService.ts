/**
 * Dashboard Persistence Service - Complete CRUD operations for dashboards
 * Handles saving, loading, versioning, and sharing of Grafana-style dashboards
 */

import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

export interface DashboardConfig {
  id?: string;
  uid?: string;
  title: string;
  slug?: string;
  description?: string;
  tags: string[];
  panels: any[];
  variables?: any[];
  time?: {
    from: string;
    to: string;
  };
  timepicker?: any;
  refresh?: string;
  schemaVersion: number;
  version?: number;
  timezone?: string;
  editable?: boolean;
  hideControls?: boolean;
  sharedCrosshair?: boolean;
  folderId?: string;
  isStarred?: boolean;
  isPublic?: boolean;
}

export interface DashboardMeta {
  id: string;
  uid: string;
  title: string;
  slug: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  folderId?: string;
  isStarred: boolean;
  isPublic: boolean;
  tags: string[];
}

export interface SaveDashboardRequest {
  dashboard: DashboardConfig;
  message?: string;
  overwrite?: boolean;
  userId?: string;
  folderId?: string;
}

export interface SaveDashboardResponse {
  id: string;
  uid: string;
  url: string;
  status: 'success' | 'version-mismatch' | 'name-exists' | 'plugin-dashboard';
  version: number;
  slug: string;
}

export interface DashboardSearchRequest {
  query?: string;
  tag?: string[];
  starred?: boolean;
  folderId?: string;
  type?: 'dash-db' | 'dash-folder';
  limit?: number;
  page?: number;
}

export interface DashboardSearchResult {
  id: string;
  uid: string;
  title: string;
  slug: string;
  tags: string[];
  isStarred: boolean;
  folderId?: string;
  folderTitle?: string;
  url: string;
  type: 'dash-db';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DashboardPersistenceService {
  /**
   * Save or update a dashboard
   */
  async saveDashboard(request: SaveDashboardRequest): Promise<SaveDashboardResponse> {
    const { dashboard, message, overwrite = true, userId, folderId } = request;
    
    try {
      // Generate UID if not provided
      const uid = dashboard.uid || nanoid(9);
      
      // Generate slug from title
      const slug = this.generateSlug(dashboard.title);
      
      // Check if dashboard with this slug already exists
      const existingBySlug = await prisma.dashboard.findUnique({
        where: { slug },
      });

      if (existingBySlug && existingBySlug.uid !== uid && !overwrite) {
        return {
          id: '',
          uid: '',
          url: '',
          status: 'name-exists',
          version: 0,
          slug: '',
        };
      }

      // Check if we're updating an existing dashboard
      let existingDashboard = null;
      if (dashboard.uid) {
        existingDashboard = await prisma.dashboard.findUnique({
          where: { uid: dashboard.uid },
        });
      }

      const dashboardData = {
        uid,
        title: dashboard.title,
        slug,
        panels: dashboard.panels as any,
        variables: dashboard.variables as any,
        time: dashboard.time as any,
        refresh: dashboard.refresh,
        tags: dashboard.tags,
        isPublic: dashboard.isPublic || false,
        folderId: folderId || dashboard.folderId,
        updatedAt: new Date(),
      };

      let savedDashboard;

      if (existingDashboard) {
        // Update existing dashboard
        savedDashboard = await prisma.dashboard.update({
          where: { uid },
          data: {
            ...dashboardData,
            version: existingDashboard.version + 1,
            updatedBy: userId,
          },
        });
      } else {
        // Create new dashboard
        savedDashboard = await prisma.dashboard.create({
          data: {
            id: nanoid(),
            ...dashboardData,
            version: 1,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      return {
        id: savedDashboard.id,
        uid: savedDashboard.uid,
        url: `/dashboards/d/${savedDashboard.uid}/${savedDashboard.slug}`,
        status: 'success',
        version: savedDashboard.version,
        slug: savedDashboard.slug,
      };
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      throw new Error(`Failed to save dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load dashboard by UID
   */
  async getDashboard(uid: string): Promise<DashboardConfig | null> {
    try {
      const dashboard = await prisma.dashboard.findUnique({
        where: { uid },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          },
          Folder: {
            select: { id: true, name: true }
          }
        }
      });

      if (!dashboard) {
        return null;
      }

      return {
        id: dashboard.id,
        uid: dashboard.uid,
        title: dashboard.title,
        slug: dashboard.slug,
        tags: dashboard.tags,
        panels: dashboard.panels as any[],
        variables: dashboard.variables as any[],
        time: dashboard.time as any,
        refresh: dashboard.refresh || undefined,
        schemaVersion: 36, // Current Grafana schema version
        version: dashboard.version,
        timezone: 'browser',
        editable: true,
        folderId: dashboard.folderId || undefined,
        isStarred: dashboard.isStarred,
        isPublic: dashboard.isPublic,
      };
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      throw new Error(`Failed to load dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search dashboards
   */
  async searchDashboards(request: DashboardSearchRequest): Promise<DashboardSearchResult[]> {
    const { query, tag, starred, folderId, limit = 50, page = 1 } = request;
    
    try {
      const where: any = {};
      
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ];
      }
      
      if (tag && tag.length > 0) {
        where.tags = { hasSome: tag };
      }
      
      if (starred !== undefined) {
        where.isStarred = starred;
      }
      
      if (folderId !== undefined) {
        where.folderId = folderId;
      }

      const dashboards = await prisma.dashboard.findMany({
        where,
        include: {
          Folder: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      });

      return dashboards.map(dashboard => ({
        id: dashboard.id,
        uid: dashboard.uid,
        title: dashboard.title,
        slug: dashboard.slug,
        tags: dashboard.tags,
        isStarred: dashboard.isStarred,
        folderId: dashboard.folderId || undefined,
        folderTitle: dashboard.Folder?.name,
        url: `/dashboards/d/${dashboard.uid}/${dashboard.slug}`,
        type: 'dash-db' as const,
        version: dashboard.version,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to search dashboards:', error);
      throw new Error(`Failed to search dashboards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(uid: string, userId?: string): Promise<void> {
    try {
      await prisma.dashboard.delete({
        where: { uid },
      });
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      throw new Error(`Failed to delete dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Star/unstar dashboard
   */
  async starDashboard(uid: string, starred: boolean, userId?: string): Promise<void> {
    try {
      await prisma.dashboard.update({
        where: { uid },
        data: { isStarred: starred },
      });
    } catch (error) {
      console.error('Failed to star/unstar dashboard:', error);
      throw new Error(`Failed to update dashboard star status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dashboard metadata
   */
  async getDashboardMeta(uid: string): Promise<DashboardMeta | null> {
    try {
      const dashboard = await prisma.dashboard.findUnique({
        where: { uid },
        select: {
          id: true,
          uid: true,
          title: true,
          slug: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          folderId: true,
          isStarred: true,
          isPublic: true,
          tags: true,
        },
      });

      return dashboard;
    } catch (error) {
      console.error('Failed to get dashboard metadata:', error);
      throw new Error(`Failed to get dashboard metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import dashboard
   */
  async importDashboard(
    dashboardJson: any, 
    options: { 
      overwrite?: boolean; 
      folderId?: string; 
      userId?: string 
    } = {}
  ): Promise<SaveDashboardResponse> {
    const { overwrite = false, folderId, userId } = options;

    try {
      // Parse dashboard JSON
      const dashboard: DashboardConfig = {
        title: dashboardJson.title || 'Imported Dashboard',
        tags: dashboardJson.tags || [],
        panels: dashboardJson.panels || [],
        variables: dashboardJson.templating?.list || dashboardJson.variables || [],
        time: dashboardJson.time,
        refresh: dashboardJson.refresh,
        schemaVersion: dashboardJson.schemaVersion || 36,
        timezone: dashboardJson.timezone || 'browser',
        editable: dashboardJson.editable !== false,
        folderId,
      };

      return await this.saveDashboard({
        dashboard,
        message: 'Dashboard imported',
        overwrite,
        userId,
        folderId,
      });
    } catch (error) {
      console.error('Failed to import dashboard:', error);
      throw new Error(`Failed to import dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export dashboard
   */
  async exportDashboard(uid: string): Promise<any> {
    try {
      const dashboard = await this.getDashboard(uid);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Create exportable dashboard JSON
      const exportData = {
        __inputs: [],
        __elements: {},
        __requires: [],
        annotations: {
          list: [],
        },
        description: '',
        editable: dashboard.editable,
        fiscalYearStartMonth: 0,
        graphTooltip: 0,
        id: null, // Remove ID for import
        links: [],
        liveNow: false,
        panels: dashboard.panels,
        refresh: dashboard.refresh,
        schemaVersion: dashboard.schemaVersion,
        style: 'dark',
        tags: dashboard.tags,
        templating: {
          list: dashboard.variables || [],
        },
        time: dashboard.time,
        timepicker: {},
        timezone: dashboard.timezone,
        title: dashboard.title,
        uid: dashboard.uid,
        version: dashboard.version,
        weekStart: '',
      };

      return exportData;
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      throw new Error(`Failed to export dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent dashboards
   */
  async getRecentDashboards(userId?: string, limit: number = 10): Promise<DashboardSearchResult[]> {
    try {
      const where: any = {};
      if (userId) {
        where.OR = [
          { createdBy: userId },
          { updatedBy: userId },
        ];
      }

      const dashboards = await prisma.dashboard.findMany({
        where,
        include: {
          Folder: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return dashboards.map(dashboard => ({
        id: dashboard.id,
        uid: dashboard.uid,
        title: dashboard.title,
        slug: dashboard.slug,
        tags: dashboard.tags,
        isStarred: dashboard.isStarred,
        folderId: dashboard.folderId || undefined,
        folderTitle: dashboard.Folder?.name,
        url: `/dashboards/d/${dashboard.uid}/${dashboard.slug}`,
        type: 'dash-db' as const,
        version: dashboard.version,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to get recent dashboards:', error);
      throw new Error(`Failed to get recent dashboards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .slice(0, 50); // Limit length
  }

  /**
   * Initialize with sample dashboards
   */
  async initializeSampleDashboards(): Promise<void> {
    try {
      // Check if we already have dashboards
      const existingCount = await prisma.dashboard.count();
      if (existingCount > 0) {
        console.log('Sample dashboards already exist, skipping initialization');
        return;
      }

      // Create sample manufacturing dashboards
      const sampleDashboards = [
        {
          title: 'Manufacturing Overview',
          tags: ['manufacturing', 'overview', 'production'],
          panels: [
            {
              id: 1,
              title: 'Production Rate',
              type: 'timeseries',
              gridPos: { x: 0, y: 0, w: 12, h: 8 },
              targets: [{ expr: 'production_rate_pph', refId: 'A' }],
            },
            {
              id: 2,
              title: 'OEE',
              type: 'stat',
              gridPos: { x: 12, y: 0, w: 12, h: 8 },
              targets: [{ expr: 'oee_percentage', refId: 'A' }],
            },
          ],
          variables: [
            {
              name: 'plant',
              type: 'custom',
              query: 'North:north,South:south,East:east',
              current: { text: 'North', value: 'north' },
            },
          ],
          time: { from: 'now-6h', to: 'now' },
          refresh: '30s',
        },
        {
          title: 'Equipment Health Dashboard',
          tags: ['equipment', 'health', 'monitoring'],
          panels: [
            {
              id: 1,
              title: 'Temperature',
              type: 'timeseries',
              gridPos: { x: 0, y: 0, w: 24, h: 8 },
              targets: [{ expr: 'equipment_temperature_celsius', refId: 'A' }],
            },
            {
              id: 2,
              title: 'Vibration',
              type: 'timeseries',
              gridPos: { x: 0, y: 8, w: 24, h: 8 },
              targets: [{ expr: 'vibration_rms', refId: 'A' }],
            },
          ],
          time: { from: 'now-24h', to: 'now' },
          refresh: '1m',
        },
      ];

      for (const dashboardData of sampleDashboards) {
        await this.saveDashboard({
          dashboard: {
            ...dashboardData,
            schemaVersion: 36,
            timezone: 'browser',
            editable: true,
          },
          message: 'Sample dashboard created',
        });
      }

      console.log(`Created ${sampleDashboards.length} sample dashboards`);
    } catch (error) {
      console.error('Failed to initialize sample dashboards:', error);
    }
  }
}

// Export singleton instance
export const dashboardPersistenceService = new DashboardPersistenceService();