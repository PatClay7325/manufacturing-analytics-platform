/**
 * Dashboard Import API Routes
 * POST /api/import/dashboard - Upload and process dashboard import files
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileProcessingService } from '@/services/fileProcessingService';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import {
  ImportRequest,
  ImportResult,
  ImportProgress,
  ImportError,
  ImportWarning,
  FileFormat,
  ImportType,
  FieldMapping,
  ImportOptions
} from '@/types/import-export';
import { Dashboard } from '@/types/dashboard';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const optionsStr = formData.get('options') as string;
    const mappingStr = formData.get('mapping') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse options and mapping
    let options: ImportOptions;
    let mapping: FieldMapping | undefined;
    
    try {
      options = optionsStr ? JSON.parse(optionsStr) : getDefaultImportOptions();
      mapping = mappingStr ? JSON.parse(mappingStr) : undefined;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid options or mapping data' },
        { status: 400 }
      );
    }

    // Detect file format
    const format = detectFileFormat(file);
    if (!format) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Parse file
    const uploadResult = await fileProcessingService.parseFile(file, format);
    
    if (uploadResult.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'File parsing failed',
          details: uploadResult.errors 
        },
        { status: 400 }
      );
    }

    // Process import based on type
    const importType = options.importType || 'dashboard-config';
    const result = await processImport(uploadResult, importType, mapping, options);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process import based on type
 */
