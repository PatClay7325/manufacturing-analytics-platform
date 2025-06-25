/**
 * Playlist Form Component
 * Form for creating and editing playlists
 */

'use client';

import React, { useState } from 'react';
import { Save, X, Plus, GripVertical, Trash2, Settings, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { DashboardSearch } from './DashboardSearch';
import { cn } from '@/lib/utils';
import {
  Playlist,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  PlaylistSettings,
  PlaylistItem,
  INTERVAL_OPTIONS,
} from '@/types/playlist';
import { Dashboard } from '@/types/dashboard';

interface PlaylistFormProps {
  playlist?: Playlist;
  onSave?: (playlist: Playlist) => void;
  onCancel?: () => void;
  className?: string;
}

export function PlaylistForm({
  playlist,
  onSave,
  onCancel,
  className,
}: PlaylistFormProps) {
  const router = useRouter();
  const isEdit = !!playlist;

  // Form state
  const [name, setName] = useState(playlist?.name || '');
  const [description, setDescription] = useState(playlist?.description || '');
  const [interval, setInterval] = useState(playlist?.interval || '5m');
  const [tags, setTags] = useState<string[]>(playlist?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [settings, setSettings] = useState<PlaylistSettings>({
    kioskMode: playlist?.kioskMode || 'tv',
    autoPlay: playlist?.autoPlay ?? true,
    hideNavigation: playlist?.hideNavigation ?? true,
    hideControls: playlist?.hideControls ?? false,
    showTimeRange: playlist?.showTimeRange ?? true,
    showVariables: playlist?.showVariables ?? true,
    showRefresh: playlist?.showRefresh ?? false,
  });
  const [items, setItems] = useState<PlaylistItem[]>(playlist?.items || []);
  const [isActive, setIsActive] = useState(playlist?.isActive ?? true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDashboardSearch, setShowDashboardSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!name.trim()) {
      setError('Playlist name is required');
      return;
    }

    if (!interval) {
      setError('Interval is required');
      return;
    }

    setSaving(true);

    try {
      const url = isEdit ? `/api/playlists/${playlist.uid}` : '/api/playlists';
      const method = isEdit ? 'PUT' : 'POST';

      const body: CreatePlaylistRequest | UpdatePlaylistRequest = isEdit
        ? {
            name,
            description: description || undefined,
            interval,
            tags,
            settings,
            isActive,
          }
        : {
            name,
            description: description || undefined,
            interval,
            tags,
            settings,
            items: items.map((item, index) => ({
              dashboardUid: item.dashboardUid,
              order: index + 1,
              customInterval: item.customInterval,
              customTimeRange: item.customTimeRange,
              customVariables: item.customVariables,
              hideTimeRange: item.hideTimeRange,
              hideVariables: item.hideVariables,
            })),
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save playlist');
      }

      const savedPlaylist = await response.json();

      // If editing, update items separately
      if (isEdit && items !== playlist.items) {
        const itemsResponse = await fetch(`/api/playlists/${playlist.uid}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((item, index) => ({
              id: item.id,
              dashboardUid: item.dashboardUid,
              order: index + 1,
              customInterval: item.customInterval,
              customTimeRange: item.customTimeRange,
              customVariables: item.customVariables,
              hideTimeRange: item.hideTimeRange,
              hideVariables: item.hideVariables,
            })),
          }),
        });

        if (!itemsResponse.ok) {
          throw new Error('Failed to update playlist items');
        }
      }

      if (onSave) {
        onSave(savedPlaylist);
      } else {
        router.push('/playlists');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/playlists');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddDashboards = (dashboards: Dashboard[]) => {
    const newItems: PlaylistItem[] = dashboards.map((dashboard, index) => ({
      id: `new-${Date.now()}-${index}`,
      playlistId: playlist?.id || '',
      dashboardUid: dashboard.uid,
      order: items.length + index + 1,
      dashboardTitle: dashboard.title,
      dashboardTags: dashboard.tags,
      hideTimeRange: false,
      hideVariables: false,
      addedAt: new Date(),
      playCount: 0,
    }));

    setItems([...items, ...newItems]);
    setShowDashboardSearch(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newItems = [...items];
    const draggedContent = newItems[draggedItem];
    newItems.splice(draggedItem, 1);
    newItems.splice(index, 0, draggedContent);
    setItems(newItems);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const updateItemSetting = (index: number, key: keyof PlaylistItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    setItems(newItems);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Playlist"
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this playlist"
            rows={3}
            className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Default Interval *
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            How long each dashboard is displayed before rotating to the next
          </p>
        </div>

        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Tags
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add tags..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-md"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>
        )}
      </div>

      {/* Display Settings */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Settings className={cn('h-4 w-4 transition-transform', showSettings && 'rotate-90')} />
          Display Settings
        </button>

        {showSettings && (
          <div className="pl-6 space-y-3">
            <div>
              <label className="text-sm font-medium">Kiosk Mode</label>
              <select
                value={settings.kioskMode}
                onChange={(e) => setSettings({ ...settings, kioskMode: e.target.value as any })}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="tv">TV Mode (hide all UI)</option>
                <option value="full">Full Mode (minimal UI)</option>
                <option value="disabled">Disabled (normal UI)</option>
              </select>
            </div>

            <div className="space-y-2">
              {[
                { key: 'autoPlay', label: 'Auto-play on start' },
                { key: 'hideNavigation', label: 'Hide navigation menu' },
                { key: 'hideControls', label: 'Hide player controls' },
                { key: 'showTimeRange', label: 'Show time range picker' },
                { key: 'showVariables', label: 'Show dashboard variables' },
                { key: 'showRefresh', label: 'Show refresh button' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={settings[key as keyof PlaylistSettings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={key} className="text-sm">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Dashboards</h3>
          <button
            type="button"
            onClick={() => setShowDashboardSearch(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Dashboards
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 border rounded-lg border-dashed">
            <p className="text-sm text-muted-foreground mb-2">No dashboards in playlist</p>
            <button
              type="button"
              onClick={() => setShowDashboardSearch(true)}
              className="text-sm text-primary hover:underline"
            >
              Add dashboards to get started
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-2 p-3 border rounded-lg bg-card cursor-move',
                  draggedItem === index && 'opacity-50'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.dashboardTitle}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>#{index + 1}</span>
                    {item.customInterval && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.customInterval}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateItemSetting(index, 'customInterval', prompt('Custom interval (e.g., 30s, 2m):', item.customInterval || ''))}
                  className="p-1 hover:bg-accent rounded"
                  title="Set custom interval"
                >
                  <Clock className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-1 hover:bg-accent rounded text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Update' : 'Create'} Playlist
            </>
          )}
        </button>
      </div>

      {/* Dashboard Search Modal */}
      {showDashboardSearch && (
        <DashboardSearch
          onSelect={handleAddDashboards}
          onClose={() => setShowDashboardSearch(false)}
          excludeUids={items.map((item) => item.dashboardUid)}
        />
      )}
    </form>
  );
}