/**
 * Playlist Items API Routes
 * PUT /api/playlists/[uid]/items - Update playlist items (add, remove, reorder)
 */

import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/services/playlistService';
import { UpdatePlaylistItemsRequest } from '@/types/playlist';

interface RouteParams {
  params: {
    uid: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const updateRequest: UpdatePlaylistItemsRequest = body;

    if (!updateRequest.items || !Array.isArray(updateRequest.items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    const playlist = await playlistService.updatePlaylistItems(
      params.uid,
      updateRequest,
      userId
    );

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Update playlist items error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update playlist items' },
      { status: 500 }
    );
  }
}