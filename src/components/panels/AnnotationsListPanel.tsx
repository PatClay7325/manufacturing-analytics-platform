/**
 * Annotations List Panel - Grafana-compatible annotations display
 * Shows events, markers, and annotations in a list format
 * Useful for displaying maintenance events, system changes, and important timestamps
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { MessageSquare, AlertCircle, Info, CheckCircle, XCircle, Tag, Clock, User } from 'lucide-react';
import { format, formatDistanceToNow, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AnnotationsListPanelOptions {
  limit: number;
  showTags: boolean;
  showUser: boolean;
  showTime: boolean;
  navigateToPanel: boolean;
  onlyFromThisDashboard: boolean;
  onlyInTimeRange: boolean;
  tags: string[];
  types: {
    annotation: boolean;
    alerting: boolean;
  };
  sortOrder: 'time-asc' | 'time-desc' | 'alpha-asc' | 'alpha-desc';
}

interface Annotation {
  id: string;
  time: number;
  timeEnd?: number;
  text: string;
  tags: string[];
  type: 'annotation' | 'alert';
  alertState?: 'ok' | 'pending' | 'alerting' | 'no_data';
  dashboardId?: string;
  panelId?: string;
  userId?: string;
  userName?: string;
  data?: Record<string, any>;
}

const AnnotationsListPanel: React.FC<PanelProps<AnnotationsListPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
  dashboard,
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>(options.tags || []);

  useEffect(() => {
    fetchAnnotations();
  }, [timeRange, dashboard?.uid]);

  const fetchAnnotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: timeRange.from.toString(),
        to: timeRange.to.toString(),
      });

      if (options.onlyFromThisDashboard && dashboard?.uid) {
        params.append('dashboardId', dashboard.uid);
      }

      if (options.tags && options.tags.length > 0) {
        options.tags.forEach(tag => params.append('tags', tag));
      }

      const response = await fetch(`/api/annotations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data);
      }
    } catch (error) {
      console.error('Failed to fetch annotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnotations = useMemo(() => {
    let filtered = [...annotations];

    // Filter by type
    if (!options.types.annotation) {
      filtered = filtered.filter(a => a.type !== 'annotation');
    }
    if (!options.types.alerting) {
      filtered = filtered.filter(a => a.type !== 'alert');
    }

    // Filter by time range if needed
    if (options.onlyInTimeRange && timeRange) {
      filtered = filtered.filter(a => {
        const annotationTime = new Date(a.time);
        return isWithinInterval(annotationTime, {
          start: new Date(timeRange.from),
          end: new Date(timeRange.to),
        });
      });
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(a => 
        selectedTags.some(tag => a.tags.includes(tag))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (options.sortOrder) {
        case 'time-asc':
          return a.time - b.time;
        case 'time-desc':
          return b.time - a.time;
        case 'alpha-asc':
          return a.text.localeCompare(b.text);
        case 'alpha-desc':
          return b.text.localeCompare(a.text);
        default:
          return b.time - a.time;
      }
    });

    // Apply limit
    if (options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }, [annotations, options, selectedTags, timeRange]);

  const getIcon = (annotation: Annotation) => {
    if (annotation.type === 'alert') {
      switch (annotation.alertState) {
        case 'ok':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'pending':
          return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'alerting':
          return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'no_data':
          return <XCircle className="h-4 w-4 text-gray-500" />;
        default:
          return <AlertCircle className="h-4 w-4" />;
      }
    }
    return <MessageSquare className="h-4 w-4 text-blue-500" />;
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    if (options.navigateToPanel && annotation.dashboardId && annotation.panelId) {
      // Navigate to the dashboard and panel
      window.location.href = `/d/${annotation.dashboardId}?panelId=${annotation.panelId}&from=${annotation.time - 300000}&to=${annotation.time + 300000}`;
    }
  };

  // Extract all unique tags from annotations
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    annotations.forEach(a => a.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [annotations]);

  if (loading || data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredAnnotations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No annotations found</p>
          {options.onlyInTimeRange && (
            <p className="text-sm mt-1">Try expanding the time range</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* Tag filter */}
      {options.showTags && allTags.length > 0 && (
        <div className="mb-4 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filter by tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full border transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                )}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Annotations list */}
      <div className="space-y-2">
        {filteredAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            onClick={() => handleAnnotationClick(annotation)}
            className={cn(
              "p-3 border rounded-lg transition-colors",
              options.navigateToPanel && annotation.dashboardId && annotation.panelId
                ? "cursor-pointer hover:bg-accent"
                : ""
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5">
                {getIcon(annotation)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm">{annotation.text}</div>
                
                {/* Metadata */}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {options.showTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span title={format(annotation.time, 'PPpp')}>
                        {formatDistanceToNow(annotation.time, { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  
                  {options.showUser && annotation.userName && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{annotation.userName}</span>
                    </div>
                  )}
                  
                  {options.showTags && annotation.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{annotation.tags.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Range annotation */}
                {annotation.timeEnd && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Duration: {formatDistanceToNow(annotation.timeEnd - annotation.time)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more indicator */}
      {options.limit > 0 && annotations.length > options.limit && (
        <div className="text-center mt-4 text-sm text-muted-foreground">
          Showing {options.limit} of {annotations.length} annotations
        </div>
      )}
    </div>
  );
};

export default AnnotationsListPanel;