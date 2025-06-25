/**
 * Dashboard Search Component
 * Modal for searching and selecting dashboards to add to a playlist
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Check, Folder } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Dashboard } from '@/types/dashboard';

interface DashboardSearchProps {
  onSelect: (dashboards: Dashboard[]) => void;
  onClose: () => void;
  excludeUids?: string[];
  multiple?: boolean;
}

interface DashboardSearchResult {
  uid: string;
  title: string;
  tags: string[];
  folderTitle?: string;
  folderUid?: string;
}

export function DashboardSearch({
  onSelect,
  onClose,
  excludeUids = [],
  multiple = true,
}: DashboardSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboards, setDashboards] = useState<DashboardSearchResult[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchDashboards();
  }, [searchQuery]);

  const searchDashboards = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      params.append('limit', '50');

      const response = await fetch(`/api/dashboards?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search dashboards');
      }

      const data = await response.json();
      setDashboards(
        data.filter((d: DashboardSearchResult) => !excludeUids.includes(d.uid))
      );
    } catch (err) {
      setError('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (uid: string) => {
    if (multiple) {
      setSelectedDashboards((prev) =>
        prev.includes(uid)
          ? prev.filter((id) => id !== uid)
          : [...prev, uid]
      );
    } else {
      setSelectedDashboards([uid]);
    }
  };

  const handleConfirm = () => {
    const selected = dashboards
      .filter((d) => selectedDashboards.includes(d.uid))
      .map((d) => ({
        id: d.uid,
        uid: d.uid,
        title: d.title,
        tags: d.tags,
        folderId: d.folderUid,
        folderTitle: d.folderTitle,
      } as Dashboard));

    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Dashboards</h2>
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
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">{error}</div>
          ) : dashboards.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? 'No dashboards found' : 'No dashboards available'}
            </div>
          ) : (
            <div className="space-y-1">
              {dashboards.map((dashboard) => (
                <button
                  key={dashboard.uid}
                  onClick={() => handleSelect(dashboard.uid)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
                    selectedDashboards.includes(dashboard.uid)
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{dashboard.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {dashboard.folderTitle && (
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {dashboard.folderTitle}
                        </span>
                      )}
                      {dashboard.tags.length > 0 && (
                        <span>{dashboard.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  {selectedDashboards.includes(dashboard.uid) && (
                    <Check className="h-4 w-4 text-primary ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedDashboards.length} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedDashboards.length === 0}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none"
            >
              Add {selectedDashboards.length > 0 && `(${selectedDashboards.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}