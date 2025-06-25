/**
 * Dashboard Template System Types
 * Comprehensive type definitions for AnalyticsPlatform-like dashboard template functionality
 */

import { Dashboard, Panel, TemplateVariable } from './dashboard';

// ============================================================================
// CORE TEMPLATE TYPES
// ============================================================================

export interface DashboardTemplate {
  id: string;
  uid: string;
  
  // Basic Information
  name: string;
  title: string;
  description?: string;
  summary?: string;
  
  // Template Configuration
  config: Dashboard; // Complete dashboard JSON configuration
  variables?: TemplateVariableConfig[];
  panels?: TemplatePanel[];
  
  // Categorization
  categoryId?: string;
  category?: TemplateCategory;
  tags: string[];
  industry: string[];
  
  // Template Metadata
  version: string;
  schemaVersion: number;
  compatibleWith: string[];
  dependencies: string[];
  
  // Visual Elements
  thumbnail?: string;
  screenshots: string[];
  previewConfig?: PreviewConfig;
  
  // Template Properties
  isPublic: boolean;
  isFeatured: boolean;
  isOfficial: boolean;
  isDeprecated: boolean;
  
  // Analytics
  downloadCount: number;
  rating?: number;
  ratingCount: number;
  
  // Manufacturing-Specific
  manufacturingType?: ManufacturingTemplateType;
  equipmentTypes: string[];
  isoStandards: string[];
  kpiTypes: string[];
  
  // Author Information
  authorId: string;
  authorName: string;
  authorEmail?: string;
  organization?: string;
  
  // Template Source
  sourceUrl?: string;
  documentationUrl?: string;
  supportUrl?: string;
  updateChannel?: string;
  
  // Timestamps
  publishedAt?: Date;
  lastUpdatedAt: Date;
  createdAt: Date;
  
  // Relations
  usageHistory?: TemplateUsage[];
  reviews?: TemplateReview[];
  versions?: TemplateVersion[];
  collectionItems?: TemplateCollectionItem[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  slug: string;
  
  // Hierarchy
  parentId?: string;
  parent?: TemplateCategory;
  children: TemplateCategory[];
  
  // Properties
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  
  // Manufacturing-Specific
  industryFocus: string[];
  complexityLevel?: ComplexityLevel;
  
  // Analytics
  templateCount: number;
  popularityScore: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  templates: DashboardTemplate[];
}

export interface TemplateUsage {
  id: string;
  templateId: string;
  userId: string;
  
  // Usage Context
  usageType: TemplateUsageType;
  dashboardId?: string;
  dashboardUid?: string;
  
  // Usage Details
  variables?: Record<string, any>;
  customizations?: Record<string, any>;
  
  // Environment
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  
  // Session
  sessionId?: string;
  usageDuration?: number;
  
  timestamp: Date;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  
  // Review Content
  rating: number; // 1-5 stars
  title?: string;
  comment?: string;
  
  // Detailed Ratings
  easeOfUse?: number;
  documentation?: number;
  applicability?: number;
  
  // Review Status
  isApproved: boolean;
  isHelpful: boolean;
  helpfulCount: number;
  
  // Context
  industryContext?: string;
  equipmentContext?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  versionNumber: number;
  
  // Version Content
  config: Dashboard;
  variables?: TemplateVariableConfig[];
  
  // Change Information
  changeType: VersionChangeType;
  changeLog?: string;
  migrationNotes?: string;
  
  // Compatibility
  compatibleWith: string[];
  deprecatedFeatures: string[];
  breakingChanges: string[];
  
  // Publishing
  isStable: boolean;
  isBeta: boolean;
  isAlpha: boolean;
  
  publishedAt: Date;
  publishedBy: string;
}

export interface TemplateCollection {
  id: string;
  name: string;
  description?: string;
  slug: string;
  
  // Properties
  isPublic: boolean;
  isFeatured: boolean;
  isOfficial: boolean;
  
  // Metadata
  thumbnail?: string;
  tags: string[];
  
  // Manufacturing Focus
  industryFocus: string[];
  useCaseType?: string;
  
