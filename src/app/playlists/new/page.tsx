/**
 * New Playlist Page
 * Create a new playlist
 */

'use client';

import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { PlaylistForm } from '@/components/playlists/PlaylistForm';

export default function NewPlaylistPage() {
  return (
    <PageLayout
      title="New Playlist"
      description="Create a new dashboard playlist"
    >
      <div className="max-w-4xl mx-auto">
        <PlaylistForm />
      </div>
    </PageLayout>
  );
}