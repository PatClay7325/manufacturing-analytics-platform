/**
 * Dashboard Folder System Types
 * Comprehensive type definitions for Analytics-compatible folder hierarchy
 */

// ============================================================================
// CORE FOLDER TYPES
// ============================================================================

export interface DashboardFolder {
  id: string;
  uid: string;
  name: string;
  description?: string;
  permission: FolderPermissionLevel;
  tags: string[];
  
  // Hierarchy
  parentId?: string;
  parent?: DashboardFolder;
  children?: DashboardFolder[];
  path?: string;
  depth: number;
  slug?: string;
  
  // UI customization
  icon?: string;
  color?: string;
  sortOrder: number;
  
  // System fields
  isDefault: boolean;
  isSystem: boolean;
  metadata?: Record<string, any>;
  config?: FolderConfig;
  
  // Timestamps and tracking
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Relations
  creator?: User;
  updater?: User;
  dashboardCount?: number;
  alertRuleCount?: number;
  libraryPanelCount?: number;
  permissions?: FolderPermission[];
  analytics?: FolderAnalytics;
}

export interface FolderConfig {
  defaultTimeRange?: string;
  defaultRefreshInterval?: string;
  defaultVariables?: Record<string, any>;
  dashboardDefaults?: {
    style?: 'dark' | 'light';
    timezone?: string;
    weekStart?: string;
    hideControls?: boolean;
    autoSave?: boolean;
  };
  alertDefaults?: {
    evaluationInterval?: number;
    noDataState?: string;
    execErrState?: string;
  };
}

export type FolderPermissionLevel = 'private' | 'team' | 'public' | 'inherited';

// ============================================================================
// FOLDER PERMISSION TYPES
// ============================================================================

export interface FolderPermission {
  id: string;
  folderId: string;
  userId?: string;
  teamId?: string;
  role: FolderRole;
  permission: string;
  
  // Granular permissions
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canManagePermissions: boolean;
  
  // Permission inheritance
  inherited: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Relations
  folder?: DashboardFolder;
  user?: User;
  team?: Team;
  creator?: User;
}

export type FolderRole = 'viewer' | 'editor' | 'admin' | 'custom';

export interface FolderPermissionRequest {
  userId?: string;
  teamId?: string;
  role: FolderRole;
  permissions?: string[];
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  canManagePermissions?: boolean;
}

// ============================================================================
// FOLDER TEMPLATE TYPES
// ============================================================================

export interface FolderTemplate {
  id: string;
  uid: string;
  name: string;
  description?: string;
  
  // Template configuration
  icon?: string;
  color?: string;
  defaultPermissions?: FolderPermissionRequest[];
  dashboardDefaults?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Relations
  creator?: User;
}

// ============================================================================
// FOLDER SHARE TYPES
// ============================================================================

export interface FolderShare {
  id: string;
  folderId: string;
  shareKey: string;
  sharedBy: string;
  sharedWith?: string;
  shareType: FolderShareType;
  permissions: string[];
  
  // Access control
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  isActive: boolean;
  
  // Additional settings
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  folder?: DashboardFolder;
  sharer?: User;
}

export type FolderShareType = 'link' | 'email' | 'embed';

// ============================================================================
// FOLDER ACTIVITY TYPES
// ============================================================================

export interface FolderActivity {
  id: string;
  folderId: string;
  userId: string;
  action: FolderAction;
  entityType: FolderEntityType;
  entityId?: string;
  details?: Record<string, any>;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  timestamp: Date;
  
  // Relations
  folder?: DashboardFolder;
  user?: User;
}

export type FolderAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'renamed'
  | 'shared'
  | 'unshared'
  | 'permission_added'
  | 'permission_removed'
  | 'permission_updated'
  | 'dashboard_added'
  | 'dashboard_removed'
  | 'dashboard_moved';

export type FolderEntityType = 
  | 'folder'
  | 'dashboard'
  | 'permission'
  | 'share'
  | 'alert_rule'
  | 'library_panel';

// ============================================================================
// FOLDER ANALYTICS TYPES
// ============================================================================

export interface FolderAnalytics {
  id: string;
  folderId: string;
  date: Date;
  