  // Author
  authorId: string;
  
  // Analytics
  downloadCount: number;
  rating?: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  items: TemplateCollectionItem[];
}

export interface TemplateCollectionItem {
  id: string;
  collectionId: string;
  templateId: string;
  
  sortOrder: number;
  description?: string;
  
  addedAt: Date;
  addedBy: string;
}

// ============================================================================
// TEMPLATE CONFIGURATION TYPES
// ============================================================================

export interface TemplateVariableConfig {
  name: string;
  type: TemplateVariableType;
  label?: string;
  description?: string;
  defaultValue?: any;
  required?: boolean;
  
  // Variable-specific configuration
  options?: TemplateVariableOption[];
  query?: string;
  datasource?: string;
  
  // Validation
  validation?: TemplateVariableValidation;
  
  // UI Configuration
  inputType?: TemplateVariableInputType;
  placeholder?: string;
  helpText?: string;
}

export interface TemplateVariableOption {
  label: string;
  value: any;
  description?: string;
  isDefault?: boolean;
}

export interface TemplateVariableValidation {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: string; // Custom validation function
}

export interface TemplatePanel extends Panel {
  // Template-specific panel properties
  templateVariables?: string[]; // Variables used in this panel
  configurationOptions?: PanelConfigurationOption[];
  
  // Manufacturing-specific
  equipmentBinding?: string; // Bind to specific equipment type
  metricBinding?: string; // Bind to specific metric type
  
  // Template metadata
  isRequired?: boolean;
  canBeRemoved?: boolean;
  canBeModified?: boolean;
}

export interface PanelConfigurationOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  description?: string;
  required?: boolean;
}

export interface PreviewConfig {
  sampleData?: Record<string, any>;
  timeRange?: {
    from: string;
    to: string;
  };
  variables?: Record<string, any>;
  mockDataSources?: MockDataSource[];
}

export interface MockDataSource {
  name: string;
  type: string;
  data: any[];
  metrics: string[];
}

// ============================================================================
// TEMPLATE SEARCH AND FILTERING TYPES
// ============================================================================

export interface TemplateSearchRequest {
  query?: string;
  category?: string;
  tags?: string[];
  industry?: string[];
  manufacturingType?: ManufacturingTemplateType;
  equipmentType?: string;
  isoStandard?: string;
  complexityLevel?: ComplexityLevel;
  
  // Filters
  isPublic?: boolean;
  isFeatured?: boolean;
  isOfficial?: boolean;
  authorId?: string;
  
  // Sorting
  sortBy?: TemplateSortBy;
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

export interface TemplateSearchResponse {
  templates: DashboardTemplate[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  
  // Aggregations
  categories: CategoryAggregation[];
  tags: TagAggregation[];
  industries: IndustryAggregation[];
  manufacturingTypes: ManufacturingTypeAggregation[];
}

export interface CategoryAggregation {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface TagAggregation {
  tag: string;
  count: number;
}

export interface IndustryAggregation {
  industry: string;
  count: number;
}

export interface ManufacturingTypeAggregation {
  type: ManufacturingTemplateType;
  count: number;
}

// ============================================================================
// TEMPLATE IMPORT/EXPORT TYPES
// ============================================================================

export interface TemplateImportRequest {
  templateId: string;
  variables?: Record<string, any>;
  customizations?: TemplateCustomization[];
  targetFolderId?: string;
  dashboardTitle?: string;
}

export interface TemplateCustomization {
  panelId: number;
  property: string;
  value: any;
}

export interface TemplateExportRequest {
  dashboardId: string;
  templateName: string;
  templateDescription?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  
  // Template-specific configuration
  variableConfig?: TemplateVariableConfig[];
  panelConfig?: Record<number, PanelConfigurationOption[]>;
}

export interface TemplateInstantiationResult {
  dashboardId: string;
  dashboardUid: string;
  dashboardUrl: string;
  warnings?: string[];
  errors?: string[];
}

// ============================================================================
// TEMPLATE VALIDATION TYPES
// ============================================================================

export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationWarning[];
  compatibilityIssues: CompatibilityIssue[];
}

export interface TemplateValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TemplateValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface CompatibilityIssue {
  component: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  workaround?: string;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

export type ManufacturingTemplateType =
  | 'oee'
  | 'quality'
  | 'maintenance'
  | 'energy'
  | 'production'
  | 'equipment'
  | 'inventory'
  | 'safety'
  | 'sustainability'
  | 'cost'
  | 'performance'
  | 'compliance';

export type TemplateUsageType =
  | 'create_dashboard'
  | 'preview'
  | 'download'
  | 'clone'
  | 'export'
  | 'share';

export type VersionChangeType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'hotfix';

export type ComplexityLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type TemplateSortBy =
  | 'name'
  | 'created'
  | 'updated'
  | 'rating'
  | 'downloads'
  | 'popularity'
  | 'relevance';

export type TemplateVariableType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'query'
  | 'datasource'
  | 'custom';

export type TemplateVariableInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime'
  | 'color'
  | 'range';

// ============================================================================
// TEMPLATE MANAGER STATE TYPES
// ============================================================================

export interface TemplateManagerState {
  templates: DashboardTemplate[];
  categories: TemplateCategory[];
  selectedTemplate?: DashboardTemplate;
  selectedCategory?: string;
  
