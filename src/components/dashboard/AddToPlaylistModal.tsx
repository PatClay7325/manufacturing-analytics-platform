/**
 * Add to Playlist Modal
 * Modal for adding a dashboard to one or more playlists
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Search } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { PlaylistSummary } from '@/types/playlist';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardUid: string;
  dashboardTitle: string;
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  dashboardUid,
  dashboardTitle,
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists?limit=100');
      if (!response.ok) {
        throw new Error('Failed to load playlists');
      }

      const data = await response.json();
      setPlaylists(data.playlists);

      // Check which playlists already contain this dashboard
      const containingPlaylists: string[] = [];
      for (const playlist of data.playlists) {
        const playlistResponse = await fetch(`/api/playlists/${playlist.uid}`);
        if (playlistResponse.ok) {
          const fullPlaylist = await playlistResponse.json();
          if (fullPlaylist.items.some((item: any) => item.dashboardUid === dashboardUid)) {
            containingPlaylists.push(playlist.uid);
          }
        }
      }
      setSelectedPlaylists(containingPlaylists);
    } catch (err) {
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlaylist = (playlistUid: string) => {
    setSelectedPlaylists((prev) =>
      prev.includes(playlistUid)
        ? prev.filter((uid) => uid !== playlistUid)
        : [...prev, playlistUid]
    );
  };

  const handleCreateNew = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          interval: '5m',
          items: [
            {
              dashboardUid,
              order: 1,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const newPlaylist = await response.json();
      
      // Reload playlists
      await loadPlaylists();
      
      // Select the new playlist
      setSelectedPlaylists((prev) => [...prev, newPlaylist.uid]);
      
      // Reset form
      setNewPlaylistName('');
      setShowCreateNew(false);
    } catch (err) {
      setError('Failed to create playlist');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // For each selected playlist, add the dashboard if not already present
      for (const playlistUid of selectedPlaylists) {
        const playlistResponse = await fetch(`/api/playlists/${playlistUid}`);
        if (!playlistResponse.ok) continue;

        const playlist = await playlistResponse.json();
        const hasItem = playlist.items.some((item: any) => item.dashboardUid === dashboardUid);

        if (!hasItem) {
          // Add dashboard to playlist
          const newItems = [
            ...playlist.items,
            {
              dashboardUid,
              order: playlist.items.length + 1,
            },
          ];

          await fetch(`/api/playlists/${playlistUid}/items`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: newItems }),
          });
        }
      }

      // For each unselected playlist that previously contained the dashboard, remove it
      const unselectedPlaylists = playlists
        .filter((p) => !selectedPlaylists.includes(p.uid))
        .map((p) => p.uid);

      for (const playlistUid of unselectedPlaylists) {
        const playlistResponse = await fetch(`/api/playlists/${playlistUid}`);
        if (!playlistResponse.ok) continue;

        const playlist = await playlistResponse.json();
        const itemToRemove = playlist.items.find((item: any) => item.dashboardUid === dashboardUid);

        if (itemToRemove) {
          // Remove dashboard from playlist
          const newItems = playlist.items
            .filter((item: any) => item.dashboardUid !== dashboardUid)
            .map((item: any, index: number) => ({ ...item, order: index + 1 }));

          await fetch(`/api/playlists/${playlistUid}/items`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: newItems }),
          });
        }
      }

      onClose();
    } catch (err) {
      setError('Failed to update playlists');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlaylists = playlists.filter(
    (playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playlist.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add to Playlist</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select playlists to include "{dashboardTitle}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Content */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">{error}</div>
          ) : (
            <>
              {/* Create New Option */}
              {!showCreateNew ? (
                <button
                  onClick={() => setShowCreateNew(true)}
                  className="w-full flex items-center gap-2 p-3 rounded-md border-2 border-dashed hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Create new playlist</span>
                </button>
              ) : (
                <div className="p-3 border rounded-md space-y-2">
                  <input
                    type="text"
                    placeholder="New playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateNew}
                      disabled={!newPlaylistName.trim()}
                      className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateNew(false);
                        setNewPlaylistName('');
                      }}
                      className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-8"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Playlist List */}
              {filteredPlaylists.length > 0 && (
                <div className={cn("space-y-1", showCreateNew && "mt-2")}>
                  {filteredPlaylists.map((playlist) => (
                    <button
                      key={playlist.uid}
                      onClick={() => handleTogglePlaylist(playlist.uid)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
                        selectedPlaylists.includes(playlist.uid)
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{playlist.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {playlist.itemCount} dashboards • {playlist.interval} interval
                        </div>
                      </div>
                      {selectedPlaylists.includes(playlist.uid) && (
                        <Check className="h-4 w-4 text-primary ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {filteredPlaylists.length === 0 && !showCreateNew && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No playlists found
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}