  // Metrics
  viewCount: number;
  uniqueViewers: number;
  dashboardCount: number;
  alertCount: number;
  panelCount: number;
  queryCount: number;
  errorCount: number;
  avgLoadTime?: number;
  
  // Additional metrics
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  folder?: DashboardFolder;
}

// ============================================================================
// FOLDER SUBSCRIPTION TYPES
// ============================================================================

export interface FolderSubscription {
  id: string;
  folderId: string;
  userId: string;
  
  // Notification preferences
  notifyOnChanges: boolean;
  notifyOnAlerts: boolean;
  notifyOnErrors: boolean;
  emailNotifications: boolean;
  webhookUrl?: string;
  
  // Additional settings
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  folder?: DashboardFolder;
  user?: User;
}

// ============================================================================
// FOLDER IMPORT/EXPORT TYPES
// ============================================================================

export interface DashboardImportExport {
  id: string;
  type: ImportExportType;
  folderId?: string;
  dashboardIds: string[];
  format: ImportExportFormat;
  fileName?: string;
  fileSize?: number;
  
  // Status tracking
  status: ImportExportStatus;
  progress?: number;
  result?: ImportExportResult;
  error?: string;
  
  // Access
  downloadUrl?: string;
  expiresAt?: Date;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  
  // Relations
  folder?: DashboardFolder;
  creator?: User;
}

export type ImportExportType = 'import' | 'export';
export type ImportExportFormat = 'json' | 'yaml' | 'zip';
export type ImportExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportExportResult {
  success: boolean;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  warnings?: string[];
  details?: Record<string, any>;
}

// ============================================================================
// FOLDER HIERARCHY TYPES
// ============================================================================

export interface FolderTreeNode extends DashboardFolder {
  children: FolderTreeNode[];
  expanded?: boolean;
  selected?: boolean;
  loading?: boolean;
}

export interface FolderBreadcrumb {
  id: string;
  uid: string;
  name: string;
  icon?: string;
}

export interface FolderMoveRequest {
  folderId: string;
  targetParentId?: string;
  position?: number;
}

export interface FolderCopyRequest {
  folderId: string;
  targetParentId?: string;
  newName?: string;
  includeDashboards?: boolean;
  includePermissions?: boolean;
}

// ============================================================================
// FOLDER API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateFolderRequest {
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  permission?: FolderPermissionLevel;
  config?: FolderConfig;
  templateId?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  parentId?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  permission?: FolderPermissionLevel;
  config?: FolderConfig;
  sortOrder?: number;
}

export interface FolderSearchRequest {
  query?: string;
  parentId?: string;
  tags?: string[];
  permission?: FolderPermissionLevel;
  includeChildren?: boolean;
  depth?: number;
  page?: number;
  limit?: number;
  sortBy?: FolderSortField;
  sortDirection?: 'asc' | 'desc';
}

export type FolderSortField = 
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'dashboardCount'
  | 'sortOrder';

export interface FolderSearchResponse {
  folders: DashboardFolder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FolderTreeResponse {
  tree: FolderTreeNode[];
  totalFolders: number;
  maxDepth: number;
}

// ============================================================================
// FOLDER BULK OPERATIONS
// ============================================================================

export interface BulkFolderOperation {
  operation: BulkOperationType;
  folderIds: string[];
  targetParentId?: string;
  permissions?: FolderPermissionRequest[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export type BulkOperationType = 
  | 'move'
  | 'delete'
  | 'update_permissions'
  | 'add_tags'
  | 'remove_tags'
  | 'export';

export interface BulkOperationResult {
  success: boolean;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  errors?: Array<{
    folderId: string;
    error: string;
  }>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

interface Team {
  id: string;
  name: string;
  memberCount?: number;
}

// ============================================================================
// FOLDER UTILITIES
// ============================================================================

export interface FolderPath {
  segments: FolderBreadcrumb[];
  fullPath: string;
}

export interface FolderStats {
  totalFolders: number;
  totalDashboards: number;
  totalAlerts: number;
  totalLibraryPanels: number;
  maxDepth: number;
  avgDashboardsPerFolder: number;
}

export interface FolderValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}