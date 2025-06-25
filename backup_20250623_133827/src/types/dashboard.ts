/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Dashboard Type Definitions
 * 
 * Core type definitions for the dashboard system
 */

// ============================================================================
// CORE DASHBOARD TYPES
// ============================================================================

export interface Dashboard {
  id: string;
  uid: string;
  title: string;
  description?: string;
  tags: string[];
  folderId?: string;
  folderUid?: string;
  folderTitle?: string;
  panels: Panel[];
  templating: Templating;
  annotations: AnnotationQuery[];
  links: DashboardLink[];
  time: TimeRange;
  timepicker: TimePicker;
  refresh: string | boolean;
  schemaVersion: number;
  version: number;
  timezone: string;
  fiscalYearStartMonth: number;
  liveNow: boolean;
  weekStart: string;
  style: 'dark' | 'light';
  editable: boolean;
  hideControls: boolean;
  graphTooltip: number;
  preload: boolean;
  snapshot?: DashboardSnapshot;
  meta: DashboardMeta;
}

export interface Panel {
  id: number;
  title: string;
  type: string;
  gridPos: GridPos;
  targets: DataQuery[];
  fieldConfig: FieldConfig;
  options: Record<string, any>;
  pluginVersion?: string;
  transformations: DataTransformerConfig[];
  transparent: boolean;
  datasource?: DataSourceRef;
  description?: string;
  links: PanelLink[];
  repeat?: string;
  repeatDirection?: 'h' | 'v';
  maxDataPoints?: number;
  interval?: string;
  cacheTimeout?: string;
  timeFrom?: string;
  timeShift?: string;
  hideTimeOverride?: boolean;
  libraryPanel?: LibraryPanel;
}

export interface GridPos {
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
}

export interface FieldConfig {
  defaults: FieldConfigDefaults;
  overrides: FieldConfigOverride[];
}

export interface FieldConfigDefaults {
  displayName?: string;
  displayNameFromDS?: string;
  description?: string;
  path?: string;
  writeable?: boolean;
  filterable?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  decimals?: number;
  noValue?: string;
  custom?: Record<string, any>;
  color?: FieldColor;
  thresholds?: ThresholdsConfig;
  mappings?: ValueMapping[];
  links?: DataLink[];
}

export interface FieldConfigOverride {
  matcher: FieldMatcher;
  properties: DynamicConfigValue[];
}

export interface FieldMatcher {
  id: string;
  options?: any;
}

export interface DynamicConfigValue {
  id: string;
  value?: any;
}

// ============================================================================
// TIME AND REFRESH TYPES
// ============================================================================

export interface TimeRange {
  from: string | Date;
  to: string | Date;
  raw?: RawTimeRange;
}

export interface RawTimeRange {
  from: string;
  to: string;
}

export interface TimePicker {
  refresh_intervals: string[];
  time_options: string[];
  nowDelay?: string;
  hidden?: boolean;
}

// ============================================================================
// TEMPLATING TYPES
// ============================================================================

export interface Templating {
  list: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: VariableType;
  label?: string;
  description?: string;
  query?: string;
  datasource?: DataSourceRef;
  regex?: string;
  sort?: number;
  refresh?: VariableRefresh;
  options?: VariableOption[];
  current?: VariableOption;
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string;
  hide?: VariableHide;
  skipUrlSync?: boolean;
  index?: number;
  definition?: string;
  tags?: string[];
  tagValuesQuery?: string;
  tagsQuery?: string;
  useTags?: boolean;
}

export type VariableType = 
  | 'query' 
  | 'custom' 
  | 'constant' 
  | 'datasource' 
  | 'interval' 
  | 'textbox' 
  | 'adhoc'
  | 'groupby'
  | 'system';

export type VariableRefresh = 'never' | 'onDashboardLoad' | 'onTimeRangeChanged';

export type VariableHide = 0 | 1 | 2; // 0: visible, 1: hidden label, 2: hidden variable

export interface VariableOption {
  text: string | string[];
  value: string | string[];
  selected?: boolean;
}

