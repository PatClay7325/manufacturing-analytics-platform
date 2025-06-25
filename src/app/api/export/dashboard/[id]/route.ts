/**
 * Dashboard Export API Routes
 * GET /api/export/dashboard/[id] - Export specific dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileProcessingService } from '@/services/fileProcessingService';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import {
  ExportRequest,
  ExportResult,
  ExportFile,
  ExportError,
  ExportWarning,
  ExportStatistics,
  FileFormat,
  ExportOptions
} from '@/types/import-export';
import { Dashboard } from '@/types/dashboard';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as FileFormat) || 'json';
    const includeData = searchParams.get('includeData') !== 'false';
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';
    const fileName = searchParams.get('fileName');

    // Validate format
    if (!['csv', 'excel', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format. Supported: csv, excel, json' },
        { status: 400 }
      );
    }

    // Get dashboard
    const dashboard = await getDashboard(params.id);
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Export dashboard
    const exportOptions: ExportOptions = {
      includeData,
      includeMetadata,
      includeHistory: false,
      dataFormat: 'formatted',
      compression: false,
      fileName: fileName || undefined
    };

    const result = await exportDashboard(dashboard, format, exportOptions);

    if (!result.success || result.files.length === 0) {
      return NextResponse.json(
        { error: 'Export failed', details: result.errors },
        { status: 500 }
      );
    }

    const exportFile = result.files[0];
    
    // Read the exported file
    const fileBlob = await readExportFile(exportFile);
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', getMimeType(format));
    headers.set('Content-Disposition', `attachment; filename="${exportFile.name}"`);
    headers.set('Content-Length', exportFile.size.toString());

    return new Response(fileBlob, { headers });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exportRequest: ExportRequest = await request.json();

    // Get dashboard
    const dashboard = await getDashboard(params.id);
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Export dashboard with custom options
    const result = await exportDashboard(
      dashboard, 
      exportRequest.format, 
      exportRequest.options
    );

    return NextResponse.json({
      success: result.success,
      result
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Export dashboard to specified format
 */