async function processImport(
  uploadResult: any,
  importType: ImportType,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  try {
    switch (importType) {
      case 'dashboard-config':
        return await importDashboardConfig(uploadResult, mapping, options);
      
      case 'dashboard-data':
        return await importDashboardData(uploadResult, mapping, options);
      
      case 'panel-data':
        return await importPanelData(uploadResult, mapping, options);
      
      case 'template-batch':
        return await importTemplateBatch(uploadResult, mapping, options);
      
      case 'metrics-data':
        return await importMetricsData(uploadResult, mapping, options);
      
      case 'variables-config':
        return await importVariablesConfig(uploadResult, mapping, options);
      
      default:
        throw new Error(`Unsupported import type: ${importType}`);
    }
  } catch (error) {
    errors.push({
      row: 0,
      field: 'general',
      value: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 1,
      warningCount: 0,
      skippedCount: 0,
      createdIds: [],
      updatedIds: [],
      errors,
      warnings,
      statistics: {
        dashboardsCreated: 0,
        dashboardsUpdated: 0,
        panelsCreated: 0,
        panelsUpdated: 0,
        variablesCreated: 0,
        dataPointsImported: 0,
        filesProcessed: 1,
        totalSize: uploadResult.file.size
      },
      duration: Date.now() - startTime
    };
  }
}

/**
 * Import dashboard configuration
 */
async function importDashboardConfig(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  // Transform data using mapping
  let transformedData: any[] = [];
  
  if (mapping) {
    transformedData = await fileProcessingService.transformData(
      uploadResult.rawData,
      mapping
    );
  } else {
    // Handle JSON dashboard import directly
    if (uploadResult.format === 'json') {
      try {
        const jsonData = JSON.parse(await uploadResult.file.text());
        if (isDashboardJson(jsonData)) {
          transformedData = [jsonData];
        } else {
          transformedData = Array.isArray(jsonData) ? jsonData : [jsonData];
        }
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    } else {
      throw new Error('Mapping is required for CSV/Excel imports');
    }
  }

  // Process each dashboard
  for (let i = 0; i < transformedData.length; i++) {
    const dashboardData = transformedData[i];
    
    try {
      // Validate required fields
      if (!dashboardData.title) {
        errors.push({
          row: i + 1,
          field: 'title',
          value: dashboardData.title,
          error: 'Title is required'
        });
        continue;
      }

      // Create dashboard object
      const dashboard: Partial<Dashboard> = {
        uid: dashboardData.uid || generateUID(),
        title: dashboardData.title,
        description: dashboardData.description || '',
        tags: Array.isArray(dashboardData.tags) 
          ? dashboardData.tags 
          : (dashboardData.tags ? String(dashboardData.tags).split(',').map(t => t.trim()) : []),
        panels: dashboardData.panels || [],
        templating: dashboardData.templating || { list: [] },
        annotations: dashboardData.annotations || [],
        links: dashboardData.links || [],
        time: dashboardData.time || { from: 'now-6h', to: 'now' },
        timepicker: dashboardData.timepicker || {
          refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
          time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
        },
        refresh: dashboardData.refresh || '30s',
        schemaVersion: dashboardData.schemaVersion || 1,
        version: dashboardData.version || 1,
        timezone: dashboardData.timezone || 'browser',
        fiscalYearStartMonth: dashboardData.fiscalYearStartMonth || 0,
        liveNow: dashboardData.liveNow || false,
        weekStart: dashboardData.weekStart || '',
        style: dashboardData.style || 'dark',
        editable: dashboardData.editable !== false,
        hideControls: dashboardData.hideControls || false,
        graphTooltip: dashboardData.graphTooltip || 0,
        preload: dashboardData.preload || false,
        meta: {
          canSave: true,
          canEdit: true,
          canAdmin: true,
          canStar: true,
          canDelete: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1
        }
      };

      // Check if dashboard exists
      const existingDashboard = await findExistingDashboard(dashboard.uid!, dashboard.title!);
      
      if (existingDashboard && !options.overwriteExisting) {
        warnings.push({
          row: i + 1,
          field: 'uid',
          value: dashboard.uid,
          warning: 'Dashboard already exists, skipping',
          action: 'skip'
        });
        continue;
      }

      // Save dashboard
      const saveResult = await dashboardPersistenceService.saveDashboard({
        dashboard: dashboard as Dashboard,
        message: `Imported from ${uploadResult.file.name}`,
        overwrite: options.overwriteExisting,
        userId: 'system', // TODO: Get from auth
        folderId: options.targetFolder
      });

      if (existingDashboard) {
        updatedIds.push(saveResult.uid);
      } else {
        createdIds.push(saveResult.uid);
      }

    } catch (error) {
      errors.push({
        row: i + 1,
        field: 'general',
        value: '',
        error: error instanceof Error ? error.message : 'Failed to save dashboard'
      });
    }
  }

  return {
    success: errors.length === 0,
    totalProcessed: transformedData.length,
    successCount: createdIds.length + updatedIds.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    skippedCount: warnings.filter(w => w.action === 'skip').length,
    createdIds,
    updatedIds,
    errors,
    warnings,
    statistics: {
      dashboardsCreated: createdIds.length,
      dashboardsUpdated: updatedIds.length,
      panelsCreated: 0,
      panelsUpdated: 0,
      variablesCreated: 0,
      dataPointsImported: 0,
      filesProcessed: 1,
      totalSize: uploadResult.file.size
    },
    duration: Date.now() - startTime
  };
}

/**
 * Import dashboard data (placeholder)
 */
async function importDashboardData(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  // TODO: Implement dashboard data import
  return createEmptyResult(uploadResult);
}

/**
 * Import panel data (placeholder)
 */
async function importPanelData(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  // TODO: Implement panel data import
  return createEmptyResult(uploadResult);
}

/**
 * Import template batch (placeholder)
 */
async function importTemplateBatch(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  // TODO: Implement template batch import
  return createEmptyResult(uploadResult);
}

/**
 * Import metrics data (placeholder)
 */
async function importMetricsData(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  // TODO: Implement metrics data import
  return createEmptyResult(uploadResult);
}

/**
 * Import variables config (placeholder)
 */
async function importVariablesConfig(
  uploadResult: any,
  mapping: FieldMapping | undefined,
  options: ImportOptions
): Promise<ImportResult> {
  // TODO: Implement variables config import
  return createEmptyResult(uploadResult);
}

/**
 * Utility functions
 */
function detectFileFormat(file: File): FileFormat | null {
  const extension = file.name.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv':
      return 'csv';
    case 'xlsx':
    case 'xls':
      return 'excel';
    case 'json':
      return 'json';
    default:
      return null;
  }
}

function getDefaultImportOptions(): ImportOptions {
  return {
    overwriteExisting: false,
    createMissing: true,
    skipErrors: false,
    validateData: true,
    batchSize: 100,
    tags: []
  };
}

function isDashboardJson(data: any): boolean {
  return data && 
         typeof data === 'object' &&
         (data.uid || data.id) &&
         data.title &&
         Array.isArray(data.panels);
}

function generateUID(): string {
  return 'dashboard_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function findExistingDashboard(uid: string, title: string): Promise<any> {
  try {
    // Try to find by UID first
    const result = await dashboardPersistenceService.searchDashboards({
      query: uid,
      limit: 1,
      page: 1
    });
    
    if (result.dashboards.length > 0) {
      return result.dashboards[0];
    }
    
    // Try to find by title
    const titleResult = await dashboardPersistenceService.searchDashboards({
      query: title,
      limit: 1,
      page: 1
    });
    
    return titleResult.dashboards.length > 0 ? titleResult.dashboards[0] : null;
  } catch (error) {
    return null;
  }
}

function createEmptyResult(uploadResult: any): ImportResult {
  return {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    skippedCount: 0,
    createdIds: [],
    updatedIds: [],
    errors: [],
    warnings: [],
    statistics: {
      dashboardsCreated: 0,
      dashboardsUpdated: 0,
      panelsCreated: 0,
      panelsUpdated: 0,
      variablesCreated: 0,
      dataPointsImported: 0,
      filesProcessed: 1,
      totalSize: uploadResult.file.size
    },
    duration: 0
  };
}