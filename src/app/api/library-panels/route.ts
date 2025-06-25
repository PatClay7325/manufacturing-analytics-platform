/**
 * Library Panels API Routes - Main CRUD operations
 * GET /api/library-panels - List and search library panels
 * POST /api/library-panels - Create new library panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database';
import type { 
  LibraryPanelSearchRequest, 
  LibraryPanelSearchResponse,
  CreateLibraryPanelRequest 
} from '@/types/dashboard';

// Validation schemas
const searchParamsSchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(25),
  sort: z.enum(['name', 'created', 'updated', 'type', 'usage']).default('updated'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  typeFilter: z.string().optional(),
  folderFilter: z.string().optional(),
  tagFilter: z.string().transform(str => str ? str.split(',') : []).optional(),
  excludeUids: z.string().transform(str => str ? str.split(',') : []).optional(),
});

const createLibraryPanelSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1),
  description: z.string().optional(),
  model: z.record(z.any()),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  folderId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = searchParamsSchema.parse(Object.fromEntries(searchParams));
    
    const {
      query,
      page,
      perPage,
      sort,
      sortDirection,
      typeFilter,
      folderFilter,
      tagFilter,
      excludeUids,
    } = validatedParams;

    // Build where clause
    const where: any = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }
    
    if (typeFilter) {
      where.type = typeFilter;
    }
    
    if (folderFilter) {
      where.folderId = folderFilter;
    }
    
    if (tagFilter && tagFilter.length > 0) {
      where.tags = {
        hasSome: tagFilter,
      };
    }
    
    if (excludeUids && excludeUids.length > 0) {
      where.NOT = {
        uid: { in: excludeUids },
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sort) {
      case 'name':
        orderBy = { name: sortDirection };
        break;
      case 'created':
        orderBy = { createdAt: sortDirection };
        break;
      case 'updated':
        orderBy = { updatedAt: sortDirection };
        break;
      case 'type':
        orderBy = { type: sortDirection };
        break;
      case 'usage':
        orderBy = { usageCount: sortDirection };
        break;
      default:
        orderBy = { updatedAt: 'desc' };
    }

    // Get total count for pagination
    const totalCount = await prisma.libraryPanel.count({ where });

    // Get paginated results
    const offset = (page - 1) * perPage;
    const libraryPanels = await prisma.libraryPanel.findMany({
      where,
      orderBy,
      skip: offset,
      take: perPage,
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
          take: 5,
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
              },
            },
          },
        },
      },
    });

    // Transform data to match API response format
    const result = libraryPanels.map(panel => ({
      uid: panel.uid,
      name: panel.name,
      type: panel.type,
      description: panel.description,
      model: panel.model as any,
      version: panel.version,
      tags: panel.tags,
      category: panel.category,
      folderId: panel.folderId,
      connectedDashboards: panel.connectedDashboards,
      usageCount: panel.usageCount,
      lastUsedAt: panel.lastUsedAt?.toISOString(),
      createdBy: panel.createdBy,
      updatedBy: panel.updatedBy,
      createdAt: panel.createdAt.toISOString(),
      updatedAt: panel.updatedAt.toISOString(),
      meta: {
        canEdit: true, // TODO: Add proper permission checks
        canDelete: true,
        canView: true,
        connectedDashboards: panel.connectedDashboards,
        created: panel.createdAt.toISOString(),
        updated: panel.updatedAt.toISOString(),
        createdBy: {
          id: panel.creator.id,
          name: panel.creator.name || 'Unknown',
          email: panel.creator.email,
        },
        updatedBy: panel.updater ? {
          id: panel.updater.id,
          name: panel.updater.name || 'Unknown',
          email: panel.updater.email,
        } : undefined,
        folderName: panel.folder?.name,
        folderUid: panel.folder?.id,
        versions: panel.versions.map(version => ({
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
    }));

    const response: LibraryPanelSearchResponse = {
      totalCount,
      page,
      perPage,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Library panels search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search library panels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createLibraryPanelSchema.parse(body);
    
    // TODO: Get actual user ID from authentication
    const userId = 'system';
    
    // Generate UID for the library panel
    const uid = `lib-panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create library panel
    const libraryPanel = await prisma.libraryPanel.create({
      data: {
        uid,
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        model: validatedData.model,
        tags: validatedData.tags,
        category: validatedData.category,
        folderId: validatedData.folderId,
        createdBy: userId,
        version: 1,
      },
      include: {
        creator: {
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

    // Create initial version
    await prisma.libraryPanelVersion.create({
      data: {
        libraryPanelUid: uid,
        version: 1,
        model: validatedData.model,
        message: 'Initial version',
        createdBy: userId,
      },
    });

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
      createdAt: libraryPanel.createdAt.toISOString(),
      updatedAt: libraryPanel.updatedAt.toISOString(),
      meta: {
        canEdit: true,
        canDelete: true,
        canView: true,
        connectedDashboards: 0,
        created: libraryPanel.createdAt.toISOString(),
        updated: libraryPanel.updatedAt.toISOString(),
        createdBy: {
          id: libraryPanel.creator.id,
          name: libraryPanel.creator.name || 'Unknown',
          email: libraryPanel.creator.email,
        },
        folderName: libraryPanel.folder?.name,
        folderUid: libraryPanel.folder?.id,
        versions: [],
        permissions: {
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCreateVersion: true,
        },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Library panel creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create library panel' },
      { status: 500 }
    );
  }
}