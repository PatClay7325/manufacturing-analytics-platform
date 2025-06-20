/**
 * Playlists Page - Grafana-compatible dashboard playlists
 * /playlists route
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Edit, Trash2, List, Clock, Monitor } from 'lucide-react';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';

interface PlaylistItem {
  type: 'dashboard_by_uid' | 'dashboard_by_tag';
  value: string;
  order: number;
  title?: string;
}

interface Playlist {
  uid: string;
  name: string;
  interval: string;
  items: PlaylistItem[];
  createdBy: string;
  created: string;
  updatedBy: string;
  updated: string;
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningPlaylist, setRunningPlaylist] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists');
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      const response = await fetch(`/api/playlists/${uid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlaylists(playlists.filter(p => p.uid !== uid));
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const handleStart = (uid: string) => {
    // Start playlist in kiosk mode
    window.location.href = `/playlists/play/${uid}?kiosk=tv`;
  };

  return (
    <PageLayout
      title="Playlists"
      description="Manage dashboard playlists for automatic rotation"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Create playlists to automatically cycle through dashboards on TVs or monitors
            </p>
          </div>
          
          <Link
            href="/playlists/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New playlist
          </Link>
        </div>

        {/* Playlists */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No playlists</h3>
            <p className="text-muted-foreground mb-4">
              Create a playlist to automatically rotate through multiple dashboards
            </p>
            <Link
              href="/playlists/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New playlist
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <div key={playlist.uid} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{playlist.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {playlist.items.length} dashboards
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {playlist.interval}
                      </span>
                    </div>
                  </div>
                  
                  {runningPlaylist === playlist.uid && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      Running
                    </span>
                  )}
                </div>

                {/* Dashboard list */}
                <div className="space-y-1 mb-4">
                  {playlist.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="text-sm text-muted-foreground truncate">
                      {index + 1}. {item.title || item.value}
                    </div>
                  ))}
                  {playlist.items.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{playlist.items.length - 3} more
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStart(playlist.uid)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </button>
                  
                  <Link
                    href={`/playlists/edit/${playlist.uid}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-accent"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Link>
                  
                  <button
                    onClick={() => handleDelete(playlist.uid)}
                    className="p-1.5 text-sm hover:bg-accent rounded text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage instructions */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h3 className="font-semibold mb-2">Using playlists</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Playlists automatically cycle through dashboards at the specified interval</li>
            <li>• Perfect for TV displays, monitoring walls, or kiosk screens</li>
            <li>• Dashboards are displayed in fullscreen kiosk mode</li>
            <li>• Press ESC to exit playlist mode</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}