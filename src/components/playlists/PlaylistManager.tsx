/**
 * Playlist Manager Component
 * Main component for managing playlists - create, edit, delete, search
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Play, Edit2, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaylistCard } from './PlaylistCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { cn } from '@/lib/utils';
import {
  Playlist,
  PlaylistSearchRequest,
  PlaylistSearchResponse,
} from '@/types/playlist';

interface PlaylistManagerProps {
  className?: string;
}

export function PlaylistManager({ className }: PlaylistManagerProps) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'lastPlayed'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlist: Playlist } | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, [searchQuery, selectedTags, showActiveOnly, sortBy, sortDirection, page]);

  const fetchPlaylists = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      selectedTags.forEach(tag => params.append('tag', tag));
      if (showActiveOnly) params.append('isActive', 'true');
      params.append('sortBy', sortBy);
      params.append('sortDirection', sortDirection);
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/playlists?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data: PlaylistSearchResponse = await response.json();
      setPlaylists(data.playlists as any); // Type mismatch between summary and full playlist
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playlist: Playlist) => {
    if (!confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlist.uid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }

      // Refresh the list
      fetchPlaylists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete playlist');
    }
  };

  const handleDuplicate = async (playlist: Playlist) => {
    try {
      // Fetch full playlist details
      const response = await fetch(`/api/playlists/${playlist.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlist details');
      }

      const fullPlaylist = await response.json();

      // Create duplicate
      const createResponse = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${fullPlaylist.name} (Copy)`,
          description: fullPlaylist.description,
          interval: fullPlaylist.interval,
          tags: fullPlaylist.tags,
          settings: {
            kioskMode: fullPlaylist.kioskMode,
            autoPlay: fullPlaylist.autoPlay,
            hideNavigation: fullPlaylist.hideNavigation,
            hideControls: fullPlaylist.hideControls,
            showTimeRange: fullPlaylist.showTimeRange,
            showVariables: fullPlaylist.showVariables,
            showRefresh: fullPlaylist.showRefresh,
          },
          items: fullPlaylist.items.map((item: any) => ({
            dashboardUid: item.dashboardUid,
            order: item.order,
            customInterval: item.customInterval,
            customTimeRange: item.customTimeRange,
            customVariables: item.customVariables,
            hideTimeRange: item.hideTimeRange,
            hideVariables: item.hideVariables,
          })),
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to duplicate playlist');
      }

      // Refresh the list
      fetchPlaylists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate playlist');
    }
  };

  const handlePlay = (playlist: Playlist) => {
    router.push(`/playlists/play/${playlist.uid}?kiosk=tv`);
  };

  const handleEdit = (playlist: Playlist) => {
    router.push(`/playlists/edit/${playlist.uid}`);
  };

  const handleContextMenu = (e: React.MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, playlist });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading && playlists.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-3',
              showActiveOnly
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-transparent border border-input hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Active Only
          </button>

          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => {
              const [newSortBy, newSortDirection] = e.target.value.split('-') as any;
              setSortBy(newSortBy);
              setSortDirection(newSortDirection);
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="created-desc">Newest First</option>
            <option value="created-asc">Oldest First</option>
            <option value="updated-desc">Recently Updated</option>
            <option value="lastPlayed-desc">Recently Played</option>
          </select>

          <Link
            href="/playlists/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Playlist
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No playlists found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedTags.length > 0
              ? 'Try adjusting your search criteria'
              : 'Create your first playlist to get started'}
          </p>
          {!searchQuery && selectedTags.length === 0 && (
            <Link
              href="/playlists/new"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.uid}
                onContextMenu={(e) => handleContextMenu(e, playlist)}
              >
                <PlaylistCard
                  playlist={playlist as any}
                  onPlay={() => handlePlay(playlist)}
                  onEdit={() => handleEdit(playlist)}
                  onDelete={() => handleDelete(playlist)}
                  onDuplicate={() => handleDuplicate(playlist)}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalCount > 12 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(totalCount / 12)}
              </span>
              <button
                onClick={() => setPage(Math.min(Math.ceil(totalCount / 12), page + 1))}
                disabled={page >= Math.ceil(totalCount / 12)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground rounded-md border shadow-md p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handlePlay(contextMenu.playlist);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Play className="mr-2 h-4 w-4" />
            Play
          </button>
          <button
            onClick={() => {
              handleEdit(contextMenu.playlist);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => {
              handleDuplicate(contextMenu.playlist);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => {
              handleDelete(contextMenu.playlist);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}