import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

interface RouteParams {
  params: {
    shareKey: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { shareKey } = params;

    // Get client IP for tracking
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Find and update public share
    const publicShare = await prisma.publicShare.findUnique({
      where: { shareKey },
      select: {
        id: true,
        viewCount: true,
        viewHistory: true,
        maxViews: true,
        isActive: true,
        expiresAt: true
      }
    });

    if (!publicShare) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if share is still valid
    if (!publicShare.isActive || 
        (publicShare.expiresAt && new Date(publicShare.expiresAt) < new Date()) ||
        (publicShare.maxViews && publicShare.viewCount >= publicShare.maxViews)) {
      return NextResponse.json(
        { error: 'Share link is no longer valid' },
        { status: 403 }
      );
    }

    // Update view history
    const viewHistory = (publicShare.viewHistory as any[]) || [];
    viewHistory.push({
      timestamp: new Date().toISOString(),
      ip: clientIp
    });

    // Keep only last 100 views in history
    if (viewHistory.length > 100) {
      viewHistory.splice(0, viewHistory.length - 100);
    }

    // Update view count and history
    await prisma.publicShare.update({
      where: { id: publicShare.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        lastViewedBy: clientIp,
        viewHistory
      }
    });

    // Also update snapshot view count if this is a snapshot share
    const fullShare = await prisma.publicShare.findUnique({
      where: { shareKey },
      select: { snapshotId: true }
    });

    if (fullShare?.snapshotId) {
      await prisma.dashboardSnapshot.update({
        where: { id: fullShare.snapshotId },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to track view:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}