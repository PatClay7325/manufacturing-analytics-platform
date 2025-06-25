/**
 * Silences API
 * Manages alert silencing functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Silence validation schema
const silenceSchema = z.object({
  id: z.string().optional(),
  matchers: z.array(z.object({
    name: z.string(),
    value: z.string(),
    isRegex: z.boolean().optional(),
    isEqual: z.boolean().optional()
  })),
  startsAt: z.string().optional(),
  endsAt: z.string(),
  comment: z.string().min(1),
  createdBy: z.string()
});

// Get all silences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state'); // active, pending, expired
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const now = new Date();
    let where: any = {};
    
    if (state) {
      switch (state) {
        case 'active':
          where = {
            startsAt: { lte: now },
            endsAt: { gt: now }
          };
          break;
        case 'pending':
          where = {
            startsAt: { gt: now }
          };
          break;
        case 'expired':
          where = {
            endsAt: { lte: now }
          };
          break;
      }
    }
    
    const silences = await prisma.silence.findMany({
      where,
      include: {
        _count: {
          select: {
            instances: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Transform to AnalyticsPlatform format
    const manufacturingPlatformSilences = silences.map(silence => {
      const now = new Date();
      const startsAt = new Date(silence.startsAt);
      const endsAt = new Date(silence.endsAt);
      
      let state: 'active' | 'pending' | 'expired';
      if (now < startsAt) {
        state = 'pending';
      } else if (now > endsAt) {
        state = 'expired';
      } else {
        state = 'active';
      }
      
      return {
        id: silence.id,
        matchers: silence.matchers as Array<{
          name: string;
          value: string;
          isRegex: boolean;
          isEqual: boolean;
        }>,
        startsAt: silence.startsAt.toISOString(),
        endsAt: silence.endsAt.toISOString(),
        updatedAt: silence.updatedAt.toISOString(),
        comment: silence.comment,
        createdBy: silence.createdBy,
        status: { state },
        affectedAlerts: silence._count.instances
      };
    });

    // Get total count
    const total = await prisma.silence.count({ where });

    return NextResponse.json({
      silences: manufacturingPlatformSilences,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
    
  } catch (error) {
    console.error('Failed to fetch silences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch silences' },
      { status: 500 }
    );
  }
}

// Create new silence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = silenceSchema.parse(body);
    
    // Generate ID if not provided
    const id = validatedData.id || `silence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const startsAt = validatedData.startsAt ? new Date(validatedData.startsAt) : new Date();
    const endsAt = new Date(validatedData.endsAt);
    
    // Validate dates
    if (endsAt <= startsAt) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    const silence = await prisma.silence.create({
      data: {
        id,
        matchers: validatedData.matchers,
        startsAt,
        endsAt,
        comment: validatedData.comment,
        createdBy: validatedData.createdBy
      }
    });

    // Apply silence to matching alert instances
    await applyNewSilence(silence);

    return NextResponse.json({
      id: silence.id,
      matchers: silence.matchers,
      startsAt: silence.startsAt.toISOString(),
      endsAt: silence.endsAt.toISOString(),
      comment: silence.comment,
      createdBy: silence.createdBy,
      status: { state: 'pending' }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create silence:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create silence' },
      { status: 500 }
    );
  }
}

// Update silence (extend, modify comment, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = silenceSchema.parse(body);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Silence ID is required for updates' },
        { status: 400 }
      );
    }
    
    const existingSilence = await prisma.silence.findUnique({
      where: { id }
    });
    
    if (!existingSilence) {
      return NextResponse.json(
        { error: 'Silence not found' },
        { status: 404 }
      );
    }
    
    // Check if silence is expired
    if (new Date() > existingSilence.endsAt) {
      return NextResponse.json(
        { error: 'Cannot modify expired silence' },
        { status: 400 }
      );
    }
    
    const startsAt = updateData.startsAt ? new Date(updateData.startsAt) : existingSilence.startsAt;
    const endsAt = new Date(updateData.endsAt);
    
    const silence = await prisma.silence.update({
      where: { id },
      data: {
        matchers: updateData.matchers,
        startsAt,
        endsAt,
        comment: updateData.comment,
        updatedAt: new Date()
      }
    });

    // Reapply silence logic
    await applyNewSilence(silence);

    return NextResponse.json({
      id: silence.id,
      matchers: silence.matchers,
      startsAt: silence.startsAt.toISOString(),
      endsAt: silence.endsAt.toISOString(),
      comment: silence.comment,
      createdBy: silence.createdBy,
      updatedAt: silence.updatedAt.toISOString()
    });
    
  } catch (error) {
    console.error('Failed to update silence:', error);
    return NextResponse.json(
      { error: 'Failed to update silence' },
      { status: 500 }
    );
  }
}

// Delete/expire silence
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Silence ID is required' },
        { status: 400 }
      );
    }
    
    // Instead of deleting, expire the silence immediately
    const silence = await prisma.silence.update({
      where: { id },
      data: {
        endsAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Remove silence from all alert instances
    await prisma.alertInstance.updateMany({
      where: { silenceId: id },
      data: { silenceId: null }
    });
    
    return NextResponse.json({ 
      message: 'Silence expired successfully',
      silence: {
        id: silence.id,
        expiredAt: silence.endsAt.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Failed to expire silence:', error);
    return NextResponse.json(
      { error: 'Failed to expire silence' },
      { status: 500 }
    );
  }
}

// Helper function to apply silence to matching alert instances
async function applyNewSilence(silence: any) {
  try {
    const now = new Date();
    
    // Only apply if silence is currently active
    if (now < silence.startsAt || now > silence.endsAt) {
      return;
    }
    
    // Get all active alert instances
    const alertInstances = await prisma.alertInstance.findMany({
      where: {
        status: { in: ['Alerting', 'Pending'] },
        silenceId: null
      }
    });
    
    // Check which instances match the silence matchers
    const matchingInstances = alertInstances.filter(instance => {
      const labels = instance.labels as Record<string, string>;
      
      return silence.matchers.every((matcher: any) => {
        const labelValue = labels[matcher.name];
        if (!labelValue) return false;
        
        if (matcher.isRegex) {
          try {
            const regex = new RegExp(matcher.value);
            return matcher.isEqual ? regex.test(labelValue) : !regex.test(labelValue);
          } catch {
            return false;
          }
        } else {
          return matcher.isEqual ? labelValue === matcher.value : labelValue !== matcher.value;
        }
      });
    });
    
    // Apply silence to matching instances
    if (matchingInstances.length > 0) {
      await prisma.alertInstance.updateMany({
        where: {
          fingerprint: {
            in: matchingInstances.map(i => i.fingerprint)
          }
        },
        data: {
          silenceId: silence.id
        }
      });
      
      console.log(`Applied silence ${silence.id} to ${matchingInstances.length} alert instances`);
    }
    
  } catch (error) {
    console.error('Failed to apply silence:', error);
  }
}