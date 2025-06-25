/**
 * Alert Instances API
 * Manages alert instances (actual firing alerts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Get alert instances with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ruleId = searchParams.get('ruleId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const silenced = searchParams.get('silenced') === 'true';
    
    const where: any = {};
    
    if (status && status !== 'All') {
      where.status = status;
    }
    
    if (ruleId) {
      where.ruleId = ruleId;
    }
    
    if (silenced !== undefined) {
      if (silenced) {
        where.silenceId = { not: null };
      } else {
        where.silenceId = null;
      }
    }
    
    const instances = await prisma.alertInstance.findMany({
      where,
      include: {
        rule: {
          select: {
            uid: true,
            title: true,
            ruleGroup: true,
            folderUID: true
          }
        },
        silence: {
          select: {
            id: true,
            comment: true,
            endsAt: true,
            createdBy: true
          }
        }
      },
      orderBy: [
        { status: 'desc' }, // Alerting first
        { updatedAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Transform to AnalyticsPlatform format
    const manufacturingPlatformInstances = instances.map(instance => ({
      fingerprint: instance.fingerprint,
      status: instance.status,
      labels: instance.labels as Record<string, string>,
      annotations: instance.annotations as Record<string, string>,
      startsAt: instance.startsAt.toISOString(),
      endsAt: instance.endsAt?.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      generatorURL: `/d/dashboard/${instance.rule?.folderUID || 'general'}`,
      silenceURL: instance.silence ? `/alerting/silences/${instance.silence.id}` : undefined,
      dashboardUID: instance.rule?.folderUID,
      panelID: 1, // Default panel ID
      value: instance.value,
      rule: instance.rule ? {
        uid: instance.rule.uid,
        title: instance.rule.title,
        group: instance.rule.ruleGroup
      } : null,
      silence: instance.silence ? {
        id: instance.silence.id,
        comment: instance.silence.comment,
        endsAt: instance.silence.endsAt,
        createdBy: instance.silence.createdBy
      } : null
    }));

    // Get total count for pagination
    const total = await prisma.alertInstance.count({ where });

    return NextResponse.json({
      instances: manufacturingPlatformInstances,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
    
  } catch (error) {
    console.error('Failed to fetch alert instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert instances' },
      { status: 500 }
    );
  }
}

// Create alert instance (typically called by evaluation engine)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const instance = await prisma.alertInstance.create({
      data: {
        fingerprint: data.fingerprint,
        ruleId: data.ruleId,
        status: data.status,
        labels: data.labels || {},
        annotations: data.annotations || {},
        value: data.value,
        startsAt: new Date(data.startsAt || Date.now()),
        updatedAt: new Date()
      },
      include: {
        rule: {
          select: {
            uid: true,
            title: true,
            ruleGroup: true
          }
        }
      }
    });

    return NextResponse.json({
      fingerprint: instance.fingerprint,
      status: instance.status,
      labels: instance.labels,
      annotations: instance.annotations,
      startsAt: instance.startsAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      value: instance.value,
      rule: instance.rule
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create alert instance:', error);
    return NextResponse.json(
      { error: 'Failed to create alert instance' },
      { status: 500 }
    );
  }
}

// Update alert instance (resolve, acknowledge, etc.)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { fingerprint, status, endsAt, silenceId } = data;
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (status) {
      updateData.status = status;
    }
    
    if (endsAt) {
      updateData.endsAt = new Date(endsAt);
    }
    
    if (silenceId !== undefined) {
      updateData.silenceId = silenceId;
    }
    
    const instance = await prisma.alertInstance.update({
      where: { fingerprint },
      data: updateData,
      include: {
        rule: {
          select: {
            uid: true,
            title: true,
            ruleGroup: true
          }
        }
      }
    });

    return NextResponse.json({
      fingerprint: instance.fingerprint,
      status: instance.status,
      labels: instance.labels,
      annotations: instance.annotations,
      startsAt: instance.startsAt.toISOString(),
      endsAt: instance.endsAt?.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      value: instance.value,
      silenceId: instance.silenceId,
      rule: instance.rule
    });
    
  } catch (error) {
    console.error('Failed to update alert instance:', error);
    return NextResponse.json(
      { error: 'Failed to update alert instance' },
      { status: 500 }
    );
  }
}

// Delete alert instance
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' },
        { status: 400 }
      );
    }
    
    await prisma.alertInstance.delete({
      where: { fingerprint }
    });
    
    return NextResponse.json({ message: 'Alert instance deleted successfully' });
    
  } catch (error) {
    console.error('Failed to delete alert instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert instance' },
      { status: 500 }
    );
  }
}