// ============================================================================
// DATA QUERY TYPES
// ============================================================================

export interface DataQuery {
  refId: string;
  queryType?: string;
  datasource?: DataSourceRef;
  hide?: boolean;
  key?: string;
  metric?: string;
  [key: string]: any;
}

export interface DataSourceRef {
  type?: string;
  uid?: string;
  name?: string;
}

// ============================================================================
// ANNOTATION TYPES
// ============================================================================

export interface AnnotationQuery {
  name: string;
  datasource?: DataSourceRef;
  enable: boolean;
  hide?: boolean;
  iconColor?: string;
  query?: string;
  type?: string;
  builtIn?: number;
  target?: AnnotationTarget;
  filter?: AnnotationEventFieldMapping;
  mappings?: AnnotationEventFieldMapping;
}

export interface AnnotationTarget {
  limit?: number;
  matchAny?: boolean;
  tags?: string[];
  type?: string;
}

export interface AnnotationEventFieldMapping {
  [key: string]: string;
}

// ============================================================================
// LINK TYPES
// ============================================================================

export interface DashboardLink {
  type: 'link' | 'dashboards';
  title: string;
  url?: string;
  icon?: string;
  tooltip?: string;
  targetBlank?: boolean;
  includeVars?: boolean;
  keepTime?: boolean;
  tags?: string[];
  asDropdown?: boolean;
}

export interface PanelLink {
  type: 'link' | 'dashboard';
  title: string;
  url?: string;
  targetBlank?: boolean;
  includeVars?: boolean;
  keepTime?: boolean;
  dashboardIdRef?: number;
  panelIdRef?: number;
}

export interface DataLink {
  title: string;
  url: string;
  targetBlank?: boolean;
  internal?: InternalDataLink;
}

export interface InternalDataLink {
  datasourceUid: string;
  datasourceName: string;
  query: any;
}

// ============================================================================
// COLOR AND THEMING TYPES
// ============================================================================

export interface FieldColor {
  mode: FieldColorModeId;
  fixedColor?: string;
  seriesBy?: FieldColorSeriesByMode;
}

export type FieldColorModeId = 
  | 'palette-classic'
  | 'palette-modern'
  | 'auto'
  | 'fixed'
  | 'shades'
  | 'continuous-GrYlRd';

export type FieldColorSeriesByMode = 'min' | 'max' | 'last';

// ============================================================================
// THRESHOLD TYPES
// ============================================================================

export interface ThresholdsConfig {
  mode: ThresholdsMode;
  steps: Threshold[];
}

export type ThresholdsMode = 'absolute' | 'percentage';

export interface Threshold {
  color: string;
  value: number | null;
  state?: string;
}

// ============================================================================
// VALUE MAPPING TYPES
// ============================================================================

export interface ValueMapping {
  type: MappingType;
  options: ValueMappingOptions;
}

export type MappingType = 'value' | 'range' | 'regex' | 'special';

export interface ValueMappingOptions {
  [key: string]: any;
}

// ============================================================================
// TRANSFORMATION TYPES
// ============================================================================

export interface DataTransformerConfig {
  id: string;
  options: Record<string, any>;
  filter?: DataTransformFilter;
  disabled?: boolean;
}

export interface DataTransformFilter {
  id: string;
  options?: any;
}

// ============================================================================
// LIBRARY PANEL TYPES
// ============================================================================

export interface LibraryPanel {
  uid: string;
  name: string;
  type: string;
  description?: string;
  model: Panel;
  version: number;
  tags: string[];
  category?: string;
  folderId?: string;
  connectedDashboards: number;
  usageCount: number;
  lastUsedAt?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  meta: LibraryPanelMeta;
}

export interface LibraryPanelMeta {
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  connectedDashboards: number;
  created: string;
  updated: string;
  createdBy: LibraryPanelUser;
  updatedBy?: LibraryPanelUser;
  folderName?: string;
  folderUid?: string;
  versions: LibraryPanelVersion[];
  permissions: LibraryPanelPermissions;
}

