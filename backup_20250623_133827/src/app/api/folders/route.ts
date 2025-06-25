import { NextRequest, NextResponse } from 'next/server';
import { FolderService } from '@/services/folderService';
import { verifyAuth } from '@/lib/auth';
import { CreateFolderRequest, FolderSearchRequest } from '@/types/folder';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folderService = new FolderService(auth.userId);
    const searchParams = request.nextUrl.searchParams;
    
    // Build search request
    const searchRequest: FolderSearchRequest = {
      query: searchParams.get('query') || undefined,
      parentId: searchParams.get('parentId') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      permission: searchParams.get('permission') as any,
      includeChildren: searchParams.get('includeChildren') === 'true',
      depth: searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') as any || 'name',
      sortDirection: searchParams.get('sortDirection') as any || 'asc'
    };

    const result = await folderService.searchFolders(searchRequest);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folderService = new FolderService(auth.userId);
    const body: CreateFolderRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const folder = await folderService.createFolder(body);
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Permission denied')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}