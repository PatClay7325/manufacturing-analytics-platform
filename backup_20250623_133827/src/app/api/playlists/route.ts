/**
 * Playlist API Routes
 * GET /api/playlists - Search playlists
 * POST /api/playlists - Create playlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/services/playlistService';
import { PlaylistSearchRequest, CreatePlaylistRequest } from '@/types/playlist';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const searchRequest: PlaylistSearchRequest = {
      query: searchParams.get('query') || undefined,
      tags: searchParams.getAll('tag'),
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: (searchParams.get('sortBy') as any) || 'name',
      sortDirection: (searchParams.get('sortDirection') as any) || 'asc',
    };

    const response = await playlistService.searchPlaylists(searchRequest);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Playlist search error:', error);
    return NextResponse.json(
      { error: 'Failed to search playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const createRequest: CreatePlaylistRequest = body;

    // Validate required fields
    if (!createRequest.name || !createRequest.interval) {
      return NextResponse.json(
        { error: 'Name and interval are required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    const playlist = await playlistService.createPlaylist(createRequest, userId);

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create playlist' },
      { status: 500 }
    );
  }
}