/**
 * Import/Export Type Definitions
 * Comprehensive types for CSV/Excel import/export functionality
 */

import { Dashboard, Panel } from './dashboard';

// ============================================================================
// CORE IMPORT/EXPORT TYPES
// ============================================================================

export type FileFormat = 'csv' | 'excel' | 'json';
export type ImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'import' | 'complete';
export type ExportStep = 'options' | 'format' | 'export' | 'download' | 'complete';

// ============================================================================
// FILE PROCESSING TYPES
// ============================================================================

export interface FileUploadResult {
  file: File;
  format: FileFormat;
  size: number;
  rawData: any[][];
  headers: string[];
  preview: any[];
  errors: FileError[];
  warnings: FileWarning[];
}

export interface FileError {
  type: 'parse' | 'validation' | 'format' | 'size' | 'encoding';
  message: string;
  row?: number;
  column?: string;
  value?: any;
}

export interface FileWarning {
  type: 'data' | 'format' | 'structure';
  message: string;
  row?: number;
  column?: string;
  suggestion?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: FileError[];
  warnings: FileWarning[];
  statistics: FileStatistics;
}

export interface FileStatistics {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  totalColumns: number;
  mappedColumns: number;
  unmappedColumns: number;
  duplicateRows: number;
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportRequest {
  file: File;
  format: FileFormat;
  importType: ImportType;
  options: ImportOptions;
  mapping: FieldMapping;
  validation: ValidationOptions;
}

export type ImportType = 
  | 'dashboard-config'     // Import dashboard configuration
  | 'dashboard-data'       // Import dashboard with data
  | 'panel-data'          // Import panel data only
  | 'template-batch'      // Batch create from template
  | 'metrics-data'        // Import metrics data
  | 'variables-config'     // Import variable configuration
  | 'manufacturing-data'   // Import manufacturing metrics
  | 'equipment-data'       // Import equipment data
  | 'alert-rules';         // Import alert configurations

export interface ImportOptions {
  overwriteExisting: boolean;
  createMissing: boolean;
  skipErrors: boolean;
  validateData: boolean;
  batchSize: number;
  targetFolder?: string;
  tags?: string[];
  prefix?: string;
  suffix?: string;
}

export interface ValidationOptions {
  validateSchema: boolean;
  validateData: boolean;
  validateReferences: boolean;
  strictMode: boolean;
  customRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  rule: string | RegExp | ((value: any) => boolean);
  message: string;
}

export interface FieldMapping {
  mappings: ColumnMapping[];
  transforms: DataTransform[];
  defaults: Record<string, any>;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  fieldType: FieldType;
  required: boolean;
  transform?: TransformFunction;
  defaultValue?: any;
  validation?: FieldValidation;
}

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'array' 
  | 'object' 
  | 'json'
  | 'enum';

export interface FieldValidation {
  required?: boolean;
  pattern?: RegExp;
  min?: number;
  max?: number;
  options?: string[];
  custom?: (value: any) => boolean;
}

export type TransformFunction = 
  | 'lowercase' 
  | 'uppercase' 
  | 'trim' 
  | 'parseNumber' 
  | 'parseDate' 
  | 'parseBoolean'
  | 'splitArray'
  | 'parseJSON'
  | 'custom';

export interface DataTransform {
  type: TransformFunction;
  options?: Record<string, any>;
  customFunction?: (value: any) => any;
}

export interface ImportProgress {
  step: ImportStep;
  percentage: number;
  processedRows: number;
  totalRows: number;
  currentOperation: string;
  estimatedTimeRemaining?: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  error: string;
  suggestion?: string;
}

export interface ImportWarning {
  row: number;
  field: string;
  value: any;
  warning: string;
  action: 'skip' | 'default' | 'convert';
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  skippedCount: number;
  createdIds: string[];
  updatedIds: string[];
  errors: ImportError[];
  warnings: ImportWarning[];
  statistics: ImportStatistics;
  duration: number;
  // Additional fields for UI compatibility
  importType?: ImportType;
  recordsImported?: number;
  fileName?: string;
  fileSize?: string;
}

export interface ImportStatistics {
  dashboardsCreated: number;
  dashboardsUpdated: number;
  panelsCreated: number;
  panelsUpdated: number;
  variablesCreated: number;
  dataPointsImported: number;
  filesProcessed: number;
  totalSize: number;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportRequest {
  targets: ExportTarget[];
  format: FileFormat;
  options: ExportOptions;
  template?: ExportTemplate;
}

export interface ExportTarget {
  type: ExportTargetType;
  id: string;
  include: ExportIncludeOptions;
}

export type ExportTargetType = 
  | 'dashboard' 
  | 'panel' 
  | 'folder' 
  | 'library-panel'
  | 'datasource'
  | 'variable';

export interface ExportIncludeOptions {
  configuration: boolean;
  data: boolean;
  metadata: boolean;
  history: boolean;
  permissions: boolean;
  linkedPanels: boolean;
  variables: boolean;
  annotations: boolean;
}

export interface ExportOptions {
  includeData: boolean;
  includeMetadata: boolean;
  includeHistory: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  dataFormat: 'raw' | 'formatted' | 'aggregated';
  compression: boolean;
  fileName?: string;
  customFields?: string[];
  filters?: ExportFilter[];
}

export interface ExportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: any;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: FileFormat;
  columnMapping: ExportColumnMapping[];
  formatting: ExportFormatting;
  filters: ExportFilter[];
}

export interface ExportColumnMapping {
  sourceField: string;
  targetColumn: string;
  header: string;
  format?: ExportFieldFormat;
  transform?: ExportTransform;
}

export interface ExportFieldFormat {
  type: 'string' | 'number' | 'date' | 'boolean' | 'json';
  pattern?: string;
  locale?: string;
  precision?: number;
}

export interface ExportTransform {
  type: 'format' | 'calculate' | 'lookup' | 'custom';
  options: Record<string, any>;
}

export interface ExportFormatting {
  headers: boolean;
  headerStyle?: CellStyle;
  dataStyle?: CellStyle;
  alternateRowStyle?: CellStyle;
  dateFormat: string;
  numberFormat: string;
  booleanFormat: 'true/false' | '1/0' | 'yes/no';
}

export interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface ExportProgress {
  step: ExportStep;
  percentage: number;
  processedItems: number;
  totalItems: number;
  currentOperation: string;
  estimatedTimeRemaining?: number;
  currentFile?: string;
}

export interface ExportResult {
  success: boolean;
  files: ExportFile[];
  statistics: ExportStatistics;
  duration: number;
  errors: ExportError[];
  warnings: ExportWarning[];
}

export interface ExportFile {
  name: string;
  format: FileFormat;
  size: number;
  url: string;
  downloadUrl: string;
  expiresAt?: string;
}

export interface ExportStatistics {
  totalItems: number;
  dashboards: number;
  panels: number;
  dataPoints: number;
  totalSize: number;
  compressionRatio?: number;
}

export interface ExportError {
  item: string;
  error: string;
  details?: string;
}

export interface ExportWarning {
  item: string;
  warning: string;
  details?: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  supportedFormats: FileFormat[];
  fieldMappings: TemplateFieldMapping[];
  validationRules: ValidationRule[];
  transforms: DataTransform[];
  sampleFile?: string;
  schema?: TemplateSchema;
}

export interface TemplateFieldMapping {
  templateField: string;
  targetField: string;
  fieldType: FieldType;
  required: boolean;
  description: string;
  examples: string[];
  defaultValue?: any;
}

export interface TemplateSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface SchemaProperty {
  type: string;
  description: string;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

// ============================================================================
// DASHBOARD-SPECIFIC IMPORT/EXPORT TYPES
// ============================================================================

export interface DashboardImportData {
  dashboard: Partial<Dashboard>;
  panels: Partial<Panel>[];
  variables: any[];
  annotations: any[];
  metadata: DashboardImportMetadata;
}

export interface DashboardImportMetadata {
  sourceFormat: FileFormat;
  importedAt: string;
  importedBy: string;
  originalFileName: string;
  version: string;
  statistics: ImportStatistics;
}

export interface DashboardExportData {
  dashboard: Dashboard;
  data?: DashboardData;
  metadata: DashboardExportMetadata;
}

export interface DashboardData {
  panels: PanelData[];
  variables: VariableData[];
  annotations: AnnotationData[];
  timeRange: {
    from: string;
    to: string;
  };
}

export interface PanelData {
  panelId: number;
  title: string;
  type: string;
  data: any[];
  metadata: {
    queries: any[];
    lastUpdated: string;
    dataSource: string;
  };
}

export interface VariableData {
  name: string;
  value: any;
  options: any[];
  metadata: {
    lastUpdated: string;
    source: string;
  };
}

export interface AnnotationData {
  id: string;
  text: string;
  time: string;
  timeEnd?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface DashboardExportMetadata {
  exportedAt: string;
  exportedBy: string;
  format: FileFormat;
  version: string;
  options: ExportOptions;
  statistics: ExportStatistics;
}

// ============================================================================
// BATCH PROCESSING TYPES
// ============================================================================

export interface BatchImportRequest {
  files: File[];
  template: ImportTemplate;
  options: BatchImportOptions;
}

export interface BatchImportOptions extends ImportOptions {
  parallelProcessing: boolean;
  maxConcurrentFiles: number;
  stopOnError: boolean;
  createReport: boolean;
}

export interface BatchImportResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  results: ImportResult[];
  report?: BatchImportReport;
  duration: number;
}

export interface BatchImportReport {
  summary: BatchImportSummary;
  details: BatchImportDetail[];
  errors: BatchImportError[];
  recommendations: string[];
}

export interface BatchImportSummary {
  filesProcessed: number;
  dashboardsCreated: number;
  dashboardsUpdated: number;
  totalErrors: number;
  totalWarnings: number;
  averageProcessingTime: number;
}

export interface BatchImportDetail {
  fileName: string;
  status: 'success' | 'error' | 'warning';
  itemsProcessed: number;
  duration: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface BatchImportError {
  fileName: string;
  error: string;
  details: string;
  fatal: boolean;
}

export interface BatchExportRequest {
  targets: ExportTarget[];
  format: FileFormat;
  options: BatchExportOptions;
}

export interface BatchExportOptions extends ExportOptions {
  separateFiles: boolean;
  archiveResults: boolean;
  parallelProcessing: boolean;
  maxConcurrentExports: number;
}

export interface BatchExportResult {
  totalTargets: number;
  successCount: number;
  errorCount: number;
  files: ExportFile[];
  archive?: ExportFile;
  duration: number;
  errors: ExportError[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ImportWizardState {
  currentStep: ImportStep;
  canProceed: boolean;
  canGoBack: boolean;
  file?: File;
  uploadResult?: FileUploadResult;
  mapping?: FieldMapping;
  validation?: FileValidationResult;
  options?: ImportOptions;
  progress?: ImportProgress;
  result?: ImportResult;
  errors: string[];
}

export interface ExportWizardState {
  currentStep: ExportStep;
  canProceed: boolean;
  canGoBack: boolean;
  targets: ExportTarget[];
  format?: FileFormat;
  options?: ExportOptions;
  template?: ExportTemplate;
  progress?: ExportProgress;
  result?: ExportResult;
  errors: string[];
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ImportApiRequest {
  file: FormData;
  options: ImportOptions;
  mapping?: FieldMapping;
}

export interface ImportApiResponse {
  success: boolean;
  result?: ImportResult;
  progress?: ImportProgress;
  error?: string;
}

export interface ExportApiRequest {
  targets: ExportTarget[];
  format: FileFormat;
  options: ExportOptions;
}

export interface ExportApiResponse {
  success: boolean;
  result?: ExportResult;
  progress?: ExportProgress;
  error?: string;
}

export interface ValidationApiRequest {
  file: FormData;
  template?: string;
  options?: ValidationOptions;
}

export interface ValidationApiResponse {
  success: boolean;
  validation: FileValidationResult;
  mapping?: FieldMapping;
  error?: string;
}