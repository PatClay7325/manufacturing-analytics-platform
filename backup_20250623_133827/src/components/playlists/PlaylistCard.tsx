/**
 * Playlist Card Component
 * Displays a single playlist with actions
 */

'use client';

import React from 'react';
import { Play, Clock, Monitor, MoreVertical, Edit2, Trash2, Copy, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaylistSummary } from '@/types/playlist';
import { formatDistanceToNow } from 'date-fns';

interface PlaylistCardProps {
  playlist: PlaylistSummary;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  className?: string;
}

export function PlaylistCard({
  playlist,
  onPlay,
  onEdit,
  onDelete,
  onDuplicate,
  className,
}: PlaylistCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showMenu]);

  return (
    <div
      className={cn(
        'relative group rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md',
        !playlist.isActive && 'opacity-60',
        className
      )}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{playlist.name}</h3>
            {playlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {playlist.description}
              </p>
            )}
          </div>

          <div className="relative ml-2">
            <button
              onClick={handleMenuClick}
              className="p-1 rounded hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-8 z-10 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Monitor className="h-3 w-3" />
            {playlist.itemCount} {playlist.itemCount === 1 ? 'dashboard' : 'dashboards'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {playlist.interval}
          </span>
        </div>

        {/* Tags */}
        {playlist.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {playlist.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-md"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {playlist.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{playlist.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {playlist.lastPlayedAt
              ? `Played ${formatDistanceToNow(new Date(playlist.lastPlayedAt), { addSuffix: true })}`
              : 'Never played'}
          </span>
          {!playlist.isActive && (
            <span className="px-2 py-0.5 bg-muted rounded-md">Inactive</span>
          )}
        </div>

        {/* Play Button */}
        <button
          onClick={onPlay}
          className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Playlist
        </button>
      </div>
    </div>
  );
}