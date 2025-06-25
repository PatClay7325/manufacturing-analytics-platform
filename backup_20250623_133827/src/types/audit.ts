/**
 * Audit logging types and interfaces
 */

export interface AuditLog {
  id: string;
  
  // Event Information
  eventType: string;
  eventCategory: string;
  eventAction: string;
  eventStatus: 'success' | 'failure' | 'error' | 'warning';
  eventSeverity: 'info' | 'warning' | 'error' | 'critical';
  
  // Resource Information
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  previousValue?: any;
  newValue?: any;
  
  // User and Session Information
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  apiKeyId?: string;
  
  // Request Information
  requestId?: string;
  requestMethod?: string;
  requestPath?: string;
  requestQuery?: Record<string, any>;
  requestBody?: Record<string, any>;
  
  // Client Information
  ipAddress?: string;
  userAgent?: string;
  clientId?: string;
  origin?: string;
  referer?: string;
  
  // Performance Metrics
  responseTime?: number;
  queryDuration?: number;
  totalDuration?: number;
  
  // Error Information
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  
  // Additional Context
  tags?: string[];
  metadata?: Record<string, any>;
  correlationId?: string;
  parentEventId?: string;
  
  // Compliance and Security
  dataClassification?: string;
  complianceFlags?: string[];
  securityContext?: Record<string, any>;
  
  // Timestamps
  timestamp: Date;
  processedAt?: Date;
  
  // Relations
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
}

export interface AuditLogSearchParams {
  eventTypes?: string[];
  eventCategories?: string[];
  eventStatuses?: ('success' | 'failure' | 'error' | 'warning')[];
  eventSeverities?: ('info' | 'warning' | 'error' | 'critical')[];
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof AuditLog;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogSearchResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditAnalytics {
  eventCounts: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  topUsers: Array<{
    userId: string;
    userName?: string;
    count: number;
  }>;
  topResources: Array<{
    resourceType: string;
    count: number;
  }>;
  performanceMetrics: {
    avgResponseTime: number;
    avgQueryDuration: number;
    slowestOperations: Array<{
      action: string;
      avgDuration: number;
    }>;
  };
  errorRate: number;
  timeline: Array<{
    period: string;
    count: number;
    errors: number;
  }>;
}

export interface AuditExportOptions {
  format: 'json' | 'csv';
  filters?: AuditLogSearchParams;
}

export interface AuditPurgeOptions {
  olderThan: Date;
  dryRun?: boolean;
}

// Common event type constants
export const AUDIT_EVENT_TYPES = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
  
  // CRUD Operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Data Operations
  QUERY: 'query',
  EXPORT: 'export',
  IMPORT: 'import',
  
  // Sharing and Permissions
  SHARE: 'share',
  UNSHARE: 'unshare',
  PERMISSION_GRANT: 'permission_grant',
  PERMISSION_REVOKE: 'permission_revoke',
  
  // API Key Management
  API_KEY_CREATE: 'api_key_create',
  API_KEY_DELETE: 'api_key_delete',
  API_KEY_USE: 'api_key_use',
  
  // System Events
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_WARNING: 'system_warning'
} as const;

// Common event category constants
export const AUDIT_EVENT_CATEGORIES = {
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
  PANEL: 'panel',
  ALERT: 'alert',
  USER: 'user',
  TEAM: 'team',
  DATASOURCE: 'datasource',
  SYSTEM: 'system',
  API: 'api',
  PLUGIN: 'plugin',
  ANNOTATION: 'annotation',
  PLAYLIST: 'playlist',
  FOLDER: 'folder',
  ORGANIZATION: 'organization',
  PREFERENCES: 'preferences'
} as const;

export type AuditEventType = typeof AUDIT_EVENT_TYPES[keyof typeof AUDIT_EVENT_TYPES];
export type AuditEventCategory = typeof AUDIT_EVENT_CATEGORIES[keyof typeof AUDIT_EVENT_CATEGORIES];