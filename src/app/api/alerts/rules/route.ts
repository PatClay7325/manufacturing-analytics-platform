/**
 * Complete Alert Rules Management API
 * Full Analytics-compatible alert rule CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Alert rule validation schema
const alertRuleSchema = z.object({
  uid: z.string().optional(),
  title: z.string().min(1),
  condition: z.string().min(1),
  data: z.array(z.object({
    refId: z.string(),
    queryType: z.string().optional(),
    model: z.record(z.any()),
    datasourceUid: z.string(),
    relativeTimeRange: z.object({
      from: z.number(),
      to: z.number()
    }).optional()
  })),
  intervalSeconds: z.number().min(1),
  noDataState: z.enum(['NoData', 'Alerting', 'OK']),
  execErrState: z.enum(['OK', 'Alerting']),
  folderUID: z.string().optional(),
  ruleGroup: z.string().min(1),
  annotations: z.record(z.string()).optional(),
  labels: z.record(z.string()).optional(),
  isDraft: z.boolean().optional(),
  isPaused: z.boolean().optional()
});

// Get all alert rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderUID = searchParams.get('folderUID');
    const ruleGroup = searchParams.get('ruleGroup');
    const state = searchParams.get('state');
    
    const where: any = {};
    
    if (folderUID) {
      where.folderUID = folderUID;
    }
    
    if (ruleGroup) {
      where.ruleGroup = ruleGroup;
    }
    
    if (state && state !== 'All') {
      // Filter by current state from latest instance
      where.instances = {
        some: {
          status: state,
          updatedAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
          }
        }
      };
    }
    
    const alertRules = await prisma.alertRule.findMany({
      where,
      include: {
        data: true,
        instances: {
          orderBy: { updatedAt: 'desc' },
          take: 1
        },
        contactPoints: true,
        folder: {
          select: {
            uid: true,
            name: true
          }
        }
      },
      orderBy: [
        { ruleGroup: 'asc' },
        { title: 'asc' }
      ]
    });

    // Transform to AnalyticsPlatform format
    const manufacturingPlatformRules = alertRules.map(rule => ({
      uid: rule.uid,
      title: rule.title,
      condition: rule.condition,
      data: rule.data.map(d => ({
        refId: d.refId,
        queryType: d.queryType || '',
        model: d.model,
        datasourceUid: d.datasourceUid,
        relativeTimeRange: d.relativeTimeRange ? {
          from: d.relativeTimeRange.from,
          to: d.relativeTimeRange.to
        } : undefined
      })),
      intervalSeconds: rule.intervalSeconds,
      noDataState: rule.noDataState,
      execErrState: rule.execErrState,
      folderUID: rule.folder?.uid || rule.folderId,
      ruleGroup: rule.ruleGroup,
      annotations: rule.annotations as Record<string, string>,
      labels: rule.labels as Record<string, string>,
      isDraft: rule.isDraft,
      isPaused: rule.isPaused,
      state: rule.instances[0]?.status || 'Unknown',
      health: rule.instances[0] ? 'ok' : 'pending',
      lastEvaluation: rule.instances[0]?.updatedAt?.toISOString(),
      evaluationTime: rule.instances[0] ? '0.1s' : null,
      folder: rule.folder ? {
        uid: rule.folder.uid,
        name: rule.folder.name
      } : null
    }));

    return NextResponse.json(manufacturingPlatformRules);
  } catch (error) {
    console.error('Failed to fetch alert rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

// Create new alert rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = alertRuleSchema.parse(body);
    
    // Generate UID if not provided
    const uid = validatedData.uid || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create alert rule
    const alertRule = await prisma.alertRule.create({
      data: {
        uid,
        title: validatedData.title,
        condition: validatedData.condition,
        intervalSeconds: validatedData.intervalSeconds,
        noDataState: validatedData.noDataState,
        execErrState: validatedData.execErrState,
        folderId: validatedData.folderUID,
        ruleGroup: validatedData.ruleGroup,
        annotations: validatedData.annotations || {},
        labels: validatedData.labels || {},
        isDraft: validatedData.isDraft || false,
        isPaused: validatedData.isPaused || false,
        data: {
          create: validatedData.data.map((d, index) => ({
            refId: d.refId,
            queryType: d.queryType || '',
            model: d.model,
            datasourceUid: d.datasourceUid,
            relativeTimeRange: d.relativeTimeRange || null,
            orderIndex: index
          }))
        }
      },
      include: {
        data: true
      }
    });

    // Trigger immediate evaluation if not draft
    if (!alertRule.isDraft && !alertRule.isPaused) {
      try {
        await fetch(`${request.nextUrl.origin}/api/alerts/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ruleId: alertRule.uid, force: true })
        });
      } catch (evalError) {
        console.warn('Failed to trigger initial evaluation:', evalError);
      }
    }

    return NextResponse.json({
      uid: alertRule.uid,
      title: alertRule.title,
      condition: alertRule.condition,
      data: alertRule.data.map(d => ({
        refId: d.refId,
        queryType: d.queryType,
        model: d.model,
        datasourceUid: d.datasourceUid,
        relativeTimeRange: d.relativeTimeRange
      })),
      intervalSeconds: alertRule.intervalSeconds,
      noDataState: alertRule.noDataState,
      execErrState: alertRule.execErrState,
      folderUID: alertRule.folderId,
      ruleGroup: alertRule.ruleGroup,
      annotations: alertRule.annotations,
      labels: alertRule.labels,
      isDraft: alertRule.isDraft,
      isPaused: alertRule.isPaused
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}

// Update alert rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, ...updateData } = alertRuleSchema.parse(body);
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Rule UID is required for updates' },
        { status: 400 }
      );
    }
    
    // Update alert rule
    const alertRule = await prisma.alertRule.update({
      where: { uid },
      data: {
        title: updateData.title,
        condition: updateData.condition,
        intervalSeconds: updateData.intervalSeconds,
        noDataState: updateData.noDataState,
        execErrState: updateData.execErrState,
        folderId: updateData.folderUID,
        ruleGroup: updateData.ruleGroup,
        annotations: updateData.annotations || {},
        labels: updateData.labels || {},
        isDraft: updateData.isDraft,
        isPaused: updateData.isPaused,
        updatedAt: new Date(),
        data: {
          deleteMany: {},
          create: updateData.data.map((d, index) => ({
            refId: d.refId,
            queryType: d.queryType || '',
            model: d.model,
            datasourceUid: d.datasourceUid,
            relativeTimeRange: d.relativeTimeRange || null,
            orderIndex: index
          }))
        }
      },
      include: {
        data: true
      }
    });

    return NextResponse.json({
      uid: alertRule.uid,
      title: alertRule.title,
      condition: alertRule.condition,
      data: alertRule.data.map(d => ({
        refId: d.refId,
        queryType: d.queryType,
        model: d.model,
        datasourceUid: d.datasourceUid,
        relativeTimeRange: d.relativeTimeRange
      })),
      intervalSeconds: alertRule.intervalSeconds,
      noDataState: alertRule.noDataState,
      execErrState: alertRule.execErrState,
      folderUID: alertRule.folderId,
      ruleGroup: alertRule.ruleGroup,
      annotations: alertRule.annotations,
      labels: alertRule.labels,
      isDraft: alertRule.isDraft,
      isPaused: alertRule.isPaused
    });
    
  } catch (error) {
    console.error('Failed to update alert rule:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

// Delete alert rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Rule UID is required' },
        { status: 400 }
      );
    }
    
    // Delete alert rule and all related data
    await prisma.alertRule.delete({
      where: { uid }
    });
    
    return NextResponse.json({ message: 'Alert rule deleted successfully' });
    
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}