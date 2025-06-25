/**
 * Play Playlist Page
 * Plays a playlist in kiosk/fullscreen mode
 */

'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PlaylistPlayer } from '@/components/playlists/PlaylistPlayer';

export default function PlayPlaylistPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const uid = params.uid as string;
  const kioskMode = searchParams.get('kiosk') as 'tv' | 'full' | 'disabled' | null;

  return (
    <PlaylistPlayer
      playlistUid={uid}
      kioskMode={kioskMode || 'disabled'}
    />
  );
}