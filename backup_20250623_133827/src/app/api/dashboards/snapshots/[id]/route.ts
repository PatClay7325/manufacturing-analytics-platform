import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const snapshot = await prisma.dashboardSnapshot.findUnique({
      where: { 
        id: params.id,
        userId: authResult.user.userId
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ snapshot });

  } catch (error) {
    console.error('Failed to fetch snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request, 'edit:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, isPublic, expiresAt } = body;

    // Verify ownership
    const existing = await prisma.dashboardSnapshot.findUnique({
      where: { 
        id: params.id,
        userId: authResult.user.userId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    const snapshot = await prisma.dashboardSnapshot.update({
      where: { id: params.id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ snapshot });

  } catch (error) {
    console.error('Failed to update snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to update snapshot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request, 'delete:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existing = await prisma.dashboardSnapshot.findUnique({
      where: { 
        id: params.id,
        userId: authResult.user.userId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Delete associated public shares
    await prisma.publicShare.deleteMany({
      where: { snapshotId: params.id }
    });

    // Delete snapshot
    await prisma.dashboardSnapshot.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to delete snapshot' },
      { status: 500 }
    );
  }
}