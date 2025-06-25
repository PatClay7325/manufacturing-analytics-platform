/**
 * Plugin Service - Handles plugin marketplace operations and plugin management
 */

import { PrismaClient } from '@prisma/client';
import { cache } from 'react';
import crypto from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const pluginSearchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['panel', 'datasource', 'app', 'all']).optional(),
  category: z.string().optional(),
  sort: z.enum(['downloads', 'rating', 'name', 'updated']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  installed: z.boolean().optional(),
  signature: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const pluginInstallSchema = z.object({
  pluginId: z.string(),
  version: z.string().optional(),
  organizationId: z.string().optional(),
  userId: z.string(),
});

export type PluginSearchParams = z.infer<typeof pluginSearchSchema>;
export type PluginInstallParams = z.infer<typeof pluginInstallSchema>;

export interface PluginWithStats {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  type: string;
  category: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  installed: boolean;
  enabled: boolean;
  updateAvailable: boolean;
  signature: string;
  logoUrl?: string;
  screenshots?: any;
}

class PluginService {
  /**
   * Search plugins in the marketplace
   */
  async searchPlugins(params: PluginSearchParams, userId?: string): Promise<{
    plugins: PluginWithStats[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      query = '',
      type = 'all',
      category,
      sort = 'downloads',
      order = 'desc',
      installed,
      signature,
      page = 1,
      limit = 20,
    } = params;

    // Build where clause
    const where: any = {
      status: 'active',
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query } },
      ];
    }

    if (type !== 'all') {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (signature) {
      where.signature = signature;
    }

    // Build order by
    const orderBy: any = {};
    switch (sort) {
      case 'downloads':
        orderBy.downloads = order;
        break;
      case 'rating':
        orderBy.rating = order;
        break;
      case 'name':
        orderBy.name = order;
        break;
      case 'updated':
        orderBy.updatedAt = order;
        break;
    }

    // Get total count
    const total = await prisma.plugin.count({ where });

    // Get plugins with installation status
    const plugins = await prisma.plugin.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        installations: userId ? {
          where: {
            OR: [
              { userId },
              { organizationId: { not: null } }
            ]
          },
          include: {
            version: true,
          }
        } : false,
        versions: {
          where: { status: 'stable' },
          orderBy: { releasedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Transform to include installation status
    const pluginsWithStats: PluginWithStats[] = plugins.map(plugin => {
      const installation = plugin.installations?.[0];
      const latestVersion = plugin.versions[0];
      
      return {
        id: plugin.id,
        pluginId: plugin.pluginId,
        name: plugin.name,
        description: plugin.description,
        type: plugin.type,
        category: plugin.category,
        author: plugin.author,
        version: plugin.latestVersion,
        downloads: plugin.downloads,
        rating: plugin.rating,
        ratingCount: plugin.ratingCount,
        installed: !!installation,
        enabled: installation?.enabled ?? false,
        updateAvailable: installation ? 
          (latestVersion?.version !== installation.version.version) : false,
        signature: plugin.signature,
        logoUrl: plugin.logoUrl ?? undefined,
        screenshots: plugin.screenshots,
      };
    });

    // Filter by installed if specified
    const filteredPlugins = installed !== undefined
      ? pluginsWithStats.filter(p => p.installed === installed)
      : pluginsWithStats;

    return {
      plugins: filteredPlugins,
      total,
      page,
      limit,
    };
  }

  /**
   * Get plugin details by ID
   */
  async getPluginDetails(pluginId: string, userId?: string) {
    const plugin = await prisma.plugin.findUnique({
      where: { pluginId },
      include: {
        versions: {
          orderBy: { releasedAt: 'desc' },
          take: 10,
        },
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        installations: userId ? {
          where: {
            OR: [
              { userId },
              { organizationId: { not: null } }
            ]
          },
          include: {
            version: true,
            configuration: true,
          },
        } : false,
      },
    });

    if (!plugin) {
      throw new Error('Plugin not found');
    }

    return plugin;
  }

  /**
   * Install a plugin
   */
  async installPlugin(params: PluginInstallParams) {
    const { pluginId, version, organizationId, userId } = params;

    // Get plugin and version
    const plugin = await prisma.plugin.findUnique({
      where: { pluginId },
      include: {
        versions: version ? {
          where: { version },
        } : {
          where: { status: 'stable' },
          orderBy: { releasedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!plugin) {
      throw new Error('Plugin not found');
    }

    const pluginVersion = plugin.versions[0];
    if (!pluginVersion) {
      throw new Error('No suitable version found');
    }

    // Check if already installed
    const existing = await prisma.pluginInstallation.findFirst({
      where: {
        pluginId: plugin.id,
        OR: [
          { userId },
          { organizationId }
        ],
      },
    });

    if (existing) {
      throw new Error('Plugin already installed');
    }

    // Verify plugin signature if required
    if (plugin.signature === 'commercial' && plugin.isPaid) {
      // TODO: Verify payment/license
    }

    // Create installation
    const installation = await prisma.pluginInstallation.create({
      data: {
        pluginId: plugin.id,
        versionId: pluginVersion.id,
        userId: organizationId ? undefined : userId,
        organizationId,
        installedBy: userId,
        installPath: `/plugins/${plugin.pluginId}/${pluginVersion.version}`,
        status: 'active',
      },
      include: {
        plugin: true,
        version: true,
      },
    });

    // Create default configuration
    await prisma.pluginConfiguration.create({
      data: {
        installationId: installation.id,
        pluginId: plugin.id,
        jsonData: {},
        allowedRoles: ['admin', 'editor', 'viewer'],
      },
    });

    // Update download count
    await prisma.plugin.update({
      where: { id: plugin.id },
      data: { downloads: { increment: 1 } },
    });

    // TODO: Trigger actual plugin download and installation
    await this.downloadAndInstallPlugin(plugin, pluginVersion, installation);

    return installation;
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string, userId: string, organizationId?: string) {
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        plugin: { pluginId },
        OR: [
          { userId },
          { organizationId }
        ],
      },
    });

    if (!installation) {
      throw new Error('Plugin not installed');
    }

    // Delete installation and configuration (cascade)
    await prisma.pluginInstallation.delete({
      where: { id: installation.id },
    });

    // TODO: Clean up plugin files
    await this.cleanupPluginFiles(installation);

    return { success: true };
  }

  /**
   * Get plugin configuration
   */
  async getPluginConfig(
    pluginId: string,
    userId: string,
    organizationId?: string
  ) {
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        plugin: { pluginId },
        OR: [
          { userId },
          { organizationId }
        ],
      },
      include: {
        configuration: true,
      },
    });

    if (!installation) {
      throw new Error('Plugin not installed');
    }

    return installation.configuration;
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string,
    userId: string,
    config: any,
    organizationId?: string
  ) {
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        plugin: { pluginId },
        OR: [
          { userId },
          { organizationId }
        ],
      },
      include: {
        configuration: true,
      },
    });

    if (!installation) {
      throw new Error('Plugin not installed');
    }

    if (!installation.configuration) {
      throw new Error('Plugin configuration not found');
    }

    const updated = await prisma.pluginConfiguration.update({
      where: { id: installation.configuration.id },
      data: {
        jsonData: config.jsonData || installation.configuration.jsonData,
        secureJsonData: config.secureJsonData,
        enabled: config.enabled ?? installation.configuration.enabled,
        allowedRoles: config.allowedRoles || installation.configuration.allowedRoles,
        maxInstances: config.maxInstances,
        maxQueries: config.maxQueries,
        maxDataPoints: config.maxDataPoints,
      },
    });

    return updated;
  }

  /**
   * Enable/disable plugin
   */
  async togglePlugin(pluginId: string, userId: string, enabled: boolean, organizationId?: string) {
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        plugin: { pluginId },
        OR: [
          { userId },
          { organizationId }
        ],
      },
    });

    if (!installation) {
      throw new Error('Plugin not installed');
    }

    const updated = await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { enabled },
    });

    return updated;
  }

  /**
   * Rate a plugin
   */
  async ratePlugin(pluginId: string, userId: string, rating: number, review?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const plugin = await prisma.plugin.findUnique({
      where: { pluginId },
    });

    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Create or update rating
    const existingRating = await prisma.pluginRating.findUnique({
      where: {
        pluginId_userId: {
          pluginId: plugin.id,
          userId,
        },
      },
    });

    if (existingRating) {
      await prisma.pluginRating.update({
        where: { id: existingRating.id },
        data: { rating, review },
      });
    } else {
      await prisma.pluginRating.create({
        data: {
          pluginId: plugin.id,
          userId,
          rating,
          review,
          version: plugin.latestVersion,
        },
      });
    }

    // Update plugin rating
    await this.updatePluginRating(plugin.id);

    return { success: true };
  }

  /**
   * Get plugin categories
   */
  async getCategories() {
    const categories = await prisma.plugin.findMany({
      where: { status: 'active' },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map(c => c.category).sort();
  }

  /**
   * Check for plugin updates
   */
  async checkForUpdates(userId: string, organizationId?: string) {
    const installations = await prisma.pluginInstallation.findMany({
      where: {
        OR: [
          { userId },
          { organizationId }
        ],
      },
      include: {
        plugin: {
          include: {
            versions: {
              where: { status: 'stable' },
              orderBy: { releasedAt: 'desc' },
              take: 1,
            },
          },
        },
        version: true,
      },
    });

    const updates = installations
      .filter(installation => {
        const latestVersion = installation.plugin.versions[0];
        return latestVersion && 
          latestVersion.version !== installation.version.version;
      })
      .map(installation => ({
        pluginId: installation.plugin.pluginId,
        pluginName: installation.plugin.name,
        currentVersion: installation.version.version,
        latestVersion: installation.plugin.versions[0].version,
        releaseNotes: installation.plugin.versions[0].releaseNotes,
      }));

    return updates;
  }

  /**
   * Update plugin to latest version
   */
  async updatePlugin(pluginId: string, userId: string, organizationId?: string) {
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        plugin: { pluginId },
        OR: [
          { userId },
          { organizationId }
        ],
      },
      include: {
        plugin: {
          include: {
            versions: {
              where: { status: 'stable' },
              orderBy: { releasedAt: 'desc' },
              take: 1,
            },
          },
        },
        version: true,
      },
    });

    if (!installation) {
      throw new Error('Plugin not installed');
    }

    const latestVersion = installation.plugin.versions[0];
    if (!latestVersion || latestVersion.id === installation.versionId) {
      throw new Error('Already on latest version');
    }

    // Update installation
    const updated = await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: {
        versionId: latestVersion.id,
        status: 'updating',
      },
    });

    // TODO: Trigger actual plugin update
    await this.downloadAndInstallPlugin(installation.plugin, latestVersion, updated);

    // Mark as active after successful update
    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { status: 'active' },
    });

    return updated;
  }

  /**
   * Private helper methods
   */
  private async updatePluginRating(pluginId: string) {
    const ratings = await prisma.pluginRating.aggregate({
      where: { pluginId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.plugin.update({
      where: { id: pluginId },
      data: {
        rating: ratings._avg.rating || 0,
        ratingCount: ratings._count,
      },
    });
  }

  private async downloadAndInstallPlugin(
    plugin: any,
    version: any,
    installation: any
  ) {
    // TODO: Implement actual plugin download and installation
    // This would involve:
    // 1. Download plugin archive from version.downloadUrl
    // 2. Verify checksum
    // 3. Extract to installation.installPath
    // 4. Run plugin validation
    // 5. Initialize plugin sandbox if needed
    console.log(`Installing plugin ${plugin.pluginId} version ${version.version}`);
  }

  private async cleanupPluginFiles(installation: any) {
    // TODO: Implement plugin cleanup
    // This would involve:
    // 1. Stop plugin sandbox if running
    // 2. Remove plugin files from installation.installPath
    // 3. Clean up any plugin-specific data
    console.log(`Cleaning up plugin installation ${installation.id}`);
  }
}

// Export singleton instance
export const pluginService = new PluginService();

// Export cached versions for use in server components
export const searchPlugins = cache(pluginService.searchPlugins.bind(pluginService));
export const getPluginDetails = cache(pluginService.getPluginDetails.bind(pluginService));
export const getCategories = cache(pluginService.getCategories.bind(pluginService));