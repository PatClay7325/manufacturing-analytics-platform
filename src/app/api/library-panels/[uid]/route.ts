/**
 * Individual Library Panel API Routes
 * GET /api/library-panels/[uid] - Get specific library panel
 * PUT /api/library-panels/[uid] - Update library panel
 * DELETE /api/library-panels/[uid] - Delete library panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database';
import type { UpdateLibraryPanelRequest } from '@/types/dashboard';

const updateLibraryPanelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  model: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  folderId: z.string().optional(),
  version: z.number().optional(),
  message: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    const libraryPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        usage: {
          include: {
            dashboard: {
              select: {
                uid: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!libraryPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    // Transform response
    const response = {
      uid: libraryPanel.uid,
      name: libraryPanel.name,
      type: libraryPanel.type,
      description: libraryPanel.description,
      model: libraryPanel.model,
      version: libraryPanel.version,
      tags: libraryPanel.tags,
      category: libraryPanel.category,
      folderId: libraryPanel.folderId,
      connectedDashboards: libraryPanel.connectedDashboards,
      usageCount: libraryPanel.usageCount,
      lastUsedAt: libraryPanel.lastUsedAt?.toISOString(),
      createdBy: libraryPanel.createdBy,
      updatedBy: libraryPanel.updatedBy,
      createdAt: libraryPanel.createdAt.toISOString(),
      updatedAt: libraryPanel.updatedAt.toISOString(),
      meta: {
        canEdit: true, // TODO: Add proper permission checks
        canDelete: true,
        canView: true,
        connectedDashboards: libraryPanel.connectedDashboards,
        created: libraryPanel.createdAt.toISOString(),
        updated: libraryPanel.updatedAt.toISOString(),
        createdBy: {
          id: libraryPanel.creator.id,
          name: libraryPanel.creator.name || 'Unknown',
          email: libraryPanel.creator.email,
        },
        updatedBy: libraryPanel.updater ? {
          id: libraryPanel.updater.id,
          name: libraryPanel.updater.name || 'Unknown',
          email: libraryPanel.updater.email,
        } : undefined,
        folderName: libraryPanel.folder?.name,
        folderUid: libraryPanel.folder?.id,
        versions: libraryPanel.versions.map(version => ({
          id: version.id,
          version: version.version,
          model: version.model as any,
          message: version.message,
          createdBy: version.createdBy,
          createdAt: version.createdAt.toISOString(),
          creator: {
            id: version.creator.id,
            name: version.creator.name || 'Unknown',
            email: version.creator.email,
          },
        })),
        permissions: {
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCreateVersion: true,
        },
      },
      connections: libraryPanel.usage.map(usage => ({
        id: usage.id,
        libraryPanelUid: usage.libraryPanelUid,
        dashboardUid: usage.dashboardUid,
        dashboardTitle: usage.dashboard.title,
        panelId: usage.panelId,
        panelTitle: `Panel ${usage.panelId}`, // TODO: Get actual panel title
        createdAt: usage.createdAt.toISOString(),
        updatedAt: usage.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Library panel fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library panel' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;
    const body = await request.json();
    const validatedData = updateLibraryPanelSchema.parse(body);
    
    // TODO: Get actual user ID from authentication
    const userId = 'system';

    // Check if library panel exists
    const existingPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
    });

    if (!existingPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    // Determine if we should create a new version
    const shouldCreateVersion = 
      validatedData.model && 
      JSON.stringify(validatedData.model) !== JSON.stringify(existingPanel.model);

    let newVersion = existingPanel.version;
    
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update library panel
      const updateData: any = {
        updatedBy: userId,
      };

      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.tags) updateData.tags = validatedData.tags;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.folderId !== undefined) updateData.folderId = validatedData.folderId;

      if (shouldCreateVersion) {
        newVersion = existingPanel.version + 1;
        updateData.version = newVersion;
        updateData.model = validatedData.model;
      }

      const libraryPanel = await tx.libraryPanel.update({
        where: { uid },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create new version if model changed
      if (shouldCreateVersion) {
        await tx.libraryPanelVersion.create({
          data: {
            libraryPanelUid: uid,
            version: newVersion,
            model: validatedData.model!,
            message: validatedData.message || `Version ${newVersion}`,
            createdBy: userId,
          },
        });
      }

      return libraryPanel;
    });

    // Transform response
    const response = {
      uid: result.uid,
      name: result.name,
      type: result.type,
      description: result.description,
      model: result.model,
      version: result.version,
      tags: result.tags,
      category: result.category,
      folderId: result.folderId,
      connectedDashboards: result.connectedDashboards,
      usageCount: result.usageCount,
      lastUsedAt: result.lastUsedAt?.toISOString(),
      createdBy: result.createdBy,
      updatedBy: result.updatedBy,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      meta: {
        canEdit: true,
        canDelete: true,
        canView: true,
        connectedDashboards: result.connectedDashboards,
        created: result.createdAt.toISOString(),
        updated: result.updatedAt.toISOString(),
        createdBy: {
          id: result.creator.id,
          name: result.creator.name || 'Unknown',
          email: result.creator.email,
        },
        updatedBy: result.updater ? {
          id: result.updater.id,
          name: result.updater.name || 'Unknown',
          email: result.updater.email,
        } : undefined,
        folderName: result.folder?.name,
        folderUid: result.folder?.id,
        versions: [],
        permissions: {
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCreateVersion: true,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Library panel update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update library panel' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    // Check if library panel exists and get connection info
    const libraryPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
      include: {
        usage: true,
        _count: {
          select: {
            usage: true,
          },
        },
      },
    });

    if (!libraryPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    // Check if library panel is in use
    if (libraryPanel._count.usage > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete library panel that is in use',
          connectedDashboards: libraryPanel._count.usage,
          dashboards: libraryPanel.usage.map(u => u.dashboardUid),
        },
        { status: 409 }
      );
    }

    // Delete library panel (cascade will handle versions)
    await prisma.libraryPanel.delete({
      where: { uid },
    });

    return NextResponse.json(
      { message: 'Library panel deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Library panel deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete library panel' },
      { status: 500 }
    );
  }
}