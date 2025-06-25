/**
 * Library Panel Connections API Routes
 * GET /api/library-panels/[uid]/connections - Get panel connections
 * POST /api/library-panels/[uid]/connections - Add connection
 * DELETE /api/library-panels/[uid]/connections - Remove connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database';

const addConnectionSchema = z.object({
  dashboardUid: z.string(),
  panelId: z.number(),
});

const removeConnectionSchema = z.object({
  dashboardUid: z.string(),
  panelId: z.number(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    // Check if library panel exists
    const libraryPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
      select: { uid: true },
    });

    if (!libraryPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    // Get all connections
    const connections = await prisma.libraryPanelUsage.findMany({
      where: { libraryPanelUid: uid },
      include: {
        dashboard: {
          select: {
            uid: true,
            title: true,
            slug: true,
            folderId: true,
            createdAt: true,
            updatedAt: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = connections.map(connection => ({
      id: connection.id,
      libraryPanelUid: connection.libraryPanelUid,
      dashboardUid: connection.dashboardUid,
      dashboardTitle: connection.dashboard.title,
      panelId: connection.panelId,
      panelTitle: `Panel ${connection.panelId}`, // TODO: Get actual panel title from dashboard JSON
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      dashboard: {
        uid: connection.dashboard.uid,
        title: connection.dashboard.title,
        slug: connection.dashboard.slug,
        folderId: connection.dashboard.folderId,
        createdAt: connection.dashboard.createdAt.toISOString(),
        updatedAt: connection.dashboard.updatedAt.toISOString(),
        createdBy: connection.dashboard.User ? {
          id: connection.dashboard.User.id,
          name: connection.dashboard.User.name || 'Unknown',
          email: connection.dashboard.User.email,
        } : null,
      },
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Library panel connections fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library panel connections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;
    const body = await request.json();
    const validatedData = addConnectionSchema.parse(body);

    // Check if library panel exists
    const libraryPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
      select: { uid: true, connectedDashboards: true },
    });

    if (!libraryPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    // Check if dashboard exists
    const dashboard = await prisma.dashboard.findUnique({
      where: { uid: validatedData.dashboardUid },
      select: { uid: true, title: true },
    });

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const existingConnection = await prisma.libraryPanelUsage.findUnique({
      where: {
        libraryPanelUid_dashboardUid_panelId: {
          libraryPanelUid: uid,
          dashboardUid: validatedData.dashboardUid,
          panelId: validatedData.panelId,
        },
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 409 }
      );
    }

    // Create connection and update counters
    const result = await prisma.$transaction(async (tx) => {
      // Create connection
      const connection = await tx.libraryPanelUsage.create({
        data: {
          libraryPanelUid: uid,
          dashboardUid: validatedData.dashboardUid,
          panelId: validatedData.panelId,
        },
        include: {
          dashboard: {
            select: {
              uid: true,
              title: true,
              slug: true,
            },
          },
        },
      });

      // Update counters
      await tx.libraryPanel.update({
        where: { uid },
        data: {
          connectedDashboards: { increment: 1 },
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return connection;
    });

    const response = {
      id: result.id,
      libraryPanelUid: result.libraryPanelUid,
      dashboardUid: result.dashboardUid,
      dashboardTitle: result.dashboard.title,
      panelId: result.panelId,
      panelTitle: `Panel ${result.panelId}`,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Library panel connection creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create library panel connection' },
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
    const { searchParams } = new URL(request.url);
    
    const dashboardUid = searchParams.get('dashboardUid');
    const panelId = searchParams.get('panelId');

    if (!dashboardUid || !panelId) {
      return NextResponse.json(
        { error: 'dashboardUid and panelId are required' },
        { status: 400 }
      );
    }

    const parsedPanelId = parseInt(panelId, 10);
    if (isNaN(parsedPanelId)) {
      return NextResponse.json(
        { error: 'panelId must be a number' },
        { status: 400 }
      );
    }

    // Check if connection exists
    const connection = await prisma.libraryPanelUsage.findUnique({
      where: {
        libraryPanelUid_dashboardUid_panelId: {
          libraryPanelUid: uid,
          dashboardUid,
          panelId: parsedPanelId,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Remove connection and update counters
    await prisma.$transaction(async (tx) => {
      // Delete connection
      await tx.libraryPanelUsage.delete({
        where: {
          libraryPanelUid_dashboardUid_panelId: {
            libraryPanelUid: uid,
            dashboardUid,
            panelId: parsedPanelId,
          },
        },
      });

      // Update counters
      await tx.libraryPanel.update({
        where: { uid },
        data: {
          connectedDashboards: { decrement: 1 },
        },
      });
    });

    return NextResponse.json(
      { message: 'Connection removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Library panel connection deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to remove library panel connection' },
      { status: 500 }
    );
  }
}