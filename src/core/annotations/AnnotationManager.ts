import { EventEmitter } from 'events';

// ============================================================================
// ANNOTATION INTERFACES
// ============================================================================

export interface Annotation {
  id: string;
  dashboardId?: string;
  panelId?: string;
  time: number;
  timeEnd?: number;
  text: string;
  title?: string;
  tags: string[];
  type: AnnotationType;
  severity: AnnotationSeverity;
  source: AnnotationSource;
  userId: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
  region?: AnnotationRegion;
  style?: AnnotationStyle;
}

export interface AnnotationRegion {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  timeRange?: {
    from: number;
    to: number;
  };
}

export interface AnnotationStyle {
  color?: string;
  fillColor?: string;
  borderColor?: string;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineWidth?: number;
}

export enum AnnotationType {
  Point = 'point',
  Region = 'region',
  Event = 'event',
  Alert = 'alert',
  Deployment = 'deployment',
  Maintenance = 'maintenance',
  Comment = 'comment',
  Custom = 'custom'
}

export enum AnnotationSeverity {
  Info = 'info',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export interface AnnotationSource {
  type: 'manual' | 'datasource' | 'alert' | 'api';
  name: string;
  datasourceId?: string;
  query?: AnnotationQuery;
}

export interface AnnotationQuery {
  query: string;
  timeField: string;
  textField: string;
  titleField?: string;
  tagsField?: string;
  variables?: Record<string, any>;
  refresh?: boolean;
}

export interface AnnotationFilter {
  dashboardId?: string;
  panelId?: string;
  timeRange?: {
    from: number;
    to: number;
  };
  tags?: string[];
  types?: AnnotationType[];
  severities?: AnnotationSeverity[];
  sources?: string[];
  userId?: string;
  search?: string;
}

// ============================================================================
// SNAPSHOT INTERFACES
// ============================================================================

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  dashboardId: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  isPublic: boolean;
  data: SnapshotData;
  metadata: SnapshotMetadata;
  sharing?: SnapshotSharing;
}

export interface SnapshotData {
  dashboard: any; // Dashboard JSON
  panels: Record<string, any>; // Panel data at time of snapshot
  timeRange: {
    from: number;
    to: number;
  };
  variables?: Record<string, any>;
  annotations?: Annotation[];
  version: string;
}

export interface SnapshotMetadata {
  title: string;
  description?: string;
  tags: string[];
  size: number; // Data size in bytes
  panelCount: number;
  annotationCount: number;
  originalUrl?: string;
  captureMethod: 'manual' | 'scheduled' | 'api';
}

export interface SnapshotSharing {
  isPublic: boolean;
  allowedUsers?: string[];
  allowedRoles?: string[];
  accessToken?: string;
  embedEnabled?: boolean;
  downloadEnabled?: boolean;
}

export interface SnapshotFilter {
  userId?: string;
  dashboardId?: string;
  timeRange?: {
    from: number;
    to: number;
  };
  tags?: string[];
  search?: string;
  isPublic?: boolean;
}

// ============================================================================
// ANNOTATION MANAGER
// ============================================================================

export class AnnotationManager extends EventEmitter {
  private annotations = new Map<string, Annotation>();
  private snapshots = new Map<string, Snapshot>();

