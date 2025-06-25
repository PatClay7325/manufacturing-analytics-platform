/**
 * Dashboard Templates API Routes
 * Handles CRUD operations, search, and filtering for dashboard templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { 
  DashboardTemplate, 
  TemplateSearchRequest, 
  TemplateSearchResponse,
  CreateTemplateResponse,
  TemplateStatsResponse 
} from '@/types/template';

// GET /api/templates - Search and list templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse search parameters
    const searchRequest: TemplateSearchRequest = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || [],
      industry: searchParams.get('industry')?.split(',') || [],
      manufacturingType: searchParams.get('manufacturingType') as any || undefined,
      equipmentType: searchParams.get('equipmentType') || undefined,
      isoStandard: searchParams.get('isoStandard') || undefined,
      complexityLevel: searchParams.get('complexityLevel') as any || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : undefined,
      isFeatured: searchParams.get('isFeatured') === 'true' ? true : undefined,
      isOfficial: searchParams.get('isOfficial') === 'true' ? true : undefined,
      authorId: searchParams.get('authorId') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'created',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // Build where clause
    const where: any = {};
    
    // Text search
    if (searchRequest.query) {
      where.OR = [
        { name: { contains: searchRequest.query, mode: 'insensitive' } },
        { description: { contains: searchRequest.query, mode: 'insensitive' } },
        { summary: { contains: searchRequest.query, mode: 'insensitive' } },
        { tags: { hasSome: [searchRequest.query] } }
      ];
    }
    
    // Category filter
    if (searchRequest.category) {
      where.categoryId = searchRequest.category;
    }
    
    // Tags filter
    if (searchRequest.tags && searchRequest.tags.length > 0) {
      where.tags = { hasSome: searchRequest.tags };
    }
    
    // Industry filter
    if (searchRequest.industry && searchRequest.industry.length > 0) {
      where.industry = { hasSome: searchRequest.industry };
    }
    
    // Manufacturing type filter
    if (searchRequest.manufacturingType) {
      where.manufacturingType = searchRequest.manufacturingType;
    }
    
    // Equipment type filter
    if (searchRequest.equipmentType) {
      where.equipmentTypes = { hasSome: [searchRequest.equipmentType] };
    }
    
    // ISO standard filter
    if (searchRequest.isoStandard) {
      where.isoStandards = { hasSome: [searchRequest.isoStandard] };
    }
    
    // Complexity level filter (via category)
    if (searchRequest.complexityLevel) {
      where.category = {
        complexityLevel: searchRequest.complexityLevel
      };
    }
    
    // Boolean filters
    if (searchRequest.isPublic !== undefined) {
      where.isPublic = searchRequest.isPublic;
    }
    
    if (searchRequest.isFeatured !== undefined) {
      where.isFeatured = searchRequest.isFeatured;
    }
    
    if (searchRequest.isOfficial !== undefined) {
      where.isOfficial = searchRequest.isOfficial;
    }
    
    if (searchRequest.authorId) {
      where.authorId = searchRequest.authorId;
    }

    // Build orderBy clause
    const orderBy: any = {};
    switch (searchRequest.sortBy) {
      case 'name':
        orderBy.name = searchRequest.sortOrder;
        break;
      case 'created':
        orderBy.createdAt = searchRequest.sortOrder;
        break;
      case 'updated':
        orderBy.lastUpdatedAt = searchRequest.sortOrder;
        break;
      case 'rating':
        orderBy.rating = searchRequest.sortOrder;
        break;
      case 'downloads':
        orderBy.downloadCount = searchRequest.sortOrder;
        break;
      case 'popularity':
        orderBy.downloadCount = searchRequest.sortOrder; // Use download count as popularity proxy
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    // Calculate pagination
    const page = Math.max(1, searchRequest.page || 1);
    const limit = Math.min(100, Math.max(1, searchRequest.limit || 20));
    const skip = (page - 1) * limit;

    // Execute queries
    const [templates, totalCount] = await Promise.all([
      prisma.dashboardTemplate.findMany({
        where,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              usageHistory: true,
              reviews: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.dashboardTemplate.count({ where })
    ]);

    // Get aggregations for filters
    const [categories, tags, industries, manufacturingTypes] = await Promise.all([
      prisma.dashboardTemplate.groupBy({
        by: ['categoryId'],
        where: { ...where, categoryId: { not: null } },
        _count: true
      }).then(async (results) => {
        const categoryIds = results.map(r => r.categoryId).filter(Boolean);
        const categoryData = await prisma.templateCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true }
        });
        
        return results.map(r => ({
          categoryId: r.categoryId!,
          categoryName: categoryData.find(c => c.id === r.categoryId)?.name || 'Unknown',
          count: r._count
        }));
      }),
      
      // Get top tags
      prisma.dashboardTemplate.findMany({
        where,
        select: { tags: true }
      }).then(templates => {
        const tagCounts: Record<string, number> = {};
        templates.forEach(t => {
          t.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        return Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);
      }),
      
      // Get top industries
      prisma.dashboardTemplate.findMany({
        where,
        select: { industry: true }
      }).then(templates => {
        const industryCounts: Record<string, number> = {};
        templates.forEach(t => {
          t.industry.forEach(industry => {
            industryCounts[industry] = (industryCounts[industry] || 0) + 1;
          });
        });
        return Object.entries(industryCounts)
          .map(([industry, count]) => ({ industry, count }))
          .sort((a, b) => b.count - a.count);
      }),
      
      // Get manufacturing types
      prisma.dashboardTemplate.groupBy({
        by: ['manufacturingType'],
        where: { ...where, manufacturingType: { not: null } },
        _count: true
      }).then(results => 
        results.map(r => ({
          type: r.manufacturingType as any,
          count: r._count
        }))
      )
    ]);

    const response: TemplateSearchResponse = {
      templates: templates as DashboardTemplate[],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      categories,
      tags,
      industries,
      manufacturingTypes
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Templates search error:', error);
    return NextResponse.json(
      { error: 'Failed to search templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.title || !body.config || !body.authorId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, title, config, authorId' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.dashboardTemplate.create({
      data: {
        name: body.name,
        title: body.title,
        description: body.description,
        summary: body.summary,
        config: body.config,
        variables: body.variables || {},
        panels: body.panels || {},
        categoryId: body.categoryId,
        tags: body.tags || [],
        industry: body.industry || [],
        version: body.version || '1.0.0',
        schemaVersion: body.schemaVersion || 1,
        compatibleWith: body.compatibleWith || [],
        dependencies: body.dependencies || [],
        thumbnail: body.thumbnail,
        screenshots: body.screenshots || [],
        previewConfig: body.previewConfig || {},
        isPublic: body.isPublic || false,
        isFeatured: body.isFeatured || false,
        isOfficial: body.isOfficial || false,
        manufacturingType: body.manufacturingType,
        equipmentTypes: body.equipmentTypes || [],
        isoStandards: body.isoStandards || [],
        kpiTypes: body.kpiTypes || [],
        authorId: body.authorId,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        organization: body.organization,
        sourceUrl: body.sourceUrl,
        documentationUrl: body.documentationUrl,
        supportUrl: body.supportUrl,
        updateChannel: body.updateChannel,
        publishedAt: body.isPublic ? new Date() : null
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

    // Create initial version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: template.version,
        versionNumber: 1,
        config: template.config,
        variables: template.variables,
        changeType: 'major',
        changeLog: 'Initial version',
        compatibleWith: template.compatibleWith,
        deprecatedFeatures: [],
        breakingChanges: [],
        isStable: true,
        publishedBy: template.authorId
      }
    });

    const response: CreateTemplateResponse = {
      template: template as DashboardTemplate,
      success: true,
      message: 'Template created successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// GET /api/templates/stats - Get template statistics
export async function HEAD(request: NextRequest) {
  try {
    const [
      totalTemplates,
      publicTemplates,
      featuredTemplates,
      totalDownloadsResult,
      averageRatingResult,
      topCategories,
      recentTemplates,
      trendingTemplates
    ] = await Promise.all([
      prisma.dashboardTemplate.count(),
      prisma.dashboardTemplate.count({ where: { isPublic: true } }),
      prisma.dashboardTemplate.count({ where: { isFeatured: true } }),
      prisma.dashboardTemplate.aggregate({
        _sum: { downloadCount: true }
      }),
      prisma.dashboardTemplate.aggregate({
        _avg: { rating: true }
      }),
      prisma.dashboardTemplate.groupBy({
        by: ['categoryId'],
        where: { categoryId: { not: null } },
        _count: true,
        orderBy: { _count: { categoryId: 'desc' } },
        take: 5
      }).then(async (results) => {
        const categoryIds = results.map(r => r.categoryId).filter(Boolean);
        const categoryData = await prisma.templateCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true }
        });
        
        return results.map(r => ({
          categoryId: r.categoryId!,
          categoryName: categoryData.find(c => c.id === r.categoryId)?.name || 'Unknown',
          count: r._count
        }));
      }),
      prisma.dashboardTemplate.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          category: true,
          author: { select: { id: true, name: true } }
        }
      }),
      prisma.dashboardTemplate.findMany({
        where: { isPublic: true },
        orderBy: { downloadCount: 'desc' },
        take: 5,
        include: {
          category: true,
          author: { select: { id: true, name: true } }
        }
      })
    ]);

    const stats: TemplateStatsResponse = {
      totalTemplates,
      publicTemplates,
      featuredTemplates,
      totalDownloads: totalDownloadsResult._sum.downloadCount || 0,
      averageRating: averageRatingResult._avg.rating || 0,
      topCategories,
      recentTemplates: recentTemplates as DashboardTemplate[],
      trendingTemplates: trendingTemplates as DashboardTemplate[]
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Template stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get template statistics' },
      { status: 500 }
    );
  }
}