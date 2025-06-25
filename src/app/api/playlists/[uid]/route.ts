/**
 * Playlist API Routes - Individual playlist operations
 * GET /api/playlists/[uid] - Get playlist by UID
 * PUT /api/playlists/[uid] - Update playlist
 * DELETE /api/playlists/[uid] - Delete playlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/services/playlistService';
import { UpdatePlaylistRequest } from '@/types/playlist';

interface RouteParams {
  params: {
    uid: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const playlist = await playlistService.getPlaylist(params.uid);
    
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Get playlist error:', error);
    return NextResponse.json(
      { error: 'Failed to get playlist' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const updateRequest: UpdatePlaylistRequest = body;

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    const playlist = await playlistService.updatePlaylist(
      params.uid,
      updateRequest,
      userId
    );

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Update playlist error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await playlistService.deletePlaylist(params.uid);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete playlist error:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}