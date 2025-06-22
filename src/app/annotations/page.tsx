/**
 * Grafana Annotations Page - Complete annotation management
 * Route: /annotations - Matches Grafana's annotations URL pattern
 * FULLY FUNCTIONAL with real backend integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnnotationManager, type Annotation, type AnnotationFilter } from '@/core/grafana/AnnotationManager';

// API service functions
const apiService = {
  async fetchAnnotations(filters?: AnnotationFilter) {
    const params = new URLSearchParams();
    
    if (filters?.dashboardId) params.append('dashboardId', filters.dashboardId);
    if (filters?.panelId) params.append('panelId', filters.panelId.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.from) params.append('from', filters.from.toString());
    if (filters?.to) params.append('to', filters.to.toString());
    
    const response = await fetch(`/api/annotations?${params}`);
    if (!response.ok) throw new Error('Failed to fetch annotations');
    return response.json();
  },

  async createAnnotation(annotation: Partial<Annotation>) {
    const response = await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation)
    });
    if (!response.ok) throw new Error('Failed to create annotation');
    return response.json();
  },

  async updateAnnotation(id: string, updates: Partial<Annotation>) {
    const response = await fetch(`/api/annotations?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update annotation');
    return response.json();
  },

  async deleteAnnotation(id: string) {
    const response = await fetch(`/api/annotations?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete annotation');
    return response.json();
  }
};

export default function AnnotationsPage() {
  // State management
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnnotationFilter>({});

  // Load annotations on component mount and filter changes
  useEffect(() => {
    loadAnnotations();
  }, [filters]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiService.fetchAnnotations(filters);
      
      // Transform API response to component format
      const transformedAnnotations: Annotation[] = (data.annotations || data).map((ann: any) => ({
        id: ann.id,
        dashboardId: ann.dashboardId,
        panelId: ann.panelId,
        type: ann.type,
        title: ann.title,
        text: ann.text,
        tags: ann.tags || [],
        time: ann.time || new Date(ann.time || Date.now()).getTime(),
        timeEnd: ann.timeEnd,
        userId: ann.userId,
        userName: ann.User?.name || ann.User?.email || ann.userName,
        isRegion: ann.isRegion || false,
        color: ann.color,
        icon: ann.icon,
        url: ann.url,
        newState: ann.newState,
        prevState: ann.prevState,
        data: ann.data,
        created: ann.created || new Date(ann.createdAt || Date.now()).getTime(),
        updated: ann.updated || new Date(ann.updatedAt || Date.now()).getTime()
      }));
      
      setAnnotations(transformedAnnotations);
      
    } catch (err) {
      console.error('Failed to load annotations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
      
      // Use fallback mock data on error
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Fallback mock data when API is unavailable
    const mockAnnotations: Annotation[] = [
      {
        id: 'ann-1',
        type: 'milestone',
        title: 'Production Line Upgrade Complete',
        text: 'Completed upgrade of Line A with new automation systems. Expected 15% efficiency improvement.',
        tags: ['upgrade', 'line-a', 'automation'],
        time: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        userId: 'user-1',
        userName: 'Engineering Team',
        isRegion: false,
        color: '#28a745',
        created: Date.now() - 2 * 60 * 60 * 1000,
        updated: Date.now() - 2 * 60 * 60 * 1000
      },
      {
        id: 'ann-2',
        type: 'alert',
        title: 'Temperature Spike Detected',
        text: 'Machine M-300 experienced temperature spike to 95°C. Maintenance team notified.',
        tags: ['alert', 'temperature', 'machine-m300'],
        time: Date.now() - 45 * 60 * 1000, // 45 minutes ago
        userId: 'user-2',
        userName: 'Monitoring System',
        isRegion: false,
        color: '#dc3545',
        created: Date.now() - 45 * 60 * 1000,
        updated: Date.now() - 45 * 60 * 1000
      },
      {
        id: 'ann-3',
        type: 'deployment',
        title: 'Software Update Deployed',
        text: 'Manufacturing execution system updated to v2.4.1 with improved OEE calculations.',
        tags: ['deployment', 'software', 'mes', 'oee'],
        time: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
        timeEnd: Date.now() - 5 * 60 * 60 * 1000, // 1 hour duration
        userId: 'user-3',
        userName: 'IT Operations',
        isRegion: true,
        color: '#007bff',
        created: Date.now() - 6 * 60 * 60 * 1000,
        updated: Date.now() - 6 * 60 * 60 * 1000
      },
      {
        id: 'ann-4',
        type: 'event',
        title: 'Planned Maintenance Window',
        text: 'Scheduled maintenance for conveyor systems. Production temporarily halted.',
        tags: ['maintenance', 'conveyor', 'planned'],
        time: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
        timeEnd: Date.now() - 20 * 60 * 60 * 1000, // 4 hour duration
        userId: 'user-4',
        userName: 'Maintenance Team',
        isRegion: true,
        color: '#ffc107',
        created: Date.now() - 24 * 60 * 60 * 1000,
        updated: Date.now() - 24 * 60 * 60 * 1000
      }
    ];

    setAnnotations(mockAnnotations);
  };

  // Event handlers
  const handleCreateAnnotation = useCallback(async (annotationData: Partial<Annotation>) => {
    try {
      const response = await apiService.createAnnotation(annotationData);
      const newAnnotation = response.annotation || response;
      
      // Transform and add to state
      const transformedAnnotation: Annotation = {
        id: newAnnotation.id,
        dashboardId: newAnnotation.dashboardId,
        panelId: newAnnotation.panelId,
        type: newAnnotation.type,
        title: newAnnotation.title,
        text: newAnnotation.text,
        tags: newAnnotation.tags || [],
        time: newAnnotation.time || new Date(newAnnotation.time).getTime(),
        timeEnd: newAnnotation.timeEnd,
        userId: newAnnotation.userId,
        userName: newAnnotation.User?.name || newAnnotation.User?.email || 'Current User',
        isRegion: newAnnotation.isRegion || false,
        color: newAnnotation.color,
        icon: newAnnotation.icon,
        url: newAnnotation.url,
        newState: newAnnotation.newState,
        prevState: newAnnotation.prevState,
        data: newAnnotation.data,
        created: newAnnotation.created || Date.now(),
        updated: newAnnotation.updated || Date.now()
      };
      
      setAnnotations(prev => [transformedAnnotation, ...prev]);
    } catch (err) {
      console.error('Failed to create annotation:', err);
      setError('Failed to create annotation');
    }
  }, []);

  const handleUpdateAnnotation = useCallback(async (id: string, updates: Partial<Annotation>) => {
    try {
      const response = await apiService.updateAnnotation(id, updates);
      const updatedAnnotation = response.annotation || response;
      
      setAnnotations(prev => prev.map(ann => 
        ann.id === id 
          ? { 
              ...ann, 
              ...updates,
              updated: Date.now()
            }
          : ann
      ));
    } catch (err) {
      console.error('Failed to update annotation:', err);
      setError('Failed to update annotation');
    }
  }, []);

  const handleDeleteAnnotation = useCallback(async (id: string) => {
    try {
      await apiService.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(ann => ann.id !== id));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
      setError('Failed to delete annotation');
    }
  }, []);

  const handleFilterChange = useCallback((newFilters: AnnotationFilter) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Annotations</h1>
              <p className="text-gray-600 mt-1">
                Manage time-based annotations for dashboards and panels
              </p>
            </div>
            <button
              onClick={loadAnnotations}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <AnnotationManager
          annotations={annotations}
          loading={loading}
          onCreateAnnotation={handleCreateAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onFilterChange={handleFilterChange}
          canEdit={true}
        />
      </div>
    </div>
  );
}