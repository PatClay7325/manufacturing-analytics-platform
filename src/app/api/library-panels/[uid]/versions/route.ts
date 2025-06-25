/**
 * Library Panel Versions API Routes
 * GET /api/library-panels/[uid]/versions - Get version history
 * POST /api/library-panels/[uid]/versions - Create new version
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database';

const createVersionSchema = z.object({
  model: z.record(z.any()),
  message: z.string().optional(),
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

    // Get all versions
    const versions = await prisma.libraryPanelVersion.findMany({
      where: { libraryPanelUid: uid },
      orderBy: { version: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const response = versions.map(version => ({
      id: version.id,
      version: version.version,
      model: version.model,
      message: version.message,
      createdBy: version.createdBy,
      createdAt: version.createdAt.toISOString(),
      creator: {
        id: version.creator.id,
        name: version.creator.name || 'Unknown',
        email: version.creator.email,
      },
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Library panel versions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library panel versions' },
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
    const validatedData = createVersionSchema.parse(body);
    
    // TODO: Get actual user ID from authentication
    const userId = 'system';

    // Check if library panel exists and get current version
    const libraryPanel = await prisma.libraryPanel.findUnique({
      where: { uid },
      select: { version: true },
    });

    if (!libraryPanel) {
      return NextResponse.json(
        { error: 'Library panel not found' },
        { status: 404 }
      );
    }

    const newVersion = libraryPanel.version + 1;

    // Start transaction to create version and update panel
    const result = await prisma.$transaction(async (tx) => {
      // Create new version
      const version = await tx.libraryPanelVersion.create({
        data: {
          libraryPanelUid: uid,
          version: newVersion,
          model: validatedData.model,
          message: validatedData.message || `Version ${newVersion}`,
          createdBy: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update library panel with new version and model
      await tx.libraryPanel.update({
        where: { uid },
        data: {
          version: newVersion,
          model: validatedData.model,
          updatedBy: userId,
        },
      });

      return version;
    });

    const response = {
      id: result.id,
      version: result.version,
      model: result.model,
      message: result.message,
      createdBy: result.createdBy,
      createdAt: result.createdAt.toISOString(),
      creator: {
        id: result.creator.id,
        name: result.creator.name || 'Unknown',
        email: result.creator.email,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Library panel version creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create library panel version' },
      { status: 500 }
    );
  }
}