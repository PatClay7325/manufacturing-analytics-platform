/**
 * Template Categories API Routes
 * Handles CRUD operations for template categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { TemplateCategory } from '@/types/template';

// GET /api/templates/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeCount = searchParams.get('includeCount') === 'true';
    const parentId = searchParams.get('parentId');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    
    if (parentId !== null) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const categories = await prisma.templateCategory.findMany({
      where,
      include: {
        parent: true,
        children: true,
        ...(includeCount && {
          templates: {
            select: { id: true },
            where: { isPublic: true }
          }
        })
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Add template count if requested
    const processedCategories = categories.map(category => ({
      ...category,
      ...(includeCount && {
        templateCount: category.templates?.length || 0
      }),
      templates: undefined // Remove templates from response to keep it clean
    }));

    return NextResponse.json(processedCategories);
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to get categories' },
      { status: 500 }
    );
  }
}

// POST /api/templates/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.displayName || !body.slug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, slug' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existingCategory = await prisma.templateCategory.findUnique({
      where: { slug: body.slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      );
    }

    // Validate parent exists if specified
    if (body.parentId) {
      const parent = await prisma.templateCategory.findUnique({
        where: { id: body.parentId }
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.templateCategory.create({
      data: {
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        slug: body.slug,
        parentId: body.parentId,
        icon: body.icon,
        color: body.color,
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
        industryFocus: body.industryFocus || [],
        complexityLevel: body.complexityLevel
      },
      include: {
        parent: true,
        children: true
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}