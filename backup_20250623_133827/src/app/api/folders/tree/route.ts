import { NextRequest, NextResponse } from 'next/server';
import { FolderService } from '@/services/folderService';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folderService = new FolderService(auth.userId);
    const searchParams = request.nextUrl.searchParams;
    
    const rootId = searchParams.get('rootId') || undefined;
    const maxDepth = searchParams.get('maxDepth') ? parseInt(searchParams.get('maxDepth')!) : undefined;
    
    const tree = await folderService.getFolderTree(rootId, maxDepth);
    
    // Get total folder count
    const stats = await folderService.getFolderStats();
    
    return NextResponse.json({
      tree,
      totalFolders: stats.totalFolders,
      maxDepth: stats.maxDepth
    });
  } catch (error) {
    console.error('Error loading folder tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}