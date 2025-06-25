/**
 * Bulk Export API Routes
 * POST /api/export/bulk - Export multiple dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileProcessingService } from '@/services/fileProcessingService';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import {
  BatchExportRequest,
  BatchExportResult,
  ExportFile,
  ExportError,
  ExportTarget,
  ExportOptions,
  FileFormat
} from '@/types/import-export';
import { Dashboard } from '@/types/dashboard';

export async function POST(request: NextRequest) {
  try {
    const batchRequest: BatchExportRequest = await request.json();

    // Validate request
    if (!batchRequest.targets || batchRequest.targets.length === 0) {
      return NextResponse.json(
        { error: 'No export targets specified' },
        { status: 400 }
      );
    }

    if (!['csv', 'excel', 'json'].includes(batchRequest.format)) {
      return NextResponse.json(
        { error: 'Invalid export format. Supported: csv, excel, json' },
        { status: 400 }
      );
    }

    // Process bulk export
    const result = await processBulkExport(batchRequest);

    return NextResponse.json({
      success: result.successCount > 0,
      result
    });

  } catch (error) {
    console.error('Bulk export error:', error);
    return NextResponse.json(
      { 
        error: 'Bulk export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process bulk export request
 */
async function processBulkExport(request: BatchExportRequest): Promise<BatchExportResult> {
  const startTime = Date.now();
  const exportFiles: ExportFile[] = [];
  const errors: ExportError[] = [];
  let successCount = 0;

  try {
    // Process targets based on options
    if (request.options.parallelProcessing && request.options.maxConcurrentExports) {
      // Parallel processing with concurrency limit
      const chunks = chunkArray(request.targets, request.options.maxConcurrentExports);
      
      for (const chunk of chunks) {
        const promises = chunk.map(target => processExportTarget(target, request.format, request.options));
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            exportFiles.push(...result.value.files);
            successCount++;
          } else {
            errors.push({
              item: chunk[index].id,
              error: result.status === 'rejected' 
                ? result.reason 
                : result.value.error || 'Export failed'
            });
          }
        });
      }
    } else {
      // Sequential processing
      for (const target of request.targets) {
        try {
          const result = await processExportTarget(target, request.format, request.options);
          
          if (result.success) {
            exportFiles.push(...result.files);
            successCount++;
          } else {
            errors.push({
              item: target.id,
              error: result.error || 'Export failed'
            });
          }
        } catch (error) {
          errors.push({
            item: target.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Create archive if requested
    let archiveFile: ExportFile | undefined;
    if (request.options.archiveResults && exportFiles.length > 1) {
      archiveFile = await createArchive(exportFiles, request.format);
    }

    return {
      totalTargets: request.targets.length,
      successCount,
      errorCount: errors.length,
      files: exportFiles,
      archive: archiveFile,
      duration: Date.now() - startTime,
      errors
    };

  } catch (error) {
    return {
      totalTargets: request.targets.length,
      successCount: 0,
      errorCount: request.targets.length,
      files: [],
      duration: Date.now() - startTime,
      errors: [{
        item: 'bulk-export',
        error: error instanceof Error ? error.message : 'Bulk export failed'
      }]
    };
  }
}

/**
 * Process individual export target
 */
async function processExportTarget(
  target: ExportTarget,
  format: FileFormat,
  options: ExportOptions
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  try {
    switch (target.type) {
      case 'dashboard':
        return await exportDashboard(target.id, format, options, target.include);
      
      case 'folder':
        return await exportFolder(target.id, format, options, target.include);
      
      case 'panel':
        return await exportPanel(target.id, format, options, target.include);
      
      case 'library-panel':
        return await exportLibraryPanel(target.id, format, options, target.include);
      
      case 'datasource':
        return await exportDataSource(target.id, format, options, target.include);
      
      case 'variable':
        return await exportVariable(target.id, format, options, target.include);
      
      default:
        return {
          success: false,
          files: [],
          error: `Unsupported target type: ${target.type}`
        };
    }
  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Export single dashboard
 */
async function exportDashboard(
  dashboardId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  try {
    // Get dashboard
    const searchResult = await dashboardPersistenceService.searchDashboards({
      query: dashboardId,
      limit: 1,
      page: 1
    });

    if (searchResult.dashboards.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Dashboard not found'
      };
    }

    const dashboard = searchResult.dashboards[0] as Dashboard;

    // Prepare export data
    const exportData = await prepareDashboardExportData(dashboard, options, include);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `dashboard-${dashboard.uid}-${timestamp}.${format}`;

    // Export to format
    const blob = await fileProcessingService.exportData(exportData, format, fileName);

    // Create export file
    const exportFile: ExportFile = {
      name: fileName,
      format,
      size: blob.size,
      url: `/api/export/download/${fileName}`,
      downloadUrl: `/api/export/download/${fileName}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Save file
    await saveExportFile(exportFile, blob);

    return {
      success: true,
      files: [exportFile]
    };

  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Dashboard export failed'
    };
  }
}

/**
 * Export folder (all dashboards in folder)
 */
async function exportFolder(
  folderId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  try {
    // Get all dashboards in folder
    const searchResult = await dashboardPersistenceService.searchDashboards({
      folderId,
      limit: 100, // Adjust as needed
      page: 1
    });

    const files: ExportFile[] = [];

    // Export each dashboard
    for (const dashboard of searchResult.dashboards) {
      const result = await exportDashboard(dashboard.uid, format, options, include);
      if (result.success) {
        files.push(...result.files);
      }
    }

    return {
      success: files.length > 0,
      files
    };

  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Folder export failed'
    };
  }
}

/**
 * Export panel (placeholder)
 */
async function exportPanel(
  panelId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  // TODO: Implement panel export
  return {
    success: false,
    files: [],
    error: 'Panel export not implemented yet'
  };
}

/**
 * Export library panel (placeholder)
 */
async function exportLibraryPanel(
  panelId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  // TODO: Implement library panel export
  return {
    success: false,
    files: [],
    error: 'Library panel export not implemented yet'
  };
}

/**
 * Export data source (placeholder)
 */
async function exportDataSource(
  datasourceId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  // TODO: Implement data source export
  return {
    success: false,
    files: [],
    error: 'Data source export not implemented yet'
  };
}

/**
 * Export variable (placeholder)
 */
async function exportVariable(
  variableId: string,
  format: FileFormat,
  options: ExportOptions,
  include: any
): Promise<{ success: boolean; files: ExportFile[]; error?: string }> {
  // TODO: Implement variable export
  return {
    success: false,
    files: [],
    error: 'Variable export not implemented yet'
  };
}

/**
 * Prepare dashboard export data
 */
async function prepareDashboardExportData(
  dashboard: Dashboard,
  options: ExportOptions,
  include: any
): Promise<any[]> {
  const exportData: any[] = [];

  if (include.configuration) {
    exportData.push({
      type: 'dashboard',
      ...dashboard
    });
  }

  if (include.metadata) {
    exportData.push({
      type: 'metadata',
      uid: dashboard.uid,
      created: dashboard.meta.created,
      updated: dashboard.meta.updated,
      version: dashboard.version,
      tags: dashboard.tags
    });
  }

  // Add more export data based on include options
  
  return exportData;
}

/**
 * Create archive from multiple files
 */
async function createArchive(files: ExportFile[], format: FileFormat): Promise<ExportFile> {
  // TODO: Implement archive creation (ZIP)
  const timestamp = new Date().toISOString().split('T')[0];
  const archiveName = `bulk-export-${timestamp}.zip`;
  
  return {
    name: archiveName,
    format: 'zip' as any, // Would need to add to FileFormat enum
    size: files.reduce((total, file) => total + file.size, 0),
    url: `/api/export/download/${archiveName}`,
    downloadUrl: `/api/export/download/${archiveName}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Save export file
 */
async function saveExportFile(exportFile: ExportFile, blob: Blob): Promise<void> {
  // In production, would save to proper file storage
  global.exportFileCache = global.exportFileCache || new Map();
  global.exportFileCache.set(exportFile.name, blob);
}

/**
 * Utility function to chunk array
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Extend global for temporary storage
declare global {
  var exportFileCache: Map<string, Blob> | undefined;
}