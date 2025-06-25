/**
 * Annotation Service
 * Implements Phase 2.2: User annotations on charts and data points
 */

import { prisma } from '@/lib/database';
import { auditLogService, AuditAction } from './auditLogService';

export interface Annotation {
  id: string;
  userId: string;
  username: string;
  chartId: string;
  dataPointId?: string;
  x?: number;
  y?: number;
  timestamp: Date;
  title: string;
  content: string;
  type: 'note' | 'issue' | 'improvement' | 'observation' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  attachments?: string[];
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  visibility: 'private' | 'team' | 'public';
  equipmentId?: string;
  metricName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationFilter {
  chartId?: string;
  userId?: string;
  type?: Annotation['type'];
  priority?: Annotation['priority'];
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  equipmentId?: string;
  metricName?: string;
}

export interface CreateAnnotationRequest {
  chartId: string;
  dataPointId?: string;
  x?: number;
  y?: number;
  title: string;
  content: string;
  type: Annotation['type'];
  priority: Annotation['priority'];
  tags?: string[];
  visibility: Annotation['visibility'];
  equipmentId?: string;
  metricName?: string;
}

export interface UpdateAnnotationRequest {
  title?: string;
  content?: string;
  type?: Annotation['type'];
  priority?: Annotation['priority'];
  tags?: string[];
  visibility?: Annotation['visibility'];
  isResolved?: boolean;
}

export class AnnotationService {
  private static instance: AnnotationService;
  
  static getInstance(): AnnotationService {
    if (!AnnotationService.instance) {
      AnnotationService.instance = new AnnotationService();
    }
    return AnnotationService.instance;
  }

