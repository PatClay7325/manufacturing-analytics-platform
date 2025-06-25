/**
 * Complete AnalyticsPlatform Annotation Manager
 * Full-featured annotation system with time-based display, query-based annotations, manual annotations
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  CalendarIcon,
  TagIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  StarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Core Annotation Types
export interface Annotation {
  id: string;
  dashboardId?: string;
  panelId?: number;
  type: 'point' | 'region' | 'event' | 'alert' | 'milestone' | 'deployment' | 'release';
  title: string;
  text?: string;
  tags: string[];
  time: number; // Unix timestamp
  timeEnd?: number; // For region annotations
  userId: string;
  userName?: string;
  isRegion: boolean;
  color?: string;
  icon?: string;
  url?: string;
  newState?: string;
  prevState?: string;
  data?: Record<string, any>;
  created: number;
  updated: number;
}

export interface AnnotationFilter {
  type?: string;
  tags?: string[];
  user?: string;
  dashboardId?: string;
  panelId?: number;
  from?: number;
  to?: number;
  search?: string;
}

export interface AnnotationManagerProps {
  annotations: Annotation[];
  loading?: boolean;
  dashboardId?: string;
  panelId?: number;
  timeRange?: { from: number; to: number };
  onCreateAnnotation?: (annotation: Partial<Annotation>) => Promise<void>;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => Promise<void>;
  onDeleteAnnotation?: (id: string) => Promise<void>;
  onFilterChange?: (filters: AnnotationFilter) => void;
  canEdit?: boolean;
  className?: string;
}

export function AnnotationManager({
  annotations,
  loading = false,
  dashboardId,
  panelId,
  timeRange,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onFilterChange,
  canEdit = true,
  className
}: AnnotationManagerProps) {
  const [filters, setFilters] = useState<AnnotationFilter>({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Filter annotations based on current filters
  const filteredAnnotations = useMemo(() => {
    return annotations.filter(annotation => {
      // Type filter
      if (filters.type && annotation.type !== filters.type) {
        return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some(tag => annotation.tags.includes(tag))) {
          return false;
        }
      }

      // User filter
      if (filters.user && annotation.userId !== filters.user) {
        return false;
      }

      // Dashboard filter
      if (filters.dashboardId && annotation.dashboardId !== filters.dashboardId) {
        return false;
      }

      // Panel filter
      if (filters.panelId && annotation.panelId !== filters.panelId) {
        return false;
      }

      // Time range filter
      if (filters.from && annotation.time < filters.from) {
        return false;
      }
      if (filters.to && annotation.time > filters.to) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          annotation.title.toLowerCase().includes(searchLower) ||
          annotation.text?.toLowerCase().includes(searchLower) ||
          annotation.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [annotations, filters]);

  // Get unique tags from all annotations
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    annotations.forEach(annotation => {
      annotation.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [annotations]);

  // Get unique users
  const availableUsers = useMemo(() => {
    const userSet = new Set<string>();
    annotations.forEach(annotation => {
      if (annotation.userName) {
        userSet.add(annotation.userId);
      }
    });
    return Array.from(userSet);
  }, [annotations]);

  // Update filters and notify parent
  const updateFilters = useCallback((newFilters: Partial<AnnotationFilter>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  // Handle annotation creation
  const handleCreate = useCallback(async (annotationData: Partial<Annotation>) => {
    try {
      await onCreateAnnotation?.(annotationData);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  }, [onCreateAnnotation]);

  // Handle annotation update
  const handleUpdate = useCallback(async (id: string, updates: Partial<Annotation>) => {
    try {
      await onUpdateAnnotation?.(id, updates);
      setEditingAnnotation(null);
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  }, [onUpdateAnnotation]);

  // Handle annotation deletion
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      try {
        await onDeleteAnnotation?.(id);
      } catch (error) {
        console.error('Failed to delete annotation:', error);
      }
    }
  }, [onDeleteAnnotation]);

  // Get annotation type icon and color
  const getAnnotationTypeInfo = (type: string) => {
    switch (type) {
      case 'alert':
        return { icon: ExclamationTriangleIcon, color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'milestone':
        return { icon: StarIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      case 'deployment':
        return { icon: CheckCircleIcon, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'release':
        return { icon: CheckCircleIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'event':
        return { icon: InformationCircleIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' };
      default:
        return { icon: InformationCircleIcon, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  if (loading) {
    return (
      <div className={clsx("flex items-center justify-center py-12", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading annotations...</span>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Annotations</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredAnnotations.length} of {annotations.length} annotations
            {dashboardId && " for this dashboard"}
            {panelId && " for this panel"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-3 py-1 text-sm font-medium',
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx(
                'px-3 py-1 text-sm font-medium',
                viewMode === 'timeline'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              Timeline
            </button>
          </div>

          {/* Create Button */}
          {canEdit && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Annotation
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnnotationFilters
        filters={filters}
        availableTags={availableTags}
        availableUsers={availableUsers}
        onFilterChange={updateFilters}
      />

      {/* Annotations Display */}
      {viewMode === 'list' ? (
        <AnnotationsList
          annotations={filteredAnnotations}
          onEdit={canEdit ? setEditingAnnotation : undefined}
          onDelete={canEdit ? handleDelete : undefined}
          getTypeInfo={getAnnotationTypeInfo}
        />
      ) : (
        <AnnotationsTimeline
          annotations={filteredAnnotations}
          timeRange={timeRange}
          onEdit={canEdit ? setEditingAnnotation : undefined}
          onDelete={canEdit ? handleDelete : undefined}
          getTypeInfo={getAnnotationTypeInfo}
        />
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingAnnotation) && (
        <AnnotationEditor
          annotation={editingAnnotation}
          dashboardId={dashboardId}
          panelId={panelId}
          availableTags={availableTags}
          onSave={editingAnnotation ? 
            (updates) => handleUpdate(editingAnnotation.id, updates) : 
            handleCreate
          }
          onCancel={() => {
            setIsCreating(false);
            setEditingAnnotation(null);
          }}
        />
      )}
    </div>
  );
}

