/**
 * Playlists Page - Analytics-compatible dashboard playlists
 * /playlists route
 */

'use client';

import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { PlaylistManager } from '@/components/playlists/PlaylistManager';

export default function PlaylistsPage() {
  return (
    <PageLayout
      title="Playlists"
      description="Manage dashboard playlists for automatic rotation"
    >
      <PlaylistManager />
    </PageLayout>
  );
}