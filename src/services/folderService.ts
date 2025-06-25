/**
 * Folder Service
 * Comprehensive service for managing dashboard folders with hierarchy support
 */

import { prisma } from '@/lib/database';
import { 
  DashboardFolder, 
  FolderPermission, 
  CreateFolderRequest, 
  UpdateFolderRequest,
  FolderSearchRequest,
  FolderTreeNode,
  FolderMoveRequest,
  FolderCopyRequest,
  BulkFolderOperation,
  BulkOperationResult,
  FolderActivity,
  FolderShare,
  FolderStats,
  FolderPath,
  FolderBreadcrumb
} from '@/types/folder';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

export class FolderService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ============================================================================
  // FOLDER CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderRequest): Promise<DashboardFolder> {
    const uid = uuidv4();
    const slug = slugify(data.name, { lower: true, strict: true });
    
    // Validate parent folder if provided
    let parentFolder = null;
    let path = `/${uid}`;
    let depth = 0;
    
    if (data.parentId) {
      parentFolder = await prisma.dashboardFolder.findUnique({
        where: { id: data.parentId }
      });
      
      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }
      
      // Check permissions on parent folder
      const hasPermission = await this.checkFolderPermission(data.parentId, 'create');
      if (!hasPermission) {
        throw new Error('Permission denied to create folder in parent');
      }
      
      path = `${parentFolder.path}/${uid}`;
      depth = parentFolder.depth + 1;
    }
    
    // Create folder
    const folder = await prisma.dashboardFolder.create({
      data: {
        uid,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        path,
        depth,
        slug,
        icon: data.icon,
        color: data.color,
        tags: data.tags || [],
        permission: data.permission || 'private',
        config: data.config || {},
        createdBy: this.userId,
        sortOrder: await this.getNextSortOrder(data.parentId)
      },
      include: {
        creator: true,
        parent: true,
        _count: {
          select: {
            dashboards: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    // Apply template if specified
    if (data.templateId) {
      await this.applyFolderTemplate(folder.id, data.templateId);
    }
    
    // Create default permissions
    await this.createDefaultPermissions(folder.id);
    
    // Log activity
    await this.logActivity(folder.id, 'created', 'folder', folder.id);
    
    // Refresh materialized view
    await this.refreshFolderHierarchy();
    
    return this.transformFolder(folder);
  }

  /**
   * Update an existing folder
   */
  async updateFolder(folderId: string, data: UpdateFolderRequest): Promise<DashboardFolder> {
    // Check permissions
    const hasPermission = await this.checkFolderPermission(folderId, 'edit');
    if (!hasPermission) {
      throw new Error('Permission denied to update folder');
    }
    
    const existingFolder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId }
    });
    
    if (!existingFolder) {
      throw new Error('Folder not found');
    }
    
    // Handle parent change
    let updateData: any = {
      ...data,
      updatedBy: this.userId
    };
    
    if (data.parentId !== undefined && data.parentId !== existingFolder.parentId) {
      // Validate move operation
      await this.validateFolderMove(folderId, data.parentId);
      
      // Update path and depth
      const newPath = await this.calculateNewPath(folderId, data.parentId);
      updateData.path = newPath.path;
      updateData.depth = newPath.depth;
    }
    
    if (data.name && data.name !== existingFolder.name) {
      updateData.slug = slugify(data.name, { lower: true, strict: true });
    }
    
    // Update folder
    const folder = await prisma.dashboardFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        creator: true,
        updater: true,
        parent: true,
        _count: {
          select: {
            dashboards: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    // Update child paths if parent changed
    if (data.parentId !== undefined && data.parentId !== existingFolder.parentId) {
      await this.updateChildPaths(folderId);
    }
    
    // Log activity
    await this.logActivity(folderId, 'updated', 'folder', folderId, {
      changes: Object.keys(data)
    });
    
    // Refresh materialized view
    await this.refreshFolderHierarchy();
    
    return this.transformFolder(folder);
  }

  /**
   * Delete a folder and optionally its contents
   */
  async deleteFolder(folderId: string, deleteContents: boolean = false): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkFolderPermission(folderId, 'delete');
    if (!hasPermission) {
      throw new Error('Permission denied to delete folder');
    }
    
    const folder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            dashboards: true,
            children: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    if (!folder) {
      throw new Error('Folder not found');
    }
    
    if (folder.isSystem) {
      throw new Error('Cannot delete system folder');
    }
    
    // Check if folder has contents
    const hasContents = folder._count.dashboards > 0 || 
                       folder._count.children > 0 || 
                       folder._count.alertRules > 0 ||
                       folder._count.libraryPanels > 0;
    
    if (hasContents && !deleteContents) {
      throw new Error('Folder has contents. Set deleteContents=true to delete anyway.');
    }
    
    // Log activity before deletion
    await this.logActivity(folderId, 'deleted', 'folder', folderId, {
      name: folder.name,
      hadContents: hasContents
    });
    
    // Delete folder (cascades to children and contents due to DB constraints)
    await prisma.dashboardFolder.delete({
      where: { id: folderId }
    });
    
    // Refresh materialized view
    await this.refreshFolderHierarchy();
  }

  /**
   * Get a single folder by ID
   */
  async getFolder(folderId: string): Promise<DashboardFolder | null> {
    const folder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId },
      include: {
        creator: true,
        updater: true,
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' }
        },
        permissions: {
          where: {
            OR: [
              { userId: this.userId },
              { userId: null } // Team permissions
            ]
          },
          include: {
            user: true,
            team: true
          }
        },
        _count: {
          select: {
            dashboards: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    if (!folder) {
      return null;
    }
    
    // Check view permission
    const hasPermission = await this.checkFolderPermission(folderId, 'view');
    if (!hasPermission) {
      return null;
    }
    
    return this.transformFolder(folder);
  }

  // ============================================================================
  // FOLDER HIERARCHY OPERATIONS
  // ============================================================================

  /**
   * Get folder tree structure
   */
  async getFolderTree(rootId?: string, maxDepth?: number): Promise<FolderTreeNode[]> {
    const where: any = {
      OR: [
        { createdBy: this.userId },
        { permission: { in: ['public', 'team'] } }
      ]
    };
    
    if (rootId) {
      const rootFolder = await prisma.dashboardFolder.findUnique({
        where: { id: rootId },
        select: { path: true, depth: true }
      });
      
      if (!rootFolder) {
        throw new Error('Root folder not found');
      }
      
      where.AND = [
        { path: { startsWith: rootFolder.path } }
      ];
      
      if (maxDepth) {
        where.AND.push({ depth: { lte: rootFolder.depth + maxDepth } });
      }
    } else {
      where.AND = [{ parentId: null }];
    }
    
    const folders = await prisma.dashboardFolder.findMany({
      where,
      include: {
        _count: {
          select: {
            children: true,
            dashboards: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      },
      orderBy: [
        { depth: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return this.buildFolderTree(folders, rootId);
  }

  /**
   * Get folder breadcrumbs
   */
  async getFolderPath(folderId: string): Promise<FolderPath> {
    const folder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId },
      select: { path: true }
    });
    
    if (!folder) {
      throw new Error('Folder not found');
    }
    
    const pathIds = folder.path!.split('/').filter(id => id);
    
    const folders = await prisma.dashboardFolder.findMany({
      where: { id: { in: pathIds } },
      select: { id: true, uid: true, name: true, icon: true },
      orderBy: { depth: 'asc' }
    });
    
    const segments = folders.map(f => ({
      id: f.id,
      uid: f.uid,
      name: f.name,
      icon: f.icon
    }));
    
    return {
      segments,
      fullPath: segments.map(s => s.name).join(' / ')
    };
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(request: FolderMoveRequest): Promise<DashboardFolder> {
    const { folderId, targetParentId, position } = request;
    
    // Validate move operation
    await this.validateFolderMove(folderId, targetParentId);
    
    // Update folder parent and position
    const updateData: any = {
      parentId: targetParentId,
      updatedBy: this.userId
    };
    
    if (position !== undefined) {
      updateData.sortOrder = position;
    } else {
      updateData.sortOrder = await this.getNextSortOrder(targetParentId);
    }
    
    // Calculate new path
    const newPath = await this.calculateNewPath(folderId, targetParentId);
    updateData.path = newPath.path;
    updateData.depth = newPath.depth;
    
    // Update folder
    const folder = await prisma.dashboardFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        creator: true,
        updater: true,
        parent: true,
        _count: {
          select: {
            dashboards: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    // Update all descendant paths
    await this.updateChildPaths(folderId);
    
    // Log activity
    await this.logActivity(folderId, 'moved', 'folder', folderId, {
      fromParentId: folder.parentId,
      toParentId: targetParentId
    });
    
    // Refresh materialized view
    await this.refreshFolderHierarchy();
    
    return this.transformFolder(folder);
  }

  /**
   * Copy folder with contents
   */
  async copyFolder(request: FolderCopyRequest): Promise<DashboardFolder> {
    const { folderId, targetParentId, newName, includeDashboards, includePermissions } = request;
    
    const sourceFolder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId },
      include: {
        permissions: includePermissions,
        dashboards: includeDashboards
      }
    });
    
    if (!sourceFolder) {
      throw new Error('Source folder not found');
    }
    
    // Create new folder
    const newFolder = await this.createFolder({
      name: newName || `${sourceFolder.name} (Copy)`,
      description: sourceFolder.description,
      parentId: targetParentId,
      icon: sourceFolder.icon,
      color: sourceFolder.color,
      tags: sourceFolder.tags,
      permission: sourceFolder.permission,
      config: sourceFolder.config as any
    });
    
    // Copy permissions if requested
    if (includePermissions && sourceFolder.permissions) {
      for (const perm of sourceFolder.permissions) {
        await prisma.folderPermission.create({
          data: {
            folderId: newFolder.id,
            userId: perm.userId,
            teamId: perm.teamId,
            role: perm.role,
            permission: perm.permission,
            canView: perm.canView,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
            canShare: perm.canShare,
            canManagePermissions: perm.canManagePermissions,
            inherited: false,
            createdBy: this.userId
          }
        });
      }
    }
    
    // Copy dashboards if requested
    if (includeDashboards && sourceFolder.dashboards) {
      for (const dashboard of sourceFolder.dashboards) {
        await prisma.dashboard.create({
          data: {
            ...dashboard,
            id: uuidv4(),
            uid: uuidv4(),
            folderId: newFolder.id,
            title: `${dashboard.title} (Copy)`,
            createdBy: this.userId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
    
    // Copy child folders recursively
    const childFolders = await prisma.dashboardFolder.findMany({
      where: { parentId: folderId }
    });
    
    for (const child of childFolders) {
      await this.copyFolder({
        folderId: child.id,
        targetParentId: newFolder.id,
        includeDashboards,
        includePermissions
      });
    }
    
    // Log activity
    await this.logActivity(newFolder.id, 'created', 'folder', newFolder.id, {
      copiedFrom: folderId
    });
    
    return newFolder;
  }

  // ============================================================================
  // FOLDER SEARCH AND FILTERING
  // ============================================================================

  /**
   * Search folders
   */
  async searchFolders(request: FolderSearchRequest): Promise<{
    folders: DashboardFolder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      query,
      parentId,
      tags,
      permission,
      includeChildren,
      depth,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortDirection = 'asc'
    } = request;
    
    const where: any = {
      OR: [
        { createdBy: this.userId },
        { permission: { in: ['public', 'team'] } }
      ]
    };
    
    const and: any[] = [];
    
    // Search query
    if (query) {
      and.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      });
    }
    
    // Parent filter
    if (parentId !== undefined) {
      if (includeChildren) {
        const parent = await prisma.dashboardFolder.findUnique({
          where: { id: parentId },
          select: { path: true }
        });
        if (parent) {
          and.push({ path: { startsWith: parent.path } });
        }
      } else {
        and.push({ parentId });
      }
    }
    
    // Tag filter
    if (tags && tags.length > 0) {
      and.push({ tags: { hasEvery: tags } });
    }
    
    // Permission filter
    if (permission) {
      and.push({ permission });
    }
    
    // Depth filter
    if (depth !== undefined) {
      and.push({ depth: { lte: depth } });
    }
    
    if (and.length > 0) {
      where.AND = and;
    }
    
    // Get total count
    const total = await prisma.dashboardFolder.count({ where });
    
    // Get folders
    const folders = await prisma.dashboardFolder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: this.getSortOrder(sortBy, sortDirection),
      include: {
        creator: true,
        parent: true,
        _count: {
          select: {
            dashboards: true,
            children: true,
            alertRules: true,
            libraryPanels: true
          }
        }
      }
    });
    
    return {
      folders: folders.map(f => this.transformFolder(f)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ============================================================================
  // FOLDER PERMISSIONS
  // ============================================================================

  /**
   * Check if user has permission on folder
   */
  async checkFolderPermission(
    folderId: string, 
    permission: string
  ): Promise<boolean> {
    // Check if user is folder creator
    const folder = await prisma.dashboardFolder.findUnique({
      where: { id: folderId },
      select: { createdBy: true, permission: true }
    });
    
    if (!folder) {
      return false;
    }
    
    if (folder.createdBy === this.userId) {
      return true;
    }
    
    // Check public folders
    if (folder.permission === 'public' && permission === 'view') {
      return true;
    }
    
    // Check explicit permissions
    const perms = await prisma.folderPermission.findFirst({
      where: {
        folderId,
        OR: [
          { userId: this.userId },
          {
            team: {
              TeamMembers: {
                some: { userId: this.userId }
              }
            }
          }
        ]
      }
    });
    
    if (!perms) {
      // Check inherited permissions from parent
      const parentId = folder.permission;
      if (parentId) {
        const result = await prisma.$queryRaw<any[]>`
          SELECT check_folder_permission(${folderId}, ${this.userId}, ${permission}) as has_permission
        `;
        return result[0]?.has_permission || false;
      }
      return false;
    }
    
    // Check specific permission
    switch (permission) {
      case 'view':
        return perms.canView;
      case 'edit':
        return perms.canEdit;
      case 'delete':
        return perms.canDelete;
      case 'share':
        return perms.canShare;
      case 'manage_permissions':
        return perms.canManagePermissions;
      case 'create':
        return perms.canEdit; // Edit permission allows creating subfolders
      default:
        return perms.permission.split(',').includes(permission);
    }
  }

  /**
   * Update folder permissions
   */
  async updateFolderPermissions(
    folderId: string,
    permissions: FolderPermission[]
  ): Promise<void> {
    // Check if user can manage permissions
    const hasPermission = await this.checkFolderPermission(folderId, 'manage_permissions');
    if (!hasPermission) {
      throw new Error('Permission denied to manage folder permissions');
    }
    
    // Delete existing permissions
    await prisma.folderPermission.deleteMany({
      where: { folderId }
    });
    
    // Create new permissions
    for (const perm of permissions) {
      await prisma.folderPermission.create({
        data: {
          folderId,
          userId: perm.userId,
          teamId: perm.teamId,
          role: perm.role,
          permission: perm.permission,
          canView: perm.canView,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canShare: perm.canShare,
          canManagePermissions: perm.canManagePermissions,
          inherited: false,
          createdBy: this.userId
        }
      });
    }
    
    // Log activity
    await this.logActivity(folderId, 'permission_updated', 'folder', folderId, {
      permissionCount: permissions.length
    });
  }

  // ============================================================================
  // FOLDER SHARING
  // ============================================================================

  /**
   * Create a share link for folder
   */
  async createFolderShare(
    folderId: string,
    shareType: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<FolderShare> {
    // Check if user can share folder
    const hasPermission = await this.checkFolderPermission(folderId, 'share');
    if (!hasPermission) {
      throw new Error('Permission denied to share folder');
    }
    
    const shareKey = uuidv4();
    
    const share = await prisma.folderShare.create({
      data: {
        folderId,
        shareKey,
        sharedBy: this.userId,
        shareType,
        permissions,
        expiresAt,
        isActive: true
      },
      include: {
        folder: true,
        sharer: true
      }
    });
    
    // Log activity
    await this.logActivity(folderId, 'shared', 'folder', folderId, {
      shareType,
      shareKey
    });
    
    return share as any;
  }

  // ============================================================================
  // FOLDER ANALYTICS
  // ============================================================================

  /**
   * Get folder statistics
   */
  async getFolderStats(folderId?: string): Promise<FolderStats> {
    const where: any = {};
    
    if (folderId) {
      const folder = await prisma.dashboardFolder.findUnique({
        where: { id: folderId },
        select: { path: true }
      });
      
      if (folder) {
        where.path = { startsWith: folder.path };
      }
    }
    
    const stats = await prisma.dashboardFolder.aggregate({
      where,
      _count: true,
      _max: { depth: true }
    });
    
    const dashboardCount = await prisma.dashboard.count({
      where: folderId ? { folderId } : {}
    });
    
    const alertCount = await prisma.alertRule.count({
      where: folderId ? { folderId } : {}
    });
    
    const libraryPanelCount = await prisma.libraryPanel.count({
      where: folderId ? { folderId } : {}
    });
    
    return {
      totalFolders: stats._count,
      totalDashboards: dashboardCount,
      totalAlerts: alertCount,
      totalLibraryPanels: libraryPanelCount,
      maxDepth: stats._max.depth || 0,
      avgDashboardsPerFolder: stats._count > 0 ? dashboardCount / stats._count : 0
    };
  }

  /**
   * Track folder view
   */
  async trackFolderView(folderId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.folderAnalytics.upsert({
      where: {
        folderId_date: {
          folderId,
          date: today
        }
      },
      update: {
        viewCount: { increment: 1 }
      },
      create: {
        folderId,
        date: today,
        viewCount: 1,
        uniqueViewers: 1,
        dashboardCount: 0,
        alertCount: 0,
        panelCount: 0,
        queryCount: 0,
        errorCount: 0
      }
    });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Perform bulk operations on folders
   */
  async performBulkOperation(operation: BulkFolderOperation): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: true,
      totalItems: operation.folderIds.length,
      successfulItems: 0,
      failedItems: 0,
      errors: []
    };
    
    for (const folderId of operation.folderIds) {
      try {
        switch (operation.operation) {
          case 'move':
            if (operation.targetParentId !== undefined) {
              await this.moveFolder({
                folderId,
                targetParentId: operation.targetParentId
              });
            }
            break;
            
          case 'delete':
            await this.deleteFolder(folderId, true);
            break;
            
          case 'update_permissions':
            if (operation.permissions) {
              await this.updateFolderPermissions(folderId, operation.permissions as any);
            }
            break;
            
          case 'add_tags':
            if (operation.tags) {
              const folder = await prisma.dashboardFolder.findUnique({
                where: { id: folderId },
                select: { tags: true }
              });
              if (folder) {
                await prisma.dashboardFolder.update({
                  where: { id: folderId },
                  data: {
                    tags: [...new Set([...folder.tags, ...operation.tags])]
                  }
                });
              }
            }
            break;
            
          case 'remove_tags':
            if (operation.tags) {
              const folder = await prisma.dashboardFolder.findUnique({
                where: { id: folderId },
                select: { tags: true }
              });
              if (folder) {
                await prisma.dashboardFolder.update({
                  where: { id: folderId },
                  data: {
                    tags: folder.tags.filter(t => !operation.tags!.includes(t))
                  }
                });
              }
            }
            break;
        }
        
        results.successfulItems++;
      } catch (error) {
        results.failedItems++;
        results.errors?.push({
          folderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    results.success = results.failedItems === 0;
    return results;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private transformFolder(folder: any): DashboardFolder {
    return {
      ...folder,
      dashboardCount: folder._count?.dashboards || 0,
      alertRuleCount: folder._count?.alertRules || 0,
      libraryPanelCount: folder._count?.libraryPanels || 0
    };
  }

  private async getNextSortOrder(parentId: string | null | undefined): Promise<number> {
    const lastFolder = await prisma.dashboardFolder.findFirst({
      where: { parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    return (lastFolder?.sortOrder || 0) + 1;
  }

  private async validateFolderMove(folderId: string, targetParentId: string | null | undefined): Promise<void> {
    if (folderId === targetParentId) {
      throw new Error('Cannot move folder into itself');
    }
    
    if (targetParentId) {
      // Check if target is a descendant of source
      const targetFolder = await prisma.dashboardFolder.findUnique({
        where: { id: targetParentId },
        select: { path: true }
      });
      
      if (targetFolder && targetFolder.path?.includes(folderId)) {
        throw new Error('Cannot move folder into its own descendant');
      }
      
      // Check permissions on target
      const hasPermission = await this.checkFolderPermission(targetParentId, 'create');
      if (!hasPermission) {
        throw new Error('Permission denied to move folder to target');
      }
    }
  }

  private async calculateNewPath(folderId: string, parentId: string | null | undefined): Promise<{
    path: string;
    depth: number;
  }> {
    if (!parentId) {
      return { path: `/${folderId}`, depth: 0 };
    }
    
    const parentFolder = await prisma.dashboardFolder.findUnique({
      where: { id: parentId },
      select: { path: true, depth: true }
    });
    
    if (!parentFolder) {
      throw new Error('Parent folder not found');
    }
    
    return {
      path: `${parentFolder.path}/${folderId}`,
      depth: parentFolder.depth + 1
    };
  }

  private async updateChildPaths(parentId: string): Promise<void> {
    const parent = await prisma.dashboardFolder.findUnique({
      where: { id: parentId },
      select: { path: true, depth: true }
    });
    
    if (!parent) return;
    
    const children = await prisma.dashboardFolder.findMany({
      where: { parentId }
    });
    
    for (const child of children) {
      await prisma.dashboardFolder.update({
        where: { id: child.id },
        data: {
          path: `${parent.path}/${child.id}`,
          depth: parent.depth + 1
        }
      });
      
      // Recursively update grandchildren
      await this.updateChildPaths(child.id);
    }
  }

  private async createDefaultPermissions(folderId: string): Promise<void> {
    await prisma.folderPermission.create({
      data: {
        folderId,
        userId: this.userId,
        role: 'admin',
        permission: 'all',
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canManagePermissions: true,
        inherited: false,
        createdBy: this.userId
      }
    });
  }

  private async applyFolderTemplate(folderId: string, templateId: string): Promise<void> {
    const template = await prisma.folderTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) return;
    
    // Apply default permissions from template
    if (template.defaultPermissions) {
      const permissions = template.defaultPermissions as any[];
      for (const perm of permissions) {
        await prisma.folderPermission.create({
          data: {
            folderId,
            ...perm,
            inherited: false,
            createdBy: this.userId
          }
        });
      }
    }
    
    // Apply dashboard defaults
    if (template.dashboardDefaults) {
      await prisma.dashboardFolder.update({
        where: { id: folderId },
        data: {
          config: {
            ...(template.dashboardDefaults as any)
          }
        }
      });
    }
  }

  private async logActivity(
    folderId: string,
    action: string,
    entityType: string,
    entityId?: string,
    details?: any
  ): Promise<void> {
    await prisma.folderActivity.create({
      data: {
        folderId,
        userId: this.userId,
        action,
        entityType,
        entityId,
        details
      }
    });
  }

  private async refreshFolderHierarchy(): Promise<void> {
    // Refresh materialized view asynchronously
    prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY folder_hierarchy_view`
      .catch(error => console.error('Failed to refresh folder hierarchy view:', error));
  }

  private buildFolderTree(folders: any[], rootId?: string): FolderTreeNode[] {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootNodes: FolderTreeNode[] = [];
    
    // First pass: create all nodes
    for (const folder of folders) {
      folderMap.set(folder.id, {
        ...this.transformFolder(folder),
        children: [],
        expanded: false,
        selected: false
      });
    }
    
    // Second pass: build tree structure
    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parentNode = folderMap.get(folder.parentId)!;
        parentNode.children.push(node);
      } else if (!folder.parentId || folder.parentId === rootId) {
        rootNodes.push(node);
      }
    }
    
    return rootNodes;
  }

  private getSortOrder(sortBy: string, direction: 'asc' | 'desc'): any {
    const order: any = {};
    
    switch (sortBy) {
      case 'name':
        order.name = direction;
        break;
      case 'createdAt':
        order.createdAt = direction;
        break;
      case 'updatedAt':
        order.updatedAt = direction;
        break;
      case 'dashboardCount':
        return [
          { dashboards: { _count: direction } },
          { name: 'asc' }
        ];
      case 'sortOrder':
        order.sortOrder = direction;
        break;
      default:
        order.name = direction;
    }
    
    return order;
  }
}