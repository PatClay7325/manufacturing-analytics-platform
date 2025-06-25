/**
 * Playlist Player Component
 * Plays a playlist by automatically rotating through dashboards
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Maximize2,
  Minimize2,
  List,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { cn } from '@/lib/utils';
import {
  Playlist,
  PlaylistItem,
  PlaylistPlayerState,
  parseInterval,
  formatInterval,
} from '@/types/playlist';

interface PlaylistPlayerProps {
  playlistUid: string;
  kioskMode?: 'tv' | 'full' | 'disabled';
  className?: string;
}

export function PlaylistPlayer({
  playlistUid,
  kioskMode: initialKioskMode,
  className,
}: PlaylistPlayerProps) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Player state
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [kioskMode, setKioskMode] = useState(initialKioskMode || 'disabled');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Current item
  const currentItem = playlist?.items[currentIndex];
  const currentInterval = currentItem?.customInterval || playlist?.interval || '5m';
  const intervalMs = parseInterval(currentInterval);

  useEffect(() => {
    loadPlaylist();
  }, [playlistUid]);

  useEffect(() => {
    // Auto-hide controls in kiosk mode
    if (kioskMode !== 'disabled' && showControls) {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [kioskMode, showControls]);

  useEffect(() => {
    // Handle mouse movement to show controls
    const handleMouseMove = () => {
      if (kioskMode !== 'disabled') {
        setShowControls(true);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [kioskMode]);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            handleExit();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isPaused, isFullscreen, currentIndex]);

  const loadPlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistUid}`);
      if (!response.ok) {
        throw new Error('Failed to load playlist');
      }

      const data = await response.json();
      setPlaylist(data);

      // Apply playlist settings
      if (data.kioskMode && !initialKioskMode) {
        setKioskMode(data.kioskMode);
      }

      // Auto-start if configured
      if (data.autoPlay) {
        startPlaylist();
      }

      // Record play event
      fetch(`/api/playlists/${playlistUid}/play`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const startPlaylist = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setTimeRemaining(intervalMs);
    startTimer();
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      startPlaylist();
    } else if (isPaused) {
      setIsPaused(false);
      startTimer();
    } else {
      setIsPaused(true);
      stopTimer();
    }
  };

  const stopPlaylist = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setProgress(0);
    stopTimer();
  };

  const startTimer = () => {
    stopTimer();

    const startTime = Date.now();
    const duration = timeRemaining > 0 ? timeRemaining : intervalMs;

    // Update progress every 100ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = ((duration - remaining) / duration) * 100;

      setTimeRemaining(remaining);
      setProgress(progressPercent);

      if (remaining === 0) {
        goToNext();
      }
    }, 100);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const goToNext = () => {
    if (!playlist) return;

    const nextIndex = (currentIndex + 1) % playlist.items.length;
    setCurrentIndex(nextIndex);
    setTimeRemaining(parseInterval(playlist.items[nextIndex].customInterval || playlist.interval));
    setProgress(0);

    if (isPlaying && !isPaused) {
      startTimer();
    }
  };

  const goToPrevious = () => {
    if (!playlist) return;

    const prevIndex = currentIndex === 0 ? playlist.items.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setTimeRemaining(parseInterval(playlist.items[prevIndex].customInterval || playlist.interval));
    setProgress(0);

    if (isPlaying && !isPaused) {
      startTimer();
    }
  };

  const goToIndex = (index: number) => {
    if (!playlist || index < 0 || index >= playlist.items.length) return;

    setCurrentIndex(index);
    setTimeRemaining(parseInterval(playlist.items[index].customInterval || playlist.interval));
    setProgress(0);

    if (isPlaying && !isPaused) {
      startTimer();
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  };

  const handleExit = () => {
    stopPlaylist();
    router.push('/playlists');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <ErrorAlert
          message={error || 'Playlist not found'}
          onDismiss={() => router.push('/playlists')}
        />
      </div>
    );
  }

  const shouldHideUI = kioskMode === 'tv' || (kioskMode === 'full' && !showControls);

  return (
    <div className={cn('relative h-screen bg-background overflow-hidden', className)}>
      {/* Dashboard Iframe */}
      {currentItem && (
        <iframe
          src={`/d/${currentItem.dashboardUid}?kiosk=${kioskMode === 'tv' ? '1' : '0'}&theme=dark`}
          className="w-full h-full border-0"
          title={currentItem.dashboardTitle}
        />
      )}

      {/* Player Controls */}
      {!shouldHideUI && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t transition-transform duration-300',
            playlist.hideControls && kioskMode !== 'disabled' && 'translate-y-full'
          )}
        >
          {/* Progress Bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Dashboard Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{currentItem?.dashboardTitle}</div>
                <div className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {playlist.items.length} • {formatInterval(timeRemaining)} remaining
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevious}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Previous (←)"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title={isPlaying && !isPaused ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={goToNext}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Next (→)"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              {/* Right: Additional Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Show playlist"
                >
                  <List className="h-5 w-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={handleExit}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Exit (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Sidebar */}
      {showPlaylist && !shouldHideUI && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-background border-l shadow-lg overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{playlist.name}</h3>
              <button
                onClick={() => setShowPlaylist(false)}
                className="p-1 rounded hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-2">
            {playlist.items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => goToIndex(index)}
                className={cn(
                  'w-full text-left p-3 rounded-md transition-colors',
                  index === currentIndex
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.dashboardTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      #{index + 1} • {item.customInterval || playlist.interval}
                    </div>
                  </div>
                  {index === currentIndex && isPlaying && (
                    <div className="ml-2">
                      {isPaused ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}