  /**
   * Create a new annotation
   */
  async createAnnotation(
    request: CreateAnnotationRequest,
    userId: string,
    username: string
  ): Promise<Annotation> {
    try {
      // Validate chart exists (in a real implementation)
      await this.validateChart(request.chartId);

      const annotation: Annotation = {
        id: this.generateId(),
        userId,
        username,
        chartId: request.chartId,
        dataPointId: request.dataPointId,
        x: request.x,
        y: request.y,
        timestamp: new Date(),
        title: request.title,
        content: request.content,
        type: request.type,
        priority: request.priority,
        tags: request.tags || [],
        isResolved: false,
        visibility: request.visibility,
        equipmentId: request.equipmentId,
        metricName: request.metricName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real implementation, save to database
      await this.saveAnnotation(annotation);

      // Log annotation creation
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.ANNOTATION_CREATE,
        {
          resource: 'annotation',
          details: {
            annotationId: annotation.id,
            chartId: request.chartId,
            type: request.type,
            priority: request.priority
          }
        }
      );

      return annotation;

    } catch (error) {
      console.error('Failed to create annotation:', error);
      throw new Error(`Failed to create annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get annotations by filter
   */
  async getAnnotations(filter: AnnotationFilter = {}): Promise<Annotation[]> {
    try {
      // In a real implementation, query database
      const annotations = await this.queryAnnotations(filter);
      
      return annotations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      console.error('Failed to get annotations:', error);
      throw new Error(`Failed to retrieve annotations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get annotations for a specific chart
   */
  async getChartAnnotations(chartId: string, userId?: string): Promise<Annotation[]> {
    return this.getAnnotations({
      chartId,
      ...(userId && { userId })
    });
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(
    annotationId: string,
    updates: UpdateAnnotationRequest,
    userId: string
  ): Promise<Annotation> {
    try {
      const annotation = await this.getAnnotationById(annotationId);
      
      if (!annotation) {
        throw new Error('Annotation not found');
      }

      // Check permissions
      if (annotation.userId !== userId) {
        throw new Error('Not authorized to update this annotation');
      }

      const updatedAnnotation: Annotation = {
        ...annotation,
        ...updates,
        updatedAt: new Date()
      };

      // If resolving annotation, set resolved fields
      if (updates.isResolved && !annotation.isResolved) {
        updatedAnnotation.resolvedBy = userId;
        updatedAnnotation.resolvedAt = new Date();
      }

      // Save updated annotation
      await this.saveAnnotation(updatedAnnotation);

      // Log annotation update
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.ANNOTATION_UPDATE,
        {
          resource: 'annotation',
          details: {
            annotationId,
            updates,
            resolved: updates.isResolved
          }
        }
      );

      return updatedAnnotation;

    } catch (error) {
      console.error('Failed to update annotation:', error);
      throw new Error(`Failed to update annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    try {
      const annotation = await this.getAnnotationById(annotationId);
      
      if (!annotation) {
        throw new Error('Annotation not found');
      }

      // Check permissions
      if (annotation.userId !== userId) {
        throw new Error('Not authorized to delete this annotation');
      }

      // Delete annotation
      await this.removeAnnotation(annotationId);

      // Log annotation deletion
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.ANNOTATION_DELETE,
        {
          resource: 'annotation',
          details: {
            annotationId,
            chartId: annotation.chartId
          }
        }
      );

    } catch (error) {
      console.error('Failed to delete annotation:', error);
      throw new Error(`Failed to delete annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get annotation statistics
   */
  async getAnnotationStats(filter: AnnotationFilter = {}): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    resolved: number;
    unresolved: number;
    recentCount: number;
  }> {
    try {
      const annotations = await this.getAnnotations(filter);
      
      const stats = {
        total: annotations.length,
        byType: this.groupByField(annotations, 'type'),
        byPriority: this.groupByField(annotations, 'priority'),
        resolved: annotations.filter(a => a.isResolved).length,
        unresolved: annotations.filter(a => !a.isResolved).length,
        recentCount: annotations.filter(a => 
          a.createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length
      };

      return stats;

    } catch (error) {
      console.error('Failed to get annotation stats:', error);
      throw new Error(`Failed to get annotation statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search annotations by content
   */
  async searchAnnotations(
    query: string,
    filter: AnnotationFilter = {}
  ): Promise<Annotation[]> {
    try {
      const annotations = await this.getAnnotations(filter);
      
      const searchTerm = query.toLowerCase();
      
      return annotations.filter(annotation =>
        annotation.title.toLowerCase().includes(searchTerm) ||
        annotation.content.toLowerCase().includes(searchTerm) ||
        annotation.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );

    } catch (error) {
      console.error('Failed to search annotations:', error);
      throw new Error(`Failed to search annotations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export annotations to various formats
   */
  async exportAnnotations(
    filter: AnnotationFilter = {},
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<string> {
    try {
      const annotations = await this.getAnnotations(filter);
      
      switch (format) {
        case 'json':
          return JSON.stringify(annotations, null, 2);
        
        case 'csv':
          return this.convertToCSV(annotations);
        
        case 'pdf':
          // This would integrate with the PDF service
          throw new Error('PDF export not yet implemented');
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      console.error('Failed to export annotations:', error);
      throw new Error(`Failed to export annotations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get trending annotation topics
   */
  async getTrendingTopics(days: number = 30): Promise<{
    tag: string;
    count: number;
    trend: 'rising' | 'stable' | 'declining';
  }[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const annotations = await this.getAnnotations({ startDate });
      
      // Count tag frequencies
      const tagCounts: Record<string, number> = {};
      annotations.forEach(annotation => {
        annotation.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Convert to trending topics
      return Object.entries(tagCounts)
        .map(([tag, count]) => ({
          tag,
          count,
          trend: 'stable' as const // In real implementation, calculate trend
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    } catch (error) {
      console.error('Failed to get trending topics:', error);
      throw new Error(`Failed to get trending topics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private async validateChart(chartId: string): Promise<void> {
    // In a real implementation, validate chart exists
    if (!chartId) {
      throw new Error('Chart ID is required');
    }
  }

  private async saveAnnotation(annotation: Annotation): Promise<void> {
    // In a real implementation, save to database
    // For now, store in memory/localStorage for demo
    const key = `annotation_${annotation.id}`;
    localStorage.setItem(key, JSON.stringify(annotation));
  }

  private async queryAnnotations(filter: AnnotationFilter): Promise<Annotation[]> {
    // In a real implementation, query database
    // For now, get from localStorage for demo
    const annotations: Annotation[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('annotation_')) {
        try {
          const annotation = JSON.parse(localStorage.getItem(key) || '{}');
          // Convert date strings back to Date objects
          annotation.timestamp = new Date(annotation.timestamp);
          annotation.createdAt = new Date(annotation.createdAt);
          annotation.updatedAt = new Date(annotation.updatedAt);
          if (annotation.resolvedAt) {
            annotation.resolvedAt = new Date(annotation.resolvedAt);
          }
          
          if (this.matchesFilter(annotation, filter)) {
            annotations.push(annotation);
          }
        } catch (error) {
          console.warn('Failed to parse annotation:', key, error);
        }
      }
    }
    
    return annotations;
  }

  private async getAnnotationById(id: string): Promise<Annotation | null> {
    try {
      const stored = localStorage.getItem(`annotation_${id}`);
      if (!stored) return null;
      
      const annotation = JSON.parse(stored);
      // Convert date strings back to Date objects
      annotation.timestamp = new Date(annotation.timestamp);
      annotation.createdAt = new Date(annotation.createdAt);
      annotation.updatedAt = new Date(annotation.updatedAt);
      if (annotation.resolvedAt) {
        annotation.resolvedAt = new Date(annotation.resolvedAt);
      }
      
      return annotation;
    } catch (error) {
      console.error('Failed to get annotation by ID:', error);
      return null;
    }
  }

  private async removeAnnotation(id: string): Promise<void> {
    localStorage.removeItem(`annotation_${id}`);
  }

  private matchesFilter(annotation: Annotation, filter: AnnotationFilter): boolean {
    if (filter.chartId && annotation.chartId !== filter.chartId) return false;
    if (filter.userId && annotation.userId !== filter.userId) return false;
    if (filter.type && annotation.type !== filter.type) return false;
    if (filter.priority && annotation.priority !== filter.priority) return false;
    if (filter.isResolved !== undefined && annotation.isResolved !== filter.isResolved) return false;
    if (filter.equipmentId && annotation.equipmentId !== filter.equipmentId) return false;
    if (filter.metricName && annotation.metricName !== filter.metricName) return false;
    
    if (filter.startDate && annotation.createdAt < filter.startDate) return false;
    if (filter.endDate && annotation.createdAt > filter.endDate) return false;
    
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => 
        annotation.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }
    
    return true;
  }

  private groupByField(annotations: Annotation[], field: keyof Annotation): Record<string, number> {
    const groups: Record<string, number> = {};
    
    annotations.forEach(annotation => {
      const value = String(annotation[field]);
      groups[value] = (groups[value] || 0) + 1;
    });
    
    return groups;
  }

  private convertToCSV(annotations: Annotation[]): string {
    if (annotations.length === 0) return '';
    
    const headers = [
      'ID', 'User', 'Chart ID', 'Title', 'Content', 'Type', 'Priority',
      'Tags', 'Is Resolved', 'Created At', 'Updated At'
    ];
    
    const rows = annotations.map(annotation => [
      annotation.id,
      annotation.username,
      annotation.chartId,
      annotation.title,
      annotation.content.replace(/"/g, '""'), // Escape quotes
      annotation.type,
      annotation.priority,
      annotation.tags.join('; '),
      annotation.isResolved ? 'Yes' : 'No',
      annotation.createdAt.toISOString(),
      annotation.updatedAt.toISOString()
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  private generateId(): string {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const annotationService = AnnotationService.getInstance();