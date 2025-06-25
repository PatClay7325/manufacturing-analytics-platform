/**
 * Individual Template API Routes
 * Handles operations on specific templates by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { 
  DashboardTemplate, 
  UpdateTemplateResponse,
  DeleteTemplateResponse,
  TemplateValidationResult
} from '@/types/template';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/templates/[id] - Get template by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const template = await prisma.dashboardTemplate.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        usageHistory: {
          select: {
            id: true,
            usageType: true,
            timestamp: true,
            userId: true
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        },
        collectionItems: {
          include: {
            collection: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template as DashboardTemplate);
  } catch (error) {
    console.error('Get template error:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates/[id] - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();

    // Check if template exists
    const existingTemplate = await prisma.dashboardTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create new version if config changed
    let shouldCreateVersion = false;
    let newVersionNumber = 1;

    if (body.config && JSON.stringify(body.config) !== JSON.stringify(existingTemplate.config)) {
      shouldCreateVersion = true;
      
      // Get latest version number
      const latestVersion = await prisma.templateVersion.findFirst({
        where: { templateId: params.id },
        orderBy: { versionNumber: 'desc' }
      });
      
      newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    }

    // Update template
    const updatedTemplate = await prisma.dashboardTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name,
        title: body.title,
        description: body.description,
        summary: body.summary,
        config: body.config,
        variables: body.variables,
        panels: body.panels,
        categoryId: body.categoryId,
        tags: body.tags,
        industry: body.industry,
        version: body.version,
        compatibleWith: body.compatibleWith,
        dependencies: body.dependencies,
        thumbnail: body.thumbnail,
        screenshots: body.screenshots,
        previewConfig: body.previewConfig,
        isPublic: body.isPublic,
        isFeatured: body.isFeatured,
        isOfficial: body.isOfficial,
        isDeprecated: body.isDeprecated,
        manufacturingType: body.manufacturingType,
        equipmentTypes: body.equipmentTypes,
        isoStandards: body.isoStandards,
        kpiTypes: body.kpiTypes,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        organization: body.organization,
        sourceUrl: body.sourceUrl,
        documentationUrl: body.documentationUrl,
        supportUrl: body.supportUrl,
        updateChannel: body.updateChannel,
        publishedAt: body.isPublic && !existingTemplate.isPublic ? new Date() : existingTemplate.publishedAt
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create new version if needed
    if (shouldCreateVersion) {
      await prisma.templateVersion.create({
        data: {
          templateId: params.id,
          version: body.version || existingTemplate.version,
          versionNumber: newVersionNumber,
          config: body.config,
          variables: body.variables,
          changeType: body.changeType || 'minor',
          changeLog: body.changeLog || 'Template updated',
          migrationNotes: body.migrationNotes,
          compatibleWith: body.compatibleWith || existingTemplate.compatibleWith,
          deprecatedFeatures: body.deprecatedFeatures || [],
          breakingChanges: body.breakingChanges || [],
          isStable: body.isStable !== undefined ? body.isStable : true,
          isBeta: body.isBeta || false,
          isAlpha: body.isAlpha || false,
          publishedBy: body.updatedBy || existingTemplate.authorId
        }
      });
    }

    const response: UpdateTemplateResponse = {
      template: updatedTemplate as DashboardTemplate,
      success: true,
      message: 'Template updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check if template exists
    const template = await prisma.dashboardTemplate.findUnique({
      where: { id: params.id },
      include: {
        usageHistory: true,
        reviews: true,
        versions: true,
        collectionItems: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Delete in transaction to maintain referential integrity
    await prisma.$transaction(async (tx) => {
      // Delete collection items
      await tx.templateCollectionItem.deleteMany({
        where: { templateId: params.id }
      });

      // Delete versions
      await tx.templateVersion.deleteMany({
        where: { templateId: params.id }
      });

      // Delete reviews
      await tx.templateReview.deleteMany({
        where: { templateId: params.id }
      });

      // Delete usage history
      await tx.templateUsage.deleteMany({
        where: { templateId: params.id }
      });

      // Delete template
      await tx.dashboardTemplate.delete({
        where: { id: params.id }
      });
    });

    const response: DeleteTemplateResponse = {
      success: true,
      message: 'Template deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id] - Partial update (for quick operations like starring, rating)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { operation } = body;

    switch (operation) {
      case 'increment_downloads':
        await prisma.dashboardTemplate.update({
          where: { id: params.id },
          data: {
            downloadCount: {
              increment: 1
            }
          }
        });
        break;

      case 'update_rating':
        const { rating, userId } = body;
        
        // Update or create review
        await prisma.templateReview.upsert({
          where: {
            templateId_userId: {
              templateId: params.id,
              userId
            }
          },
          update: {
            rating,
            updatedAt: new Date()
          },
          create: {
            templateId: params.id,
            userId,
            rating,
            isApproved: true
          }
        });

        // Recalculate average rating
        const avgRating = await prisma.templateReview.aggregate({
          where: { 
            templateId: params.id,
            isApproved: true 
          },
          _avg: { rating: true },
          _count: { rating: true }
        });

        await prisma.dashboardTemplate.update({
          where: { id: params.id },
          data: {
            rating: avgRating._avg.rating,
            ratingCount: avgRating._count.rating
          }
        });
        break;

      case 'toggle_featured':
        await prisma.dashboardTemplate.update({
          where: { id: params.id },
          data: {
            isFeatured: body.isFeatured
          }
        });
        break;

      case 'toggle_public':
        await prisma.dashboardTemplate.update({
          where: { id: params.id },
          data: {
            isPublic: body.isPublic,
            publishedAt: body.isPublic ? new Date() : null
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Patch template error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}