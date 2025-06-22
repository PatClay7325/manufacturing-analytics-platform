import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');
    const panelId = searchParams.get('panelId');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    
    // Build filter conditions
    const where: any = {};
    
    if (dashboardId) {
      where.dashboardId = dashboardId;
    }
    
    if (panelId) {
      where.panelId = panelId;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags
      };
    }
    
    // Time range filter
    if (from && to) {
      where.time = {
        gte: new Date(from),
        lte: new Date(to)
      };
    } else if (from) {
      where.time = {
        gte: new Date(from)
      };
    } else if (to) {
      where.time = {
        lte: new Date(to)
      };
    }

    const annotations = await prisma.annotation.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        time: 'desc'
      }
    });

    return NextResponse.json({ annotations });

  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'create:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      dashboardId,
      panelId,
      type,
      title,
      text,
      tags = [],
      time,
      timeEnd,
      isRegion = false,
      color,
      icon,
      url,
      newState,
      prevState,
      data
    } = body;

    // Validate required fields
    if (!type || !title || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, time' },
        { status: 400 }
      );
    }

    // Validate annotation type
    const validTypes = ['point', 'region', 'event', 'alert', 'milestone'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid annotation type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const annotation = await prisma.annotation.create({
      data: {
        dashboardId,
        panelId,
        type,
        title: title?.substring(0, 200) || '', // Limit title length
        text: text?.substring(0, 1000) || '', // Limit text length
        tags,
        time: new Date(time),
        timeEnd: timeEnd ? new Date(timeEnd) : null,
        userId: authResult.user.userId,
        isRegion,
        color,
        icon,
        url,
        newState,
        prevState,
        data: data || null
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

    return NextResponse.json({ annotation }, { status: 201 });

  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'edit:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Annotation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      text,
      tags,
      color,
      icon,
      url,
      newState,
      prevState,
      data
    } = body;

    // Check if annotation exists and user has permission to edit
    const existingAnnotation = await prisma.annotation.findUnique({
      where: { id }
    });

    if (!existingAnnotation) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      );
    }

    // Only allow editing by the creator or admin
    if (existingAnnotation.userId !== authResult.user.userId && 
        authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const annotation = await prisma.annotation.update({
      where: { id },
      data: {
        title: title?.substring(0, 200) || '',
        text: text?.substring(0, 1000) || '',
        tags,
        color,
        icon,
        url,
        newState,
        prevState,
        data: data || null
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

    return NextResponse.json({ annotation });

  } catch (error) {
    console.error('Failed to update annotation:', error);
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'delete:own');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Annotation ID is required' },
        { status: 400 }
      );
    }

    // Check if annotation exists and user has permission to delete
    const existingAnnotation = await prisma.annotation.findUnique({
      where: { id }
    });

    if (!existingAnnotation) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      );
    }

    // Only allow deletion by the creator or admin
    if (existingAnnotation.userId !== authResult.user.userId && 
        authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    await prisma.annotation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}