export interface LibraryPanelUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface LibraryPanelVersion {
  id: string;
  version: number;
  model: Panel;
  message?: string;
  createdBy: string;
  createdAt: string;
  creator: LibraryPanelUser;
}

export interface LibraryPanelUsage {
  id: string;
  libraryPanelUid: string;
  dashboardUid: string;
  dashboardTitle: string;
  panelId: number;
  panelTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryPanelPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canCreateVersion: boolean;
}

// Library Panel API request/response types
export interface LibraryPanelSearchRequest {
  query?: string;
  page?: number;
  perPage?: number;
  sort?: 'name' | 'created' | 'updated' | 'type' | 'usage';
  sortDirection?: 'asc' | 'desc';
  typeFilter?: string;
  folderFilter?: string;
  tagFilter?: string[];
  excludeUids?: string[];
}

export interface LibraryPanelSearchResponse {
  totalCount: number;
  page: number;
  perPage: number;
  result: LibraryPanel[];
}

export interface CreateLibraryPanelRequest {
  name: string;
  type: string;
  description?: string;
  model: Panel;
  tags?: string[];
  category?: string;
  folderId?: string;
}

export interface UpdateLibraryPanelRequest {
  name?: string;
  description?: string;
  model?: Panel;
  tags?: string[];
  category?: string;
  folderId?: string;
  version?: number;
  message?: string;
}

export interface LibraryPanelWithConnections extends LibraryPanel {
  connections: LibraryPanelUsage[];
}

// Library Panel Manager state types
export interface LibraryPanelManagerState {
  panels: LibraryPanel[];
  selectedPanel?: LibraryPanel;
  isLoading: boolean;
  error?: string;
  searchQuery: string;
  filters: LibraryPanelFilters;
  pagination: LibraryPanelPagination;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'created' | 'updated' | 'type' | 'usage';
  sortDirection: 'asc' | 'desc';
}

export interface LibraryPanelFilters {
  type?: string;
  folder?: string;
  tags: string[];
  category?: string;
  showOnlyMine: boolean;
}

export interface LibraryPanelPagination {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

// ============================================================================
// DASHBOARD META TYPES
// ============================================================================

export interface DashboardMeta {
  canSave?: boolean;
  canEdit?: boolean;
  canAdmin?: boolean;
  canStar?: boolean;
  canDelete?: boolean;
  slug?: string;
  url?: string;
  expires?: string;
  created?: string;
  updated?: string;
  updatedBy?: string;
  createdBy?: string;
  version?: number;
  hasAcl?: boolean;
  isFolder?: boolean;
  folderId?: number;
  folderUid?: string;
  folderTitle?: string;
  folderUrl?: string;
  provisioned?: boolean;
  provisionedExternalId?: string;
}

export interface DashboardSnapshot {
  id?: number;
  name: string;
  key?: string;
  deleteKey?: string;
  orgId?: number;
  userId?: number;
  external: boolean;
  externalUrl: string;
  expires: string;
  created: string;
  updated: string;
  originalUrl?: string;
}

// ============================================================================
// MANUFACTURING-SPECIFIC EXTENSIONS
// ============================================================================

export interface ManufacturingDashboard extends Dashboard {
  manufacturingConfig: ManufacturingConfig;
}

export interface ManufacturingConfig {
  productionLine?: string;
  shift?: string;
  department?: string;
  equipment?: string[];
  oeeMeasurement?: boolean;
  qualityTracking?: boolean;
  maintenanceAlerts?: boolean;
  energyMonitoring?: boolean;
}

export interface EquipmentPanel extends Panel {
  equipmentId?: string;
  equipmentType?: EquipmentType;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface EquipmentType {
  id: string;
  name: string;
  category: 'production' | 'auxiliary' | 'quality' | 'logistics';
  specifications: Record<string, any>;
}

export interface MaintenanceSchedule {
  nextMaintenance: Date;
  lastMaintenance: Date;
  maintenanceType: 'preventive' | 'predictive' | 'corrective';
  priority: 'low' | 'medium' | 'high' | 'critical';
}