/**
 * Playlist Type Definitions
 * Analytics-compatible playlist system for automatic dashboard rotation
 */

import { Dashboard } from './dashboard';

// ============================================================================
// CORE PLAYLIST TYPES
// ============================================================================

export interface Playlist {
  id: string;
  uid: string;
  name: string;
  description?: string;
  interval: string; // e.g., "5m", "10s", "1h"
  
  // Display settings
  kioskMode: PlaylistKioskMode;
  autoPlay: boolean;
  hideNavigation: boolean;
  hideControls: boolean;
  showTimeRange: boolean;
  showVariables: boolean;
  showRefresh: boolean;
  
  // Metadata
  tags: string[];
  isActive: boolean;
  lastPlayedAt?: Date;
  playCount: number;
  
  // User tracking
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  items: PlaylistItem[];
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  dashboardUid: string;
  
  // Order and timing
  order: number;
  customInterval?: string; // Override playlist interval
  
  // Display options
  customTimeRange?: TimeRangeOverride;
  customVariables?: VariableOverride[];
  hideTimeRange: boolean;
  hideVariables: boolean;
  
  // Cached data
  dashboardTitle: string;
  dashboardTags: string[];
  
  // Statistics
  addedAt: Date;
  lastPlayedAt?: Date;
  playCount: number;
  
  // Runtime data (not persisted)
  dashboard?: Dashboard;
}

// ============================================================================
// PLAYLIST CONFIGURATION TYPES
// ============================================================================

export type PlaylistKioskMode = 'tv' | 'full' | 'disabled';

export interface TimeRangeOverride {
  from: string;
  to: string;
}

export interface VariableOverride {
  name: string;
  value: string | string[];
}

export interface PlaylistSettings {
  kioskMode: PlaylistKioskMode;
  autoPlay: boolean;
  hideNavigation: boolean;
  hideControls: boolean;
  showTimeRange: boolean;
  showVariables: boolean;
  showRefresh: boolean;
}

// ============================================================================
// PLAYLIST PLAYER TYPES
// ============================================================================

export interface PlaylistPlayerState {
  playlist: Playlist;
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: Date;
  nextTransitionTime: Date;
  timeRemaining: number;
  transitionInProgress: boolean;
}

export interface PlaylistPlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  goToIndex: (index: number) => void;
  toggleFullscreen: () => void;
  updateInterval: (interval: string) => void;
}

export interface PlaylistProgress {
  currentIndex: number;
  totalItems: number;
  currentDashboard: string;
  timeElapsed: number;
  timeRemaining: number;
  percentComplete: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  interval: string;
  tags?: string[];
  settings?: Partial<PlaylistSettings>;
  items: CreatePlaylistItemRequest[];
}

export interface CreatePlaylistItemRequest {
  dashboardUid: string;
  order: number;
  customInterval?: string;
  customTimeRange?: TimeRangeOverride;
  customVariables?: VariableOverride[];
  hideTimeRange?: boolean;
  hideVariables?: boolean;
}

export interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  interval?: string;
  tags?: string[];
  settings?: Partial<PlaylistSettings>;
  isActive?: boolean;
}

export interface UpdatePlaylistItemsRequest {
  items: PlaylistItemUpdate[];
}

export interface PlaylistItemUpdate {
  id?: string; // If provided, update existing item
  dashboardUid: string;
  order: number;
  customInterval?: string;
  customTimeRange?: TimeRangeOverride;
  customVariables?: VariableOverride[];
  hideTimeRange?: boolean;
  hideVariables?: boolean;
  remove?: boolean; // Mark item for removal
}

export interface PlaylistSearchRequest {
  query?: string;
  tags?: string[];
  isActive?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'lastPlayed';
  sortDirection?: 'asc' | 'desc';
}

export interface PlaylistSearchResponse {
  playlists: PlaylistSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PlaylistSummary {
  uid: string;
  name: string;
  description?: string;
  interval: string;
  itemCount: number;
  tags: string[];
  isActive: boolean;
  lastPlayedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PLAYLIST MANAGER STATE TYPES
// ============================================================================

export interface PlaylistManagerState {
  playlists: Playlist[];
  selectedPlaylist?: Playlist;
  isLoading: boolean;
  error?: string;
  searchQuery: string;
  filters: PlaylistFilters;
  sortBy: 'name' | 'created' | 'updated' | 'lastPlayed';
  sortDirection: 'asc' | 'desc';
}

export interface PlaylistFilters {
  tags: string[];
  isActive?: boolean;
  createdBy?: string;
}

// ============================================================================
// PLAYLIST VALIDATION TYPES
// ============================================================================

export interface PlaylistValidationResult {
  isValid: boolean;
  errors: PlaylistValidationError[];
  warnings: PlaylistValidationWarning[];
}

export interface PlaylistValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PlaylistValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// PLAYLIST EVENT TYPES
// ============================================================================

export interface PlaylistEvent {
  type: PlaylistEventType;
  playlistUid: string;
  timestamp: Date;
  data?: any;
}

export type PlaylistEventType = 
  | 'playlist.started'
  | 'playlist.stopped'
  | 'playlist.paused'
  | 'playlist.resumed'
  | 'playlist.item.changed'
  | 'playlist.completed'
  | 'playlist.error';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface IntervalOption {
  label: string;
  value: string;
}

export const INTERVAL_OPTIONS: IntervalOption[] = [
  { label: '10 seconds', value: '10s' },
  { label: '30 seconds', value: '30s' },
  { label: '1 minute', value: '1m' },
  { label: '5 minutes', value: '5m' },
  { label: '10 minutes', value: '10m' },
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
];

export const parseInterval = (interval: string): number => {
  const match = interval.match(/^(\d+)([smh])$/);
  if (!match) return 300000; // Default 5 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 300000;
  }
};

export const formatInterval = (ms: number): string => {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
};