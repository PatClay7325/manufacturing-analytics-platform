'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, Plus, Edit, Trash2, Calendar, Tag, User, 
  Filter, Search, AlertTriangle, Info, Zap, Wrench, 
  Clock, MapPin, Eye, EyeOff, Save, X
} from 'lucide-react';
import { 
  Annotation, 
  AnnotationType, 
  AnnotationSeverity, 
  AnnotationFilter,
  annotationManager 
} from '@/core/annotations/AnnotationManager';

interface AnnotationPanelProps {
  dashboardId?: string;
  panelId?: string;
  timeRange?: {
    from: number;
    to: number;
  };
  selectedTime?: number;
  onAnnotationSelect?: (annotation: Annotation) => void;
  onAnnotationCreate?: (annotation: Partial<Annotation>) => void;
  className?: string;
}

const ANNOTATION_ICONS = {
  [AnnotationType.Point]: MessageCircle,
  [AnnotationType.Region]: MapPin,
  [AnnotationType.Event]: Calendar,
  [AnnotationType.Alert]: AlertTriangle,
  [AnnotationType.Deployment]: Zap,
  [AnnotationType.Maintenance]: Wrench,
  [AnnotationType.Comment]: MessageCircle,
  [AnnotationType.Custom]: Info
};

const SEVERITY_COLORS = {
  [AnnotationSeverity.Info]: 'text-blue-600 bg-blue-50 border-blue-200',
  [AnnotationSeverity.Low]: 'text-green-600 bg-green-50 border-green-200',
  [AnnotationSeverity.Medium]: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  [AnnotationSeverity.High]: 'text-orange-600 bg-orange-50 border-orange-200',
  [AnnotationSeverity.Critical]: 'text-red-600 bg-red-50 border-red-200'
};

export function AnnotationPanel({
  dashboardId,
  panelId,
  timeRange,
  selectedTime,
  onAnnotationSelect,
  onAnnotationCreate,
  className = ''
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [filter, setFilter] = useState<AnnotationFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<AnnotationType[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<AnnotationSeverity[]>([]);

  useEffect(() => {
    loadAnnotations();
  }, [dashboardId, panelId, timeRange, filter]);

  const loadAnnotations = () => {
    const annotationFilter: AnnotationFilter = {
      ...filter,
      dashboardId,
      panelId,
      timeRange,
      search: searchQuery || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      severities: selectedSeverities.length > 0 ? selectedSeverities : undefined
    };

    const loadedAnnotations = annotationManager.getAnnotations(annotationFilter);
    setAnnotations(loadedAnnotations);
  };

  const handleCreateAnnotation = async (annotationData: Partial<Annotation>) => {
    try {
      const newAnnotation = await annotationManager.createAnnotation({
        time: selectedTime || Date.now(),
        text: '',
        tags: [],
        type: AnnotationType.Comment,
        severity: AnnotationSeverity.Info,
        source: {
          type: 'manual',
          name: 'Dashboard'
        },
        userId: 'current-user', // This would come from auth context
        dashboardId,
        panelId,
        ...annotationData
      });

      setAnnotations(prev => [newAnnotation, ...prev]);
      setShowCreateForm(false);
      onAnnotationCreate?.(newAnnotation);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  const handleUpdateAnnotation = async (id: string, updates: Partial<Annotation>) => {
    try {
      const updated = await annotationManager.updateAnnotation(id, updates);
      setAnnotations(prev => prev.map(a => a.id === id ? updated : a));
      setEditingAnnotation(null);
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this annotation?')) {
      return;
    }

    try {
      await annotationManager.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAnnotationIcon = (type: AnnotationType) => {
    const Icon = ANNOTATION_ICONS[type] || MessageCircle;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Annotations</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Annotation
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Type Filters */}
            {Object.values(AnnotationType).map(type => (
              <button
                key={type}
                onClick={() => {
                  setSelectedTypes(prev => 
                    prev.includes(type) 
                      ? prev.filter(t => t !== type)
                      : [...prev, type]
                  );
                }}
                className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                  ${selectedTypes.includes(type)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                  }
                `}
              >
                {getAnnotationIcon(type)}
                <span className="ml-1 capitalize">{type}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Severity Filters */}
            {Object.values(AnnotationSeverity).map(severity => (
              <button
                key={severity}
                onClick={() => {
                  setSelectedSeverities(prev => 
                    prev.includes(severity) 
                      ? prev.filter(s => s !== severity)
                      : [...prev, severity]
                  );
                }}
                className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                  ${selectedSeverities.includes(severity)
                    ? SEVERITY_COLORS[severity]
                    : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                  }
                `}
              >
                <span className="capitalize">{severity}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Annotation List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No annotations found</p>
          </div>
        ) : (
          annotations.map(annotation => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              isEditing={editingAnnotation?.id === annotation.id}
              onEdit={() => setEditingAnnotation(annotation)}
              onCancelEdit={() => setEditingAnnotation(null)}
              onUpdate={(updates) => handleUpdateAnnotation(annotation.id, updates)}
              onDelete={() => handleDeleteAnnotation(annotation.id)}
              onSelect={() => onAnnotationSelect?.(annotation)}
            />
          ))
        )}
      </div>

      {/* Create Annotation Form */}
      {showCreateForm && (
        <AnnotationForm
          onSubmit={handleCreateAnnotation}
          onCancel={() => setShowCreateForm(false)}
          defaultTime={selectedTime}
        />
      )}
    </div>
  );
}

interface AnnotationItemProps {
  annotation: Annotation;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
  onSelect: () => void;
}

function AnnotationItem({
  annotation,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onSelect
}: AnnotationItemProps) {
  const [editText, setEditText] = useState(annotation.text);
  const [editTitle, setEditTitle] = useState(annotation.title || '');
  const [editTags, setEditTags] = useState(annotation.tags.join(', '));

  const Icon = ANNOTATION_ICONS[annotation.type] || MessageCircle;
  const severityClass = SEVERITY_COLORS[annotation.severity];

  const handleSave = () => {
    onUpdate({
      text: editText,
      title: editTitle || undefined,
      tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Annotation text"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${severityClass}`}>
            <Icon />
          </div>
          
          <div className="flex-1 min-w-0">
            {annotation.title && (
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {annotation.title}
              </h4>
            )}
            <p className="text-sm text-gray-700 mb-2">{annotation.text}</p>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(annotation.time).toLocaleString()}
              </span>
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {annotation.userId}
              </span>
            </div>
            
            {annotation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {annotation.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface AnnotationFormProps {
  onSubmit: (annotation: Partial<Annotation>) => void;
  onCancel: () => void;
  defaultTime?: number;
}

function AnnotationForm({ onSubmit, onCancel, defaultTime }: AnnotationFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    tags: '',
    type: AnnotationType.Comment,
    severity: AnnotationSeverity.Info,
    time: defaultTime || Date.now()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      return;
    }

    onSubmit({
      ...formData,
      title: formData.title || undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Title (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <textarea
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="Annotation text *"
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-2 gap-3">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnotationType })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(AnnotationType).map(type => (
              <option key={type} value={type} className="capitalize">
                {type}
              </option>
            ))}
          </select>
          
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as AnnotationSeverity })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(AnnotationSeverity).map(severity => (
              <option key={severity} value={severity} className="capitalize">
                {severity}
              </option>
            ))}
          </select>
        </div>
        
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="Tags (comma separated)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Annotation
          </button>
        </div>
      </form>
    </div>
  );
}