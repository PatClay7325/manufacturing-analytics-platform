/**
 * Annotation System Component
 * Implements Phase 2.2: User annotations on charts and data points
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Edit3, Trash2, Check, AlertTriangle, 
  Eye, EyeOff, Filter, Search, Tag, Calendar, User 
} from 'lucide-react';
import { annotationService, Annotation, CreateAnnotationRequest, AnnotationFilter } from '@/services/annotationService';

export interface AnnotationSystemProps {
  chartId: string;
  chartContainerRef: React.RefObject<HTMLDivElement>;
  isEnabled?: boolean;
  currentUserId: string;
  currentUsername: string;
  onAnnotationChange?: (annotations: Annotation[]) => void;
}

export function AnnotationSystem({
  chartId,
  chartContainerRef,
  isEnabled = true,
  currentUserId,
  currentUsername,
  onAnnotationChange
}: AnnotationSystemProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<AnnotationFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load annotations on mount
  useEffect(() => {
    loadAnnotations();
  }, [chartId, filter]);

  const loadAnnotations = async () => {
    try {
      const chartAnnotations = await annotationService.getChartAnnotations(chartId);
      const filteredAnnotations = searchQuery 
        ? await annotationService.searchAnnotations(searchQuery, { chartId, ...filter })
        : chartAnnotations.filter(ann => matchesCurrentFilter(ann));
      
      setAnnotations(filteredAnnotations);
      onAnnotationChange?.(filteredAnnotations);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleChartClick = (event: React.MouseEvent) => {
    if (!isAnnotationMode || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCreatePosition({ x, y });
    setIsCreating(true);
    setIsAnnotationMode(false);
  };

  const handleCreateAnnotation = async (annotationData: Omit<CreateAnnotationRequest, 'chartId' | 'x' | 'y'>) => {
    if (!createPosition) return;

    try {
      const newAnnotation = await annotationService.createAnnotation({
        ...annotationData,
        chartId,
        x: createPosition.x,
        y: createPosition.y
      }, currentUserId, currentUsername);

      setAnnotations(prev => [newAnnotation, ...prev]);
      setIsCreating(false);
      setCreatePosition(null);
      onAnnotationChange?.([newAnnotation, ...annotations]);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  const handleUpdateAnnotation = async (annotationId: string, updates: any) => {
    try {
      const updated = await annotationService.updateAnnotation(annotationId, updates, currentUserId);
      setAnnotations(prev => prev.map(ann => ann.id === annotationId ? updated : ann));
      setSelectedAnnotation(null);
      onAnnotationChange?.(annotations.map(ann => ann.id === annotationId ? updated : ann));
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await annotationService.deleteAnnotation(annotationId, currentUserId);
      setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      setSelectedAnnotation(null);
      onAnnotationChange?.(annotations.filter(ann => ann.id !== annotationId));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const matchesCurrentFilter = (annotation: Annotation): boolean => {
    if (filter.type && annotation.type !== filter.type) return false;
    if (filter.priority && annotation.priority !== filter.priority) return false;
    if (filter.isResolved !== undefined && annotation.isResolved !== filter.isResolved) return false;
    if (filter.userId && annotation.userId !== filter.userId) return false;
    return true;
  };

  const getAnnotationIcon = (type: Annotation['type']) => {
    switch (type) {
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'issue': return <AlertTriangle className="h-4 w-4" />;
      case 'improvement': return <Edit3 className="h-4 w-4" />;
      case 'observation': return <Eye className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Annotation['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="annotation-system relative">
      {/* Annotation Overlay */}
      {showAnnotations && (
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none z-20"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {annotations.map((annotation) => (
            annotation.x !== undefined && annotation.y !== undefined && (
              <AnnotationMarker
                key={annotation.id}
                annotation={annotation}
                onClick={() => setSelectedAnnotation(annotation)}
                onUpdate={(updates) => handleUpdateAnnotation(annotation.id, updates)}
                onDelete={() => handleDeleteAnnotation(annotation.id)}
                canEdit={annotation.userId === currentUserId}
              />
            )
          ))}
        </div>
      )}

      {/* Chart Click Handler */}
      {isAnnotationMode && (
        <div
          className="absolute inset-0 cursor-crosshair z-10"
          onClick={handleChartClick}
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        />
      )}

      {/* Annotation Controls */}
      <AnnotationControls
        isAnnotationMode={isAnnotationMode}
        showAnnotations={showAnnotations}
        annotationCount={annotations.length}
        onToggleAnnotationMode={() => setIsAnnotationMode(!isAnnotationMode)}
        onToggleShowAnnotations={() => setShowAnnotations(!showAnnotations)}
        onFilterChange={setFilter}
        onSearchChange={setSearchQuery}
        currentFilter={filter}
        searchQuery={searchQuery}
      />

      {/* Create Annotation Modal */}
      {isCreating && createPosition && (
        <CreateAnnotationModal
          position={createPosition}
          onSubmit={handleCreateAnnotation}
          onCancel={() => {
            setIsCreating(false);
            setCreatePosition(null);
          }}
        />
      )}

      {/* Annotation Details Modal */}
      {selectedAnnotation && (
        <AnnotationDetailsModal
          annotation={selectedAnnotation}
          onClose={() => setSelectedAnnotation(null)}
          onUpdate={(updates) => handleUpdateAnnotation(selectedAnnotation.id, updates)}
          onDelete={() => handleDeleteAnnotation(selectedAnnotation.id)}
          canEdit={selectedAnnotation.userId === currentUserId}
        />
      )}
    </div>
  );
}

interface AnnotationMarkerProps {
  annotation: Annotation;
  onClick: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  canEdit: boolean;
}

