/**
 * Playlist Service
 * Handles all playlist operations including CRUD, validation, and playback management
 */

import { prisma } from '@/lib/database';
import { nanoid } from 'nanoid';
import {
  Playlist,
  PlaylistItem,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  UpdatePlaylistItemsRequest,
  PlaylistSearchRequest,
  PlaylistSearchResponse,
  PlaylistSummary,
  PlaylistValidationResult,
  PlaylistValidationError,
  PlaylistValidationWarning,
} from '@/types/playlist';

export class PlaylistService {
  /**
   * Create a new playlist
   */
  async createPlaylist(request: CreatePlaylistRequest, userId: string): Promise<Playlist> {
    // Validate the request
    const validation = await this.validatePlaylist(request);
    if (!validation.isValid) {
      throw new Error(`Playlist validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Generate unique UID
    const uid = `playlist-${nanoid(10)}`;

    // Create playlist with items in a transaction
    const playlist = await prisma.$transaction(async (tx) => {
      // Create the playlist
      const newPlaylist = await tx.playlist.create({
        data: {
          uid,
          name: request.name,
          description: request.description,
          interval: request.interval,
          tags: request.tags || [],
          kioskMode: request.settings?.kioskMode || 'tv',
          autoPlay: request.settings?.autoPlay ?? true,
          hideNavigation: request.settings?.hideNavigation ?? true,
          hideControls: request.settings?.hideControls ?? false,
          showTimeRange: request.settings?.showTimeRange ?? true,
          showVariables: request.settings?.showVariables ?? true,
          showRefresh: request.settings?.showRefresh ?? false,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Create playlist items
      if (request.items && request.items.length > 0) {
        const itemsData = await Promise.all(
          request.items.map(async (item) => {
            // Fetch dashboard to get title and tags
            const dashboard = await tx.dashboard.findUnique({
              where: { uid: item.dashboardUid },
              select: { title: true, tags: true },
            });

            if (!dashboard) {
              throw new Error(`Dashboard ${item.dashboardUid} not found`);
            }

            return {
              playlistId: newPlaylist.id,
              dashboardUid: item.dashboardUid,
              order: item.order,
              customInterval: item.customInterval,
              customTimeRange: item.customTimeRange ? JSON.stringify(item.customTimeRange) : null,
              customVariables: item.customVariables ? JSON.stringify(item.customVariables) : null,
              hideTimeRange: item.hideTimeRange || false,
              hideVariables: item.hideVariables || false,
              dashboardTitle: dashboard.title,
              dashboardTags: dashboard.tags,
            };
          })
        );

        await tx.playlistItem.createMany({
          data: itemsData,
        });
      }

      // Return the complete playlist with items
      return tx.playlist.findUnique({
        where: { id: newPlaylist.id },
        include: { items: true },
      });
    });

    if (!playlist) {
      throw new Error('Failed to create playlist');
    }

    return this.formatPlaylist(playlist);
  }

  /**
   * Update an existing playlist
   */
  async updatePlaylist(
    uid: string,
    request: UpdatePlaylistRequest,
    userId: string
  ): Promise<Playlist> {
    const playlist = await prisma.playlist.update({
      where: { uid },
      data: {
        name: request.name,
        description: request.description,
        interval: request.interval,
        tags: request.tags,
        kioskMode: request.settings?.kioskMode,
        autoPlay: request.settings?.autoPlay,
        hideNavigation: request.settings?.hideNavigation,
        hideControls: request.settings?.hideControls,
        showTimeRange: request.settings?.showTimeRange,
        showVariables: request.settings?.showVariables,
        showRefresh: request.settings?.showRefresh,
        isActive: request.isActive,
        updatedBy: userId,
      },
      include: { items: true },
    });

    return this.formatPlaylist(playlist);
  }

  /**
   * Update playlist items (add, remove, reorder)
   */
  async updatePlaylistItems(
    uid: string,
    request: UpdatePlaylistItemsRequest,
    userId: string
  ): Promise<Playlist> {
    const playlist = await prisma.$transaction(async (tx) => {
      // Get the playlist
      const existingPlaylist = await tx.playlist.findUnique({
        where: { uid },
      });

      if (!existingPlaylist) {
        throw new Error('Playlist not found');
      }

      // Process item updates
      for (const item of request.items) {
        if (item.remove && item.id) {
          // Remove item
          await tx.playlistItem.delete({
            where: { id: item.id },
          });
        } else if (item.id) {
          // Update existing item
          await tx.playlistItem.update({
            where: { id: item.id },
            data: {
              order: item.order,
              customInterval: item.customInterval,
              customTimeRange: item.customTimeRange ? JSON.stringify(item.customTimeRange) : null,
              customVariables: item.customVariables ? JSON.stringify(item.customVariables) : null,
              hideTimeRange: item.hideTimeRange,
              hideVariables: item.hideVariables,
            },
          });
        } else {
          // Add new item
          const dashboard = await tx.dashboard.findUnique({
            where: { uid: item.dashboardUid },
            select: { title: true, tags: true },
          });

          if (!dashboard) {
            throw new Error(`Dashboard ${item.dashboardUid} not found`);
          }

          await tx.playlistItem.create({
            data: {
              playlistId: existingPlaylist.id,
              dashboardUid: item.dashboardUid,
              order: item.order,
              customInterval: item.customInterval,
              customTimeRange: item.customTimeRange ? JSON.stringify(item.customTimeRange) : null,
              customVariables: item.customVariables ? JSON.stringify(item.customVariables) : null,
              hideTimeRange: item.hideTimeRange || false,
              hideVariables: item.hideVariables || false,
              dashboardTitle: dashboard.title,
              dashboardTags: dashboard.tags,
            },
          });
        }
      }

      // Update the playlist's updatedBy
      await tx.playlist.update({
        where: { id: existingPlaylist.id },
        data: { updatedBy: userId },
      });

      // Return updated playlist with items
      return tx.playlist.findUnique({
        where: { id: existingPlaylist.id },
        include: { items: { orderBy: { order: 'asc' } } },
      });
    });

    if (!playlist) {
      throw new Error('Failed to update playlist items');
    }

    return this.formatPlaylist(playlist);
  }

  /**
   * Get a playlist by UID
   */
  async getPlaylist(uid: string): Promise<Playlist | null> {
    const playlist = await prisma.playlist.findUnique({
      where: { uid },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!playlist) {
      return null;
    }

    return this.formatPlaylist(playlist);
  }

  /**
   * Search playlists
   */
  async searchPlaylists(request: PlaylistSearchRequest): Promise<PlaylistSearchResponse> {
    const page = request.page || 1;
    const limit = request.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (request.query) {
      where.OR = [
        { name: { contains: request.query, mode: 'insensitive' } },
        { description: { contains: request.query, mode: 'insensitive' } },
      ];
    }

    if (request.tags && request.tags.length > 0) {
      where.tags = { hasSome: request.tags };
    }

    if (request.isActive !== undefined) {
      where.isActive = request.isActive;
    }

    if (request.createdBy) {
      where.createdBy = request.createdBy;
    }

    // Get total count
    const total = await prisma.playlist.count({ where });

    // Get playlists
    const playlists = await prisma.playlist.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: this.getOrderBy(request.sortBy, request.sortDirection),
      skip,
      take: limit,
    });

    // Format results
    const summaries: PlaylistSummary[] = playlists.map((p) => ({
      uid: p.uid,
      name: p.name,
      description: p.description || undefined,
      interval: p.interval,
      itemCount: p._count.items,
      tags: p.tags,
      isActive: p.isActive,
      lastPlayedAt: p.lastPlayedAt || undefined,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return {
      playlists: summaries,
      total,
      page,
      limit,
    };
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(uid: string): Promise<void> {
    await prisma.playlist.delete({
      where: { uid },
    });
  }

  /**
   * Record playlist play event
   */
  async recordPlayEvent(uid: string): Promise<void> {
    await prisma.playlist.update({
      where: { uid },
      data: {
        lastPlayedAt: new Date(),
        playCount: { increment: 1 },
      },
    });
  }

  /**
   * Record playlist item play event
   */
  async recordItemPlayEvent(playlistUid: string, itemId: string): Promise<void> {
    await prisma.playlistItem.update({
      where: { id: itemId },
      data: {
        lastPlayedAt: new Date(),
        playCount: { increment: 1 },
      },
    });
  }

  /**
   * Validate playlist data
   */
  private async validatePlaylist(
    request: CreatePlaylistRequest
  ): Promise<PlaylistValidationResult> {
    const errors: PlaylistValidationError[] = [];
    const warnings: PlaylistValidationWarning[] = [];

    // Validate name
    if (!request.name || request.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Playlist name is required',
        code: 'REQUIRED_FIELD',
      });
    } else if (request.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Playlist name must be 100 characters or less',
        code: 'FIELD_TOO_LONG',
      });
    }

    // Validate interval
    if (!request.interval || !request.interval.match(/^\d+[smh]$/)) {
      errors.push({
        field: 'interval',
        message: 'Invalid interval format. Use format like "5m", "30s", "1h"',
        code: 'INVALID_FORMAT',
      });
    }

    // Validate items
    if (!request.items || request.items.length === 0) {
      warnings.push({
        field: 'items',
        message: 'Playlist has no dashboards',
        code: 'EMPTY_PLAYLIST',
      });
    } else {
      // Check for duplicate orders
      const orders = request.items.map((item) => item.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push({
          field: 'items',
          message: 'Duplicate order values found in playlist items',
          code: 'DUPLICATE_ORDER',
        });
      }

      // Validate each item
      for (const [index, item] of request.items.entries()) {
        if (!item.dashboardUid) {
          errors.push({
            field: `items[${index}].dashboardUid`,
            message: 'Dashboard UID is required',
            code: 'REQUIRED_FIELD',
          });
        }

        if (item.customInterval && !item.customInterval.match(/^\d+[smh]$/)) {
          errors.push({
            field: `items[${index}].customInterval`,
            message: 'Invalid custom interval format',
            code: 'INVALID_FORMAT',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format playlist from database to API format
   */
  private formatPlaylist(playlist: any): Playlist {
    return {
      id: playlist.id,
      uid: playlist.uid,
      name: playlist.name,
      description: playlist.description || undefined,
      interval: playlist.interval,
      kioskMode: playlist.kioskMode,
      autoPlay: playlist.autoPlay,
      hideNavigation: playlist.hideNavigation,
      hideControls: playlist.hideControls,
      showTimeRange: playlist.showTimeRange,
      showVariables: playlist.showVariables,
      showRefresh: playlist.showRefresh,
      tags: playlist.tags,
      isActive: playlist.isActive,
      lastPlayedAt: playlist.lastPlayedAt || undefined,
      playCount: playlist.playCount,
      createdBy: playlist.createdBy,
      updatedBy: playlist.updatedBy || undefined,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      items: playlist.items?.map(this.formatPlaylistItem) || [],
    };
  }

  /**
   * Format playlist item from database to API format
   */
  private formatPlaylistItem(item: any): PlaylistItem {
    return {
      id: item.id,
      playlistId: item.playlistId,
      dashboardUid: item.dashboardUid,
      order: item.order,
      customInterval: item.customInterval || undefined,
      customTimeRange: item.customTimeRange ? JSON.parse(item.customTimeRange) : undefined,
      customVariables: item.customVariables ? JSON.parse(item.customVariables) : undefined,
      hideTimeRange: item.hideTimeRange,
      hideVariables: item.hideVariables,
      dashboardTitle: item.dashboardTitle,
      dashboardTags: item.dashboardTags,
      addedAt: item.addedAt,
      lastPlayedAt: item.lastPlayedAt || undefined,
      playCount: item.playCount,
    };
  }

  /**
   * Get order by clause for sorting
   */
  private getOrderBy(
    sortBy?: 'name' | 'created' | 'updated' | 'lastPlayed',
    sortDirection?: 'asc' | 'desc'
  ): any {
    const direction = sortDirection || 'asc';

    switch (sortBy) {
      case 'name':
        return { name: direction };
      case 'created':
        return { createdAt: direction };
      case 'updated':
        return { updatedAt: direction };
      case 'lastPlayed':
        return { lastPlayedAt: direction };
      default:
        return { name: direction };
    }
  }
}

// Export singleton instance
export const playlistService = new PlaylistService();