  /**
   * Create a new annotation
   */
  async createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    const now = Date.now();
    const newAnnotation: Annotation = {
      ...annotation,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    this.annotations.set(newAnnotation.id, newAnnotation);
    this.emit('annotation:created', newAnnotation);

    // Auto-save to persistence layer
    await this.saveAnnotation(newAnnotation);

    return newAnnotation;
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation> {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    const updated: Annotation = {
      ...annotation,
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: annotation.createdAt, // Preserve creation time
      updatedAt: Date.now()
    };

    this.annotations.set(id, updated);
    this.emit('annotation:updated', updated);

    // Auto-save to persistence layer
    await this.saveAnnotation(updated);

    return updated;
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    this.annotations.delete(id);
    this.emit('annotation:deleted', { id, annotation });

    // Remove from persistence layer
    await this.removeAnnotationFromStorage(id);
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get annotations with filters
   */
  getAnnotations(filter?: AnnotationFilter): Annotation[] {
    let annotations = Array.from(this.annotations.values());

    if (!filter) {
      return annotations;
    }

    // Filter by dashboard
    if (filter.dashboardId) {
      annotations = annotations.filter(a => a.dashboardId === filter.dashboardId);
    }

    // Filter by panel
    if (filter.panelId) {
      annotations = annotations.filter(a => a.panelId === filter.panelId);
    }

    // Filter by time range
    if (filter.timeRange) {
      annotations = annotations.filter(a => {
        const annotationEnd = a.timeEnd || a.time;
        return a.time <= filter.timeRange!.to && annotationEnd >= filter.timeRange!.from;
      });
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      annotations = annotations.filter(a => 
        filter.tags!.some(tag => a.tags.includes(tag))
      );
    }

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      annotations = annotations.filter(a => filter.types!.includes(a.type));
    }

    // Filter by severities
    if (filter.severities && filter.severities.length > 0) {
      annotations = annotations.filter(a => filter.severities!.includes(a.severity));
    }

    // Filter by user
    if (filter.userId) {
      annotations = annotations.filter(a => a.userId === filter.userId);
    }

    // Filter by search text
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      annotations = annotations.filter(a => 
        a.text.toLowerCase().includes(searchLower) ||
        a.title?.toLowerCase().includes(searchLower) ||
        a.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by time (newest first)
    return annotations.sort((a, b) => b.time - a.time);
  }

  /**
   * Get annotations for a specific time range
   */
  getAnnotationsInRange(from: number, to: number, dashboardId?: string): Annotation[] {
    return this.getAnnotations({
      timeRange: { from, to },
      dashboardId
    });
  }

  /**
   * Create annotation from alert
   */
  async createAlertAnnotation(
    alertId: string,
    message: string,
    severity: AnnotationSeverity,
    dashboardId?: string,
    panelId?: string
  ): Promise<Annotation> {
    return this.createAnnotation({
      time: Date.now(),
      text: message,
      title: 'Alert',
      tags: ['alert', alertId],
      type: AnnotationType.Alert,
      severity,
      source: {
        type: 'alert',
        name: 'Alert System'
      },
      userId: 'system',
      dashboardId,
      panelId,
      metadata: {
        alertId,
        source: 'alerting'
      }
    });
  }

  /**
   * Create maintenance annotation
   */
  async createMaintenanceAnnotation(
    workUnitId: string,
    maintenanceType: string,
    description: string,
    startTime: number,
    endTime?: number,
    dashboardId?: string
  ): Promise<Annotation> {
    return this.createAnnotation({
      time: startTime,
      timeEnd: endTime,
      text: description,
      title: `${maintenanceType} - ${workUnitId}`,
      tags: ['maintenance', workUnitId, maintenanceType],
      type: AnnotationType.Maintenance,
      severity: AnnotationSeverity.Medium,
      source: {
        type: 'manual',
        name: 'Maintenance System'
      },
      userId: 'system',
      dashboardId,
      metadata: {
        workUnitId,
        maintenanceType,
        source: 'maintenance'
      }
    });
  }

  /**
   * Create deployment annotation
   */
  async createDeploymentAnnotation(
    version: string,
    description: string,
    userId: string,
    dashboardId?: string
  ): Promise<Annotation> {
    return this.createAnnotation({
      time: Date.now(),
      text: description,
      title: `Deployment ${version}`,
      tags: ['deployment', version],
      type: AnnotationType.Deployment,
      severity: AnnotationSeverity.Info,
      source: {
        type: 'api',
        name: 'CI/CD System'
      },
      userId,
      dashboardId,
      metadata: {
        version,
        source: 'deployment'
      }
    });
  }

  /**
   * Create a dashboard snapshot
   */
  async createSnapshot(
    dashboardId: string,
    name: string,
    description: string,
    userId: string,
    dashboardData: any,
    panelData: Record<string, any>,
    options?: {
      isPublic?: boolean;
      expiresAt?: number;
      tags?: string[];
    }
  ): Promise<Snapshot> {
    const now = Date.now();
    const snapshot: Snapshot = {
      id: this.generateId(),
      name,
      description,
      dashboardId,
      userId,
      createdAt: now,
      expiresAt: options?.expiresAt,
      isPublic: options?.isPublic || false,
      data: {
        dashboard: dashboardData,
        panels: panelData,
        timeRange: {
          from: now - 24 * 60 * 60 * 1000, // Default to last 24 hours
          to: now
        },
        annotations: this.getAnnotations({ dashboardId }),
        version: '1.0.0'
      },
      metadata: {
        title: name,
        description,
        tags: options?.tags || [],
        size: JSON.stringify(dashboardData).length + JSON.stringify(panelData).length,
        panelCount: Object.keys(panelData).length,
        annotationCount: this.getAnnotations({ dashboardId }).length,
        captureMethod: 'manual'
      }
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.emit('snapshot:created', snapshot);

    // Auto-save to persistence layer
    await this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): Snapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Get snapshots with filters
   */
  getSnapshots(filter?: SnapshotFilter): Snapshot[] {
    let snapshots = Array.from(this.snapshots.values());

    if (!filter) {
      return snapshots;
    }

    // Filter by user
    if (filter.userId) {
      snapshots = snapshots.filter(s => s.userId === filter.userId);
    }

    // Filter by dashboard
    if (filter.dashboardId) {
      snapshots = snapshots.filter(s => s.dashboardId === filter.dashboardId);
    }

    // Filter by public status
    if (filter.isPublic !== undefined) {
      snapshots = snapshots.filter(s => s.isPublic === filter.isPublic);
    }

    // Filter by time range
    if (filter.timeRange) {
      snapshots = snapshots.filter(s => 
        s.createdAt >= filter.timeRange!.from && s.createdAt <= filter.timeRange!.to
      );
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      snapshots = snapshots.filter(s => 
        filter.tags!.some(tag => s.metadata.tags.includes(tag))
      );
    }

    // Filter by search
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      snapshots = snapshots.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by creation time (newest first)
    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(id: string): Promise<void> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${id}`);
    }

    this.snapshots.delete(id);
    this.emit('snapshot:deleted', { id, snapshot });

    // Remove from persistence layer
    await this.removeSnapshotFromStorage(id);
  }

  /**
   * Update snapshot sharing settings
   */
  async updateSnapshotSharing(id: string, sharing: SnapshotSharing): Promise<Snapshot> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${id}`);
    }

    const updated: Snapshot = {
      ...snapshot,
      sharing,
      isPublic: sharing.isPublic
    };

    this.snapshots.set(id, updated);
    this.emit('snapshot:updated', updated);

    // Auto-save to persistence layer
    await this.saveSnapshot(updated);

    return updated;
  }

  /**
   * Clean up expired snapshots
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const now = Date.now();
    const expired = Array.from(this.snapshots.values()).filter(s => 
      s.expiresAt && s.expiresAt < now
    );

    for (const snapshot of expired) {
      await this.deleteSnapshot(snapshot.id);
    }

    return expired.length;
  }

  /**
   * Get annotation statistics
   */
  getAnnotationStats(dashboardId?: string): {
    total: number;
    byType: Record<AnnotationType, number>;
    bySeverity: Record<AnnotationSeverity, number>;
    recent: number; // Last 24 hours
  } {
    const annotations = this.getAnnotations({ dashboardId });
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const stats = {
      total: annotations.length,
      byType: {} as Record<AnnotationType, number>,
      bySeverity: {} as Record<AnnotationSeverity, number>,
      recent: annotations.filter(a => a.createdAt >= dayAgo).length
    };

    // Initialize counters
    Object.values(AnnotationType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(AnnotationSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count annotations
    annotations.forEach(annotation => {
      stats.byType[annotation.type]++;
      stats.bySeverity[annotation.severity]++;
    });

    return stats;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async saveAnnotation(annotation: Annotation): Promise<void> {
    // In a real implementation, this would save to a database
    console.log(`Saving annotation: ${annotation.id}`);
  }

  private async removeAnnotationFromStorage(id: string): Promise<void> {
    // In a real implementation, this would remove from a database
    console.log(`Removing annotation: ${id}`);
  }

  private async saveSnapshot(snapshot: Snapshot): Promise<void> {
    // In a real implementation, this would save to a database
    console.log(`Saving snapshot: ${snapshot.id}`);
  }

  private async removeSnapshotFromStorage(id: string): Promise<void> {
    // In a real implementation, this would remove from a database
    console.log(`Removing snapshot: ${id}`);
  }
}

// Global annotation manager instance
export const annotationManager = new AnnotationManager();