function AnnotationMarker({ annotation, onClick, onUpdate, onDelete, canEdit }: AnnotationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: annotation.x,
        top: annotation.y,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Annotation Pin */}
      <div
        onClick={onClick}
        className={`
          w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer
          flex items-center justify-center text-white text-xs
          ${getPriorityColor(annotation.priority)}
          ${annotation.isResolved ? 'opacity-60' : ''}
          hover:scale-110 transition-transform
        `}
      >
        {getAnnotationIcon(annotation.type)}
      </div>

      {/* Quick Preview on Hover */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs pointer-events-none z-30">
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {annotation.title}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {annotation.content}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{annotation.username}</span>
            <span>{annotation.createdAt.toLocaleDateString()}</span>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}

interface AnnotationControlsProps {
  isAnnotationMode: boolean;
  showAnnotations: boolean;
  annotationCount: number;
  onToggleAnnotationMode: () => void;
  onToggleShowAnnotations: () => void;
  onFilterChange: (filter: AnnotationFilter) => void;
  onSearchChange: (query: string) => void;
  currentFilter: AnnotationFilter;
  searchQuery: string;
}

function AnnotationControls({
  isAnnotationMode,
  showAnnotations,
  annotationCount,
  onToggleAnnotationMode,
  onToggleShowAnnotations,
  onFilterChange,
  onSearchChange,
  currentFilter,
  searchQuery
}: AnnotationControlsProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="absolute top-2 right-2 z-30">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
        {/* Add Annotation Button */}
        <button
          onClick={onToggleAnnotationMode}
          className={`
            p-2 rounded-md transition-colors
            ${isAnnotationMode 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
          title="Add Annotation"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Toggle Annotations Visibility */}
        <button
          onClick={onToggleShowAnnotations}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title={showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
        >
          {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Annotation Count */}
        <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
          {annotationCount}
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Filter Annotations"
        >
          <Filter className="h-4 w-4" />
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-32 pl-7 pr-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-40">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Filter Annotations</h4>
          
          {/* Type Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={currentFilter.type || ''}
              onChange={(e) => onFilterChange({ ...currentFilter, type: e.target.value as any || undefined })}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="note">Note</option>
              <option value="issue">Issue</option>
              <option value="improvement">Improvement</option>
              <option value="observation">Observation</option>
              <option value="alert">Alert</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select
              value={currentFilter.priority || ''}
              onChange={(e) => onFilterChange({ ...currentFilter, priority: e.target.value as any || undefined })}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={currentFilter.isResolved === undefined ? '' : currentFilter.isResolved ? 'resolved' : 'unresolved'}
              onChange={(e) => {
                const value = e.target.value;
                onFilterChange({ 
                  ...currentFilter, 
                  isResolved: value === '' ? undefined : value === 'resolved'
                });
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onFilterChange({})}
            className="w-full px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

interface CreateAnnotationModalProps {
  position: { x: number; y: number };
  onSubmit: (annotation: Omit<CreateAnnotationRequest, 'chartId' | 'x' | 'y'>) => void;
  onCancel: () => void;
}

function CreateAnnotationModal({ position, onSubmit, onCancel }: CreateAnnotationModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Annotation['type']>('note');
  const [priority, setPriority] = useState<Annotation['priority']>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<Annotation['visibility']>('team');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      tags,
      visibility
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Add Annotation
          </h3>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter annotation title..."
              required
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter annotation content..."
              required
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Annotation['type'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="note">Note</option>
                <option value="issue">Issue</option>
                <option value="improvement">Improvement</option>
                <option value="observation">Observation</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Annotation['priority'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Add tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Tag className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Annotation['visibility'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AnnotationDetailsModalProps {
  annotation: Annotation;
  onClose: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  canEdit: boolean;
}

function AnnotationDetailsModal({ annotation, onClose, onUpdate, onDelete, canEdit }: AnnotationDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(annotation.title);
  const [content, setContent] = useState(annotation.content);

  const handleSave = () => {
    onUpdate({ title, content });
    setIsEditing(false);
  };

  const handleResolve = () => {
    onUpdate({ isResolved: !annotation.isResolved });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getPriorityColor(annotation.priority)}`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {annotation.type}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 mb-4 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {annotation.title}
            </h3>
          )}

          {/* Content */}
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full text-gray-700 dark:text-gray-300 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-2 mb-4 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {annotation.content}
            </p>
          )}

          {/* Tags */}
          {annotation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {annotation.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div>Created by {annotation.username}</div>
            <div>{annotation.createdAt.toLocaleString()}</div>
            {annotation.isResolved && (
              <div className="text-green-600 dark:text-green-400">
                ✓ Resolved {annotation.resolvedAt?.toLocaleString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {canEdit && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Edit3 className="h-3 w-3 inline mr-1" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={handleResolve}
                    className={`px-3 py-1 rounded text-sm ${
                      annotation.isResolved
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    }`}
                  >
                    <Check className="h-3 w-3 inline mr-1" />
                    {annotation.isResolved ? 'Unresolve' : 'Resolve'}
                  </button>
                </>
              )}
            </div>
            {canEdit && (
              <button
                onClick={onDelete}
                className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800"
              >
                <Trash2 className="h-3 w-3 inline mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions (moved outside component to avoid recreation)
function getAnnotationIcon(type: Annotation['type']) {
  switch (type) {
    case 'note': return <MessageSquare className="h-3 w-3" />;
    case 'issue': return <AlertTriangle className="h-3 w-3" />;
    case 'improvement': return <Edit3 className="h-3 w-3" />;
    case 'observation': return <Eye className="h-3 w-3" />;
    case 'alert': return <AlertTriangle className="h-3 w-3" />;
    default: return <MessageSquare className="h-3 w-3" />;
  }
}

function getPriorityColor(priority: Annotation['priority']) {
  switch (priority) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}