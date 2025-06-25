/**
 * Edit Playlist Page
 * Edit an existing playlist
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { PlaylistForm } from '@/components/playlists/PlaylistForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Playlist } from '@/types/playlist';

export default function EditPlaylistPage() {
  const params = useParams();
  const uid = params.uid as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylist();
  }, [uid]);

  const loadPlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${uid}`);
      if (!response.ok) {
        throw new Error('Failed to load playlist');
      }

      const data = await response.json();
      setPlaylist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Edit Playlist" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error || !playlist) {
    return (
      <PageLayout title="Edit Playlist" description="Error loading playlist">
        <ErrorAlert message={error || 'Playlist not found'} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Edit ${playlist.name}`}
      description="Update playlist settings and dashboards"
    >
      <div className="max-w-4xl mx-auto">
        <PlaylistForm playlist={playlist} />
      </div>
    </PageLayout>
  );
}