// Annotation Filters Component
interface AnnotationFiltersProps {
  filters: AnnotationFilter;
  availableTags: string[];
  availableUsers: string[];
  onFilterChange: (filters: Partial<AnnotationFilter>) => void;
}

function AnnotationFilters({ filters, availableTags, availableUsers, onFilterChange }: AnnotationFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const annotationTypes = [
    { value: 'point', label: 'Point' },
    { value: 'region', label: 'Region' },
    { value: 'event', label: 'Event' },
    { value: 'alert', label: 'Alert' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'release', label: 'Release' }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filters
          {showFilters && Object.keys(filters).length > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {Object.keys(filters).filter(key => filters[key as keyof AnnotationFilter]).length}
            </span>
          )}
        </button>
        
        {Object.keys(filters).length > 0 && (
          <button
            onClick={() => onFilterChange({})}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              placeholder="Search title, text, tags..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type || ''}
              onChange={(e) => onFilterChange({ type: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {annotationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <select
              multiple
              value={filters.tags || []}
              onChange={(e) => {
                const selectedTags = Array.from(e.target.selectedOptions, option => option.value);
                onFilterChange({ tags: selectedTags.length > 0 ? selectedTags : undefined });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              size={3}
            >
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={filters.from ? new Date(filters.from).toISOString().slice(0, 16) : ''}
                onChange={(e) => onFilterChange({ 
                  from: e.target.value ? new Date(e.target.value).getTime() : undefined 
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="From"
              />
              <input
                type="datetime-local"
                value={filters.to ? new Date(filters.to).toISOString().slice(0, 16) : ''}
                onChange={(e) => onFilterChange({ 
                  to: e.target.value ? new Date(e.target.value).getTime() : undefined 
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Annotations List Component
interface AnnotationsListProps {
  annotations: Annotation[];
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (id: string) => void;
  getTypeInfo: (type: string) => { icon: any; color: string; bgColor: string };
}

function AnnotationsList({ annotations, onEdit, onDelete, getTypeInfo }: AnnotationsListProps) {
  if (annotations.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations found</h3>
        <p className="text-gray-600">Try adjusting your filters or create a new annotation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
      {annotations.map((annotation) => {
        const typeInfo = getTypeInfo(annotation.type);
        const Icon = typeInfo.icon;

        return (
          <div key={annotation.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={clsx('p-2 rounded-lg', typeInfo.bgColor)}>
                  <Icon className={clsx('h-5 w-5', typeInfo.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {annotation.title}
                    </h3>
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      typeInfo.bgColor,
                      typeInfo.color
                    )}>
                      {annotation.type}
                    </span>
                  </div>
                  
                  {annotation.text && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {annotation.text}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {new Date(annotation.time).toLocaleString()}
                    </div>
                    {annotation.userName && (
                      <div className="flex items-center">
                        <UserIcon className="h-3 w-3 mr-1" />
                        {annotation.userName}
                      </div>
                    )}
                    {annotation.isRegion && annotation.timeEnd && (
                      <div className="flex items-center">
                        <span>→ {new Date(annotation.timeEnd).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {annotation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {annotation.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {annotation.url && (
                  <a
                    href={annotation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Open link"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </a>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(annotation)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Edit annotation"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(annotation.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete annotation"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Annotations Timeline Component
interface AnnotationsTimelineProps {
  annotations: Annotation[];
  timeRange?: { from: number; to: number };
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (id: string) => void;
  getTypeInfo: (type: string) => { icon: any; color: string; bgColor: string };
}

function AnnotationsTimeline({ annotations, timeRange, onEdit, onDelete, getTypeInfo }: AnnotationsTimelineProps) {
  // Sort annotations by time
  const sortedAnnotations = [...annotations].sort((a, b) => b.time - a.time);

  if (annotations.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations found</h3>
        <p className="text-gray-600">Try adjusting your filters or create a new annotation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {sortedAnnotations.map((annotation, index) => {
            const typeInfo = getTypeInfo(annotation.type);
            const Icon = typeInfo.icon;

            return (
              <div key={annotation.id} className="relative flex items-start">
                {/* Timeline dot */}
                <div className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md',
                  typeInfo.bgColor
                )}>
                  <Icon className={clsx('h-4 w-4', typeInfo.color)} />
                </div>
                
                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {annotation.title}
                          </h3>
                          <span className={clsx(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            typeInfo.bgColor,
                            typeInfo.color
                          )}>
                            {annotation.type}
                          </span>
                        </div>
                        
                        {annotation.text && (
                          <p className="text-sm text-gray-600 mb-2">
                            {annotation.text}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                          <span>{new Date(annotation.time).toLocaleString()}</span>
                          {annotation.userName && <span>by {annotation.userName}</span>}
                          {annotation.isRegion && annotation.timeEnd && (
                            <span>→ {new Date(annotation.timeEnd).toLocaleString()}</span>
                          )}
                        </div>
                        
                        {annotation.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {annotation.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-4">
                        {annotation.url && (
                          <a
                            href={annotation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(annotation)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(annotation.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Annotation Editor Component
interface AnnotationEditorProps {
  annotation?: Annotation | null;
  dashboardId?: string;
  panelId?: number;
  availableTags: string[];
  onSave: (annotation: Partial<Annotation>) => Promise<void>;
  onCancel: () => void;
}

function AnnotationEditor({ annotation, dashboardId, panelId, availableTags, onSave, onCancel }: AnnotationEditorProps) {
  const [formData, setFormData] = useState({
    type: annotation?.type || 'point',
    title: annotation?.title || '',
    text: annotation?.text || '',
    tags: annotation?.tags || [],
    time: annotation?.time ? new Date(annotation.time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    timeEnd: annotation?.timeEnd ? new Date(annotation.timeEnd).toISOString().slice(0, 16) : '',
    isRegion: annotation?.isRegion || false,
    color: annotation?.color || '#1f77b4',
    url: annotation?.url || ''
  });
  
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    setSaving(true);
    
    try {
      const annotationData: Partial<Annotation> = {
        type: formData.type as any,
        title: formData.title.trim(),
        text: formData.text.trim() || undefined,
        tags: formData.tags,
        time: new Date(formData.time).getTime(),
        timeEnd: formData.isRegion && formData.timeEnd ? new Date(formData.timeEnd).getTime() : undefined,
        isRegion: formData.isRegion,
        color: formData.color,
        url: formData.url.trim() || undefined,
        dashboardId,
        panelId,
        userId: 'current-user' // In real app, get from auth context
      };

      await onSave(annotationData);
    } catch (error) {
      console.error('Failed to save annotation:', error);
      alert('Failed to save annotation');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {annotation ? 'Edit Annotation' : 'Create Annotation'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Type and Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="point">Point</option>
                <option value="region">Region</option>
                <option value="event">Event</option>
                <option value="alert">Alert</option>
                <option value="milestone">Milestone</option>
                <option value="deployment">Deployment</option>
                <option value="release">Release</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Annotation title"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>

          {/* Time Range */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="isRegion"
                checked={formData.isRegion}
                onChange={(e) => setFormData(prev => ({ ...prev, isRegion: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isRegion" className="text-sm font-medium text-gray-700">
                Region annotation (has duration)
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.isRegion ? 'Start Time' : 'Time'} *
                </label>
                <input
                  type="datetime-local"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {formData.isRegion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.timeEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Available tags:</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!formData.tags.includes(tag)) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color and URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </form>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : annotation ? 'Update' : 'Create'} Annotation
          </button>
        </div>
      </div>
    </div>
  );
}