import { NextRequest, NextResponse } from 'next/server';
import { FolderService } from '@/services/folderService';
import { verifyAuth } from '@/lib/auth';
import { FolderMoveRequest } from '@/types/folder';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folderService = new FolderService(auth.userId);
    const body = await request.json();
    
    const moveRequest: FolderMoveRequest = {
      folderId: id,
      targetParentId: body.targetParentId,
      position: body.position
    };
    
    const folder = await folderService.moveFolder(moveRequest);
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error moving folder:', error);
    
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
      if (error.message.includes('Cannot move')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}