async function exportDashboard(
  dashboard: Dashboard,
  format: FileFormat,
  options: ExportOptions
): Promise<ExportResult> {
  const startTime = Date.now();
  const errors: ExportError[] = [];
  const warnings: ExportWarning[] = [];

  try {
    // Prepare export data
    const exportData = await prepareExportData(dashboard, options);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = options.fileName || 
      `dashboard-${dashboard.uid}-${timestamp}.${format}`;

    // Export to specified format
    const blob = await fileProcessingService.exportData(
      exportData,
      format,
      fileName,
      {
        compression: options.compression,
        delimiter: format === 'csv' ? ',' : undefined,
        sheetName: dashboard.title
      }
    );

    // Create export file info
    const exportFile: ExportFile = {
      name: fileName,
      format,
      size: blob.size,
      url: '', // Would be set by file storage service
      downloadUrl: '', // Would be set by file storage service
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Save blob temporarily (in production, would use proper file storage)
    await saveExportFile(exportFile, blob);

    const statistics: ExportStatistics = {
      totalItems: 1,
      dashboards: 1,
      panels: dashboard.panels.length,
      dataPoints: calculateDataPoints(exportData),
      totalSize: blob.size,
      compressionRatio: options.compression ? 0.7 : 1.0 // Estimated
    };

    return {
      success: true,
      files: [exportFile],
      statistics,
      duration: Date.now() - startTime,
      errors,
      warnings
    };

  } catch (error) {
    errors.push({
      item: dashboard.uid,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      files: [],
      statistics: {
        totalItems: 1,
        dashboards: 0,
        panels: 0,
        dataPoints: 0,
        totalSize: 0
      },
      duration: Date.now() - startTime,
      errors,
      warnings
    };
  }
}

/**
 * Prepare data for export based on options
 */
async function prepareExportData(
  dashboard: Dashboard,
  options: ExportOptions
): Promise<any[]> {
  const exportData: any[] = [];

  if (options.includeMetadata) {
    // Export dashboard metadata
    const dashboardMeta = {
      type: 'dashboard',
      uid: dashboard.uid,
      title: dashboard.title,
      description: dashboard.description,
      tags: dashboard.tags.join(', '),
      panelCount: dashboard.panels.length,
      version: dashboard.version,
      created: dashboard.meta.created,
      updated: dashboard.meta.updated,
      schemaVersion: dashboard.schemaVersion,
      timezone: dashboard.timezone,
      refresh: dashboard.refresh
    };

    exportData.push(dashboardMeta);

    // Export panel metadata
    dashboard.panels.forEach(panel => {
      const panelMeta = {
        type: 'panel',
        dashboardUid: dashboard.uid,
        panelId: panel.id,
        title: panel.title,
        panelType: panel.type,
        gridX: panel.gridPos.x,
        gridY: panel.gridPos.y,
        gridW: panel.gridPos.w,
        gridH: panel.gridPos.h,
        transparent: panel.transparent,
        datasource: panel.datasource?.uid || '',
        targets: panel.targets.length,
        transformations: panel.transformations.length
      };

      exportData.push(panelMeta);
    });
  }

  if (options.includeData) {
    // Export panel configurations
    dashboard.panels.forEach(panel => {
      const panelConfig = {
        type: 'panel-config',
        dashboardUid: dashboard.uid,
        panelId: panel.id,
        title: panel.title,
        panelType: panel.type,
        options: JSON.stringify(panel.options),
        fieldConfig: JSON.stringify(panel.fieldConfig),
        targets: JSON.stringify(panel.targets),
        transformations: JSON.stringify(panel.transformations)
      };

      exportData.push(panelConfig);
    });

    // Export variables
    if (dashboard.templating && dashboard.templating.list.length > 0) {
      dashboard.templating.list.forEach(variable => {
        const variableConfig = {
          type: 'variable',
          dashboardUid: dashboard.uid,
          name: variable.name,
          variableType: variable.type,
          label: variable.label || '',
          query: variable.query || '',
          datasource: variable.datasource?.uid || '',
          current: JSON.stringify(variable.current),
          options: JSON.stringify(variable.options),
          refresh: variable.refresh,
          sort: variable.sort,
          multi: variable.multi,
          includeAll: variable.includeAll
        };

        exportData.push(variableConfig);
      });
    }
  }

  // Add time range information
  if (options.dateRange) {
    exportData.push({
      type: 'export-info',
      exportedAt: new Date().toISOString(),
      dateRangeFrom: options.dateRange.from,
      dateRangeTo: options.dateRange.to,
      dataFormat: options.dataFormat
    });
  }

  return exportData;
}

/**
 * Get dashboard by ID
 */
async function getDashboard(id: string): Promise<Dashboard | null> {
  try {
    // Try to get dashboard by UID first
    const searchResult = await dashboardPersistenceService.searchDashboards({
      query: id,
      limit: 1,
      page: 1
    });

    if (searchResult.dashboards.length > 0) {
      return searchResult.dashboards[0] as Dashboard;
    }

    return null;
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return null;
  }
}

/**
 * Save export file (temporary implementation)
 */
async function saveExportFile(exportFile: ExportFile, blob: Blob): Promise<void> {
  // In production, this would save to proper file storage (S3, etc.)
  // For now, we'll store the blob in memory or temporary storage
  
  // Set the download URL (in production, would be actual storage URL)
  exportFile.url = `/api/export/download/${exportFile.name}`;
  exportFile.downloadUrl = exportFile.url;
  
  // Store blob reference (in production, would be proper file storage)
  global.exportFileCache = global.exportFileCache || new Map();
  global.exportFileCache.set(exportFile.name, blob);
}

/**
 * Read export file (temporary implementation)
 */
async function readExportFile(exportFile: ExportFile): Promise<Blob> {
  // In production, this would read from proper file storage
  const cache = global.exportFileCache || new Map();
  const blob = cache.get(exportFile.name);
  
  if (!blob) {
    throw new Error('Export file not found');
  }
  
  return blob;
}

/**
 * Get MIME type for format
 */
function getMimeType(format: FileFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Calculate data points in export
 */
function calculateDataPoints(exportData: any[]): number {
  return exportData.filter(item => 
    item.type === 'panel-config' || 
    item.type === 'variable' || 
    item.type === 'dashboard'
  ).length;
}

// Extend global object for temporary file storage
declare global {
  var exportFileCache: Map<string, Blob> | undefined;
}