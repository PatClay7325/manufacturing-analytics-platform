/**
 * Dashboard Snapshot API
 * Create and manage dashboard snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Note: Authentication is handled by custom middleware for now
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication when NextAuth is configured
    // For now, we'll use a basic check or allow requests

    const body = await request.json();
    const { dashboardId, name, expires, external } = body;

    // Fetch dashboard with all data
    const dashboard = await prisma.dashboard.findUnique({
      where: { uid: dashboardId },
      include: {
        panels: true,
        variables: true,
        annotations: true,
      },
    });

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (dashboard.createdBy !== session.user.id && !dashboard.isPublic) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generate snapshot key
    const snapshotKey = nanoid(20);
    const deleteKey = nanoid(32);

    // Fetch current panel data
    const panelData = await Promise.all(
      dashboard.panels.map(async (panel) => {
        // In a real implementation, this would fetch actual data
        // For now, we'll include mock data
        return {
          panelId: panel.id,
          data: {
            series: [
              {
                name: 'Snapshot Data',
                fields: [
                  {
                    name: 'time',
                    type: 'time',
                    values: Array.from({ length: 50 }, (_, i) => 
                      Date.now() - (50 - i) * 60000
                    ),
                  },
                  {
                    name: 'value',
                    type: 'number',
                    values: Array.from({ length: 50 }, () => 
                      Math.random() * 100
                    ),
                  },
                ],
                length: 50,
              },
            ],
          },
        };
      })
    );

    // Create snapshot record
    const snapshot = await prisma.dashboardSnapshot.create({
      data: {
        key: snapshotKey,
        deleteKey,
        name: name || dashboard.title + ' Snapshot',
        dashboardId: dashboard.id,
        dashboard: {
          ...dashboard,
          snapshot: true,
          snapshotData: panelData,
        },
        expires: expires ? new Date(Date.now() + expires * 1000) : null,
        external,
        createdBy: session.user.id,
      },
    });

    // If external, also publish to external service
    if (external) {
      // In production, this would publish to snapshot.raintank.io
      console.log('Publishing to external snapshot service...');
    }

    return NextResponse.json({
      key: snapshotKey,
      deleteKey,
      url: `/dashboard/snapshot/${snapshotKey}`,
      deleteUrl: `/api/dashboards/snapshot/${snapshotKey}?deleteKey=${deleteKey}`,
    });
  } catch (error) {
    console.error('Snapshot creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { error: 'Snapshot key required' },
      { status: 400 }
    );
  }

  try {
    const snapshot = await prisma.dashboardSnapshot.findUnique({
      where: { key },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (snapshot.expires && new Date(snapshot.expires) < new Date()) {
      await prisma.dashboardSnapshot.delete({ where: { id: snapshot.id } });
      return NextResponse.json(
        { error: 'Snapshot has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json(snapshot.dashboard);
  } catch (error) {
    console.error('Snapshot fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const deleteKey = searchParams.get('deleteKey');

  if (!key || !deleteKey) {
    return NextResponse.json(
      { error: 'Snapshot key and delete key required' },
      { status: 400 }
    );
  }

  try {
    const snapshot = await prisma.dashboardSnapshot.findUnique({
      where: { key },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    if (snapshot.deleteKey !== deleteKey) {
      return NextResponse.json(
        { error: 'Invalid delete key' },
        { status: 403 }
      );
    }

    await prisma.dashboardSnapshot.delete({ where: { id: snapshot.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Snapshot deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete snapshot' },
      { status: 500 }
    );
  }
}