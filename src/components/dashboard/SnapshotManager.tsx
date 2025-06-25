'use client';

import React, { useState, useEffect } from 'react';
import { 
  Camera, Trash2, Eye, Download, Share2, Lock, Unlock, 
  Calendar, Clock, User, Search, Filter, MoreVertical,
  ChevronLeft, ChevronRight, Copy, Check, ExternalLink,
  Image, FileText, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Snapshot {
  id: string;
  dashboardId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  shareKey?: string;
  isPublic: boolean;
  viewCount: number;
  lastViewedAt?: Date;
  password?: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
  User: {
    id: string;
    name?: string;
    email: string;
  };
}

interface SnapshotManagerProps {
  dashboardId?: string;
  onSelectSnapshot?: (snapshot: Snapshot) => void;
  className?: string;
}

export function SnapshotManager({
  dashboardId,
  onSelectSnapshot,
  className = ''
}: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'viewed' | 'name'>('created');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshots();
  }, [dashboardId, page, searchQuery, filterType, sortBy]);

  const fetchSnapshots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: searchQuery,
        filter: filterType,
        sort: sortBy
      });

      if (dashboardId) {
        params.append('dashboardId', dashboardId);
      }

      const response = await fetch(`/api/dashboards/snapshots?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch snapshots');
      }

      const data = await response.json();
      setSnapshots(data.snapshots);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!dashboardId) return;

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Snapshot - ${new Date().toLocaleString()}`,
          description: 'Manual snapshot',
          includeData: true,
          isPublic: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create snapshot');
      }

      const { snapshot } = await response.json();
      setSnapshots(prev => [snapshot, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/dashboards/snapshots/${snapshotId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete snapshot');
      }

      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
    }
  };

  const handleCopyShareLink = async (snapshot: Snapshot) => {
    if (!snapshot.shareKey) return;

    const shareUrl = `${window.location.origin}/public/dashboard/${snapshot.shareKey}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(snapshot.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDownloadSnapshot = async (snapshot: Snapshot, format: 'png' | 'pdf' | 'json') => {
    try {
      const response = await fetch(
        `/api/dashboards/${snapshot.dashboardId}/snapshot?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to download snapshot');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshot-${snapshot.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download snapshot');
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const renderSnapshotCard = (snapshot: Snapshot) => {
    const isExpired = snapshot.expiresAt && new Date(snapshot.expiresAt) < new Date();
    
    return (
      <div
        key={snapshot.id}
        className={`
          relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
          transition-all duration-200 hover:shadow-md
          ${selectedSnapshot?.id === snapshot.id ? 'ring-2 ring-blue-500' : ''}
          ${isExpired ? 'opacity-75' : ''}
        `}
      >
        {/* Snapshot Preview */}
        <div 
          className="aspect-video bg-gray-100 cursor-pointer relative group"
          onClick={() => {
            setSelectedSnapshot(snapshot);
            onSelectSnapshot?.(snapshot);
          }}
        >
          {snapshot.imageUrl ? (
            <img 
              src={snapshot.imageUrl} 
              alt={snapshot.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Status badges */}
          <div className="absolute top-2 right-2 flex gap-1">
            {snapshot.isPublic ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Unlock className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
            {snapshot.password && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {isExpired && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                Expired
              </span>
            )}
          </div>
        </div>

        {/* Snapshot Info */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 truncate">{snapshot.title}</h3>
          {snapshot.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{snapshot.description}</p>
          )}
          
          <div className="mt-3 space-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{snapshot.User.name || snapshot.User.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatTimeAgo(snapshot.createdAt)}</span>
            </div>
            {snapshot.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{snapshot.viewCount} views</span>
                {snapshot.lastViewedAt && (
                  <span className="text-gray-400">• {formatTimeAgo(snapshot.lastViewedAt)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex gap-1">
            {snapshot.shareKey && (
              <button
                onClick={() => handleCopyShareLink(snapshot)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Copy share link"
              >
                {copiedId === snapshot.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => window.open(`/public/dashboard/${snapshot.shareKey || snapshot.id}`, '_blank')}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Open snapshot"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          
          <div className="relative">
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle dropdown menu (implementation depends on UI library)
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {/* Dropdown menu would go here */}
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm === snapshot.id && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-3">Delete this snapshot?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSnapshot(snapshot.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Dashboard Snapshots</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage and share dashboard snapshots
            </p>
          </div>
          {dashboardId && (
            <button
              onClick={handleCreateSnapshot}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Camera className="h-4 w-4 mr-2" />
              Create Snapshot
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search snapshots..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Snapshots</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created">Recently Created</option>
              <option value="viewed">Recently Viewed</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchSnapshots}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No snapshots yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a snapshot to save the current state of your dashboard
            </p>
            {dashboardId && (
              <button
                onClick={handleCreateSnapshot}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Create First Snapshot
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Snapshot Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {snapshots.map(renderSnapshotCard)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}