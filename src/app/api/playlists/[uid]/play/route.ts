/**
 * Playlist Play Event API Routes
 * POST /api/playlists/[uid]/play - Record playlist play event
 */

import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/services/playlistService';

interface RouteParams {
  params: {
    uid: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await playlistService.recordPlayEvent(params.uid);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Record play event error:', error);
    return NextResponse.json(
      { error: 'Failed to record play event' },
      { status: 500 }
    );
  }
}