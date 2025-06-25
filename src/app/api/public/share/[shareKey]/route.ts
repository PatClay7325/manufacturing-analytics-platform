import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: {
    shareKey: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shareKey } = params;
    const password = request.headers.get('X-Share-Password');

    // Find public share
    const publicShare = await prisma.publicShare.findUnique({
      where: { shareKey },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Dashboard: {
          select: {
            id: true,
            uid: true,
            title: true,
            panels: true,
            variables: true,
            time: true,
            refresh: true,
            tags: true
          }
        },
        Snapshot: {
          select: {
            id: true,
            title: true,
            config: true,
            data: true,
            imageUrl: true
          }
        }
      }
    });

    if (!publicShare) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if share is active
    if (!publicShare.isActive) {
      return NextResponse.json(
        { error: 'This share link is no longer active' },
        { status: 403 }
      );
    }

    // Check expiration
    if (publicShare.expiresAt && new Date(publicShare.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This share link has expired' },
        { status: 403 }
      );
    }

    // Check max views
    if (publicShare.maxViews && publicShare.viewCount >= publicShare.maxViews) {
      return NextResponse.json(
        { error: 'This share link has reached its view limit' },
        { status: 403 }
      );
    }

    // Check password
    if (publicShare.password) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, publicShare.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password', requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Get client IP for tracking
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Return share data without updating view count yet
    // View count will be updated by a separate endpoint
    return NextResponse.json({
      id: publicShare.id,
      dashboardId: publicShare.dashboardId,
      title: publicShare.title,
      dashboard: publicShare.Dashboard,
      snapshot: publicShare.Snapshot,
      isActive: publicShare.isActive,
      expiresAt: publicShare.expiresAt,
      viewCount: publicShare.viewCount,
      lastViewedAt: publicShare.lastViewedAt,
      theme: publicShare.theme,
      showTimeRange: publicShare.showTimeRange,
      showVariables: publicShare.showVariables,
      showRefresh: publicShare.showRefresh,
      allowExport: publicShare.allowExport,
      allowPrint: publicShare.allowPrint,
      allowEmbed: publicShare.allowEmbed,
      lockedTimeFrom: publicShare.lockedTimeFrom,
      lockedTimeTo: publicShare.lockedTimeTo,
      lockedVariables: publicShare.lockedVariables,
      createdAt: publicShare.createdAt,
      User: publicShare.User
    });

  } catch (error) {
    console.error('Failed to fetch public share:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share data' },
      { status: 500 }
    );
  }
}