  // Search and Filter State
  searchQuery: string;
  activeFilters: TemplateFilters;
  sortBy: TemplateSortBy;
  sortOrder: 'asc' | 'desc';
  
  // UI State
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  error?: string;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  
  // Template Operations
  previewTemplate?: DashboardTemplate;
  isPreviewOpen: boolean;
  isEditorOpen: boolean;
  isImporting: boolean;
}

export interface TemplateFilters {
  category?: string;
  tags: string[];
  industry: string[];
  manufacturingType?: ManufacturingTemplateType;
  equipmentType?: string;
  complexityLevel?: ComplexityLevel;
  isPublic?: boolean;
  isFeatured?: boolean;
  isOfficial?: boolean;
  hasRating?: boolean;
  minRating?: number;
  authorId?: string;
}

// ============================================================================
// TEMPLATE LIBRARY COMPONENT PROPS
// ============================================================================

export interface TemplateLibraryProps {
  initialCategory?: string;
  initialFilters?: Partial<TemplateFilters>;
  onTemplateSelect?: (template: DashboardTemplate) => void;
  onTemplateImport?: (template: DashboardTemplate, variables?: Record<string, any>) => void;
  showCreateButton?: boolean;
  showImportButton?: boolean;
  maxHeight?: string;
  className?: string;
}

export interface TemplateCardProps {
  template: DashboardTemplate;
  onSelect?: (template: DashboardTemplate) => void;
  onPreview?: (template: DashboardTemplate) => void;
  onImport?: (template: DashboardTemplate) => void;
  onRate?: (template: DashboardTemplate, rating: number) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export interface TemplatePreviewProps {
  template: DashboardTemplate;
  isOpen: boolean;
  onClose: () => void;
  onImport?: (template: DashboardTemplate, variables?: Record<string, any>) => void;
  previewMode?: 'static' | 'interactive';
}

export interface TemplateEditorProps {
  template?: DashboardTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: DashboardTemplate) => void;
  mode?: 'create' | 'edit' | 'clone';
}

export interface TemplateImporterProps {
  template: DashboardTemplate;
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: TemplateInstantiationResult) => void;
  targetFolderId?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateTemplateResponse {
  template: DashboardTemplate;
  success: boolean;
  message?: string;
}

export interface UpdateTemplateResponse {
  template: DashboardTemplate;
  success: boolean;
  message?: string;
}

export interface DeleteTemplateResponse {
  success: boolean;
  message?: string;
}

export interface TemplateStatsResponse {
  totalTemplates: number;
  publicTemplates: number;
  featuredTemplates: number;
  totalDownloads: number;
  averageRating: number;
  topCategories: CategoryAggregation[];
  recentTemplates: DashboardTemplate[];
  trendingTemplates: DashboardTemplate[];
}