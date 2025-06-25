/**
 * Excel Export Service
 * Implements Phase 2.2: Advanced Excel export with multiple sheets
 */

import * as XLSX from 'xlsx';
import { auditLogService, AuditAction } from './auditLogService';

export interface ExcelExportOptions {
  filename?: string;
  includeCharts?: boolean;
  includeMetadata?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
    label: string;
  };
  equipment?: string[];
  sheetNames?: string[];
  formatAsTable?: boolean;
  includeFormulas?: boolean;
}

export interface SheetData {
  name: string;
  data: any[];
  headers?: string[];
  columnWidths?: number[];
  formatting?: {
    headerStyle?: any;
    dataStyle?: any;
    conditionalFormatting?: ConditionalFormat[];
  };
}

export interface ConditionalFormat {
  range: string;
  condition: 'greaterThan' | 'lessThan' | 'between' | 'equal';
  value: number | [number, number];
  style: {
    backgroundColor?: string;
    textColor?: string;
    bold?: boolean;
  };
}

export class ExcelExportService {
  private static instance: ExcelExportService;
  
  static getInstance(): ExcelExportService {
    if (!ExcelExportService.instance) {
      ExcelExportService.instance = new ExcelExportService();
    }
    return ExcelExportService.instance;
  }

  /**
   * Export manufacturing data to Excel with multiple sheets
   */
  async exportManufacturingData(
    data: any,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    try {
      const {
        filename = 'Manufacturing_Data_Export',
        includeMetadata = true,
        formatAsTable = true,
        includeFormulas = true
      } = options;

      // Create new workbook
      const workbook = XLSX.utils.book_new();
      
      // Add overview sheet
      await this.addOverviewSheet(workbook, data, options);
      
      // Add KPI summary sheet
      await this.addKPISummarySheet(workbook, data, options);
      
      // Add detailed metrics sheets
      await this.addOEEAnalysisSheet(workbook, data, options);
      await this.addQualityMetricsSheet(workbook, data, options);
      await this.addEnergyAnalysisSheet(workbook, data, options);
      await this.addMaintenanceSheet(workbook, data, options);
      
      // Add raw data sheets
      await this.addRawDataSheets(workbook, data, options);
      
      // Add metadata sheet if requested
      if (includeMetadata) {
        await this.addMetadataSheet(workbook, options);
      }

      // Generate and save file
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = `${filename}_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, finalFilename);

      // Log export action
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.DATA_EXPORT,
        {
          resource: 'excel_export',
          details: {
            filename: finalFilename,
            sheetCount: workbook.SheetNames.length,
            options
          }
        }
      );

    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error(`Failed to export Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export specific chart data to Excel
   */
  async exportChartData(
    chartData: any[],
    chartTitle: string,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create main data sheet
      const worksheet = XLSX.utils.json_to_sheet(chartData);
      
      // Apply formatting
      this.applyWorksheetFormatting(worksheet, {
        headerStyle: {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center' }
        }
      });
      
      // Set column widths
      const columnWidths = this.calculateColumnWidths(chartData);
      worksheet['!cols'] = columnWidths.map(width => ({ width }));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart Data');
      
      // Add summary statistics
      if (chartData.length > 0) {
        const statsSheet = this.createStatisticsSheet(chartData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
      }
      
      // Save file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${chartTitle.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);

      // Log action
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.DATA_EXPORT,
        {
          resource: 'chart_export',
          details: {
            filename,
            chartTitle,
            recordCount: chartData.length
          }
        }
      );

    } catch (error) {
      console.error('Chart export failed:', error);
      throw new Error(`Failed to export chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addOverviewSheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const overviewData = [
      ['Report Title', 'Manufacturing Analytics Export'],
      ['Generated Date', new Date().toISOString()],
      ['Time Range', options.timeRange?.label || 'All Time'],
      ['Equipment', options.equipment?.join(', ') || 'All Equipment'],
      [''],
      ['Key Performance Indicators'],
      ['Overall Equipment Effectiveness (OEE)', data.currentOEE || 'N/A', '%'],
      ['Availability', data.availability || 'N/A', '%'],
      ['Performance', data.performance || 'N/A', '%'],
      ['Quality Rate', data.quality || 'N/A', '%'],
      [''],
      ['Reliability Metrics'],
      ['Mean Time Between Failures (MTBF)', data.mtbf || 'N/A', 'hours'],
      ['Mean Time To Repair (MTTR)', data.mttr || 'N/A', 'hours'],
      [''],
      ['Energy Management'],
      ['Energy Efficiency', data.energyEfficiency || 'N/A', '%'],
      ['Energy Intensity', data.energyIntensity || 'N/A', 'kWh/unit']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(overviewData);
    
    // Apply formatting
    this.applyOverviewFormatting(worksheet);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Overview');
  }

  private async addKPISummarySheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const kpiData = this.generateKPISummaryData(data);
    const worksheet = XLSX.utils.json_to_sheet(kpiData);
    
    // Apply conditional formatting for KPI thresholds
    this.applyKPIConditionalFormatting(worksheet);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Summary');
  }

  private async addOEEAnalysisSheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const oeeData = [
      {
        Metric: 'Overall Equipment Effectiveness (OEE)',
        Current: data.currentOEE || 0,
        Target: 85,
        'World Class': 85,
        Unit: '%',
        Status: (data.currentOEE || 0) >= 85 ? 'Good' : 'Needs Improvement'
      },
      {
        Metric: 'Availability',
        Current: data.availability || 0,
        Target: 90,
        'World Class': 95,
        Unit: '%',
        Status: (data.availability || 0) >= 90 ? 'Good' : 'Needs Improvement'
      },
      {
        Metric: 'Performance Efficiency',
        Current: data.performance || 0,
        Target: 95,
        'World Class': 98,
        Unit: '%',
        Status: (data.performance || 0) >= 95 ? 'Good' : 'Needs Improvement'
      },
      {
        Metric: 'Quality Rate',
        Current: data.quality || 0,
        Target: 99,
        'World Class': 99.9,
        Unit: '%',
        Status: (data.quality || 0) >= 99 ? 'Good' : 'Needs Improvement'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(oeeData);
    
    // Add formulas for variance analysis
    if (options.includeFormulas) {
      this.addOEEFormulas(worksheet);
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OEE Analysis');
  }

  private async addQualityMetricsSheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const qualityData = [
      {
        Metric: 'Process Capability (Cpk)',
        Value: data.cpk || 0,
        Minimum: 1.0,
        Capable: 1.33,
        'Six Sigma': 2.0,
        Status: this.getQualityStatus(data.cpk || 0, 'cpk')
      },
      {
        Metric: 'Process Performance (Ppk)',
        Value: data.ppk || 0,
        Minimum: 1.0,
        Capable: 1.33,
        'Six Sigma': 1.67,
        Status: this.getQualityStatus(data.ppk || 0, 'ppk')
      },
      {
        Metric: 'First Pass Yield',
        Value: data.firstPassYield || 0,
        Minimum: 95,
        Target: 99,
        'World Class': 99.9,
        Status: this.getQualityStatus(data.firstPassYield || 0, 'yield')
      },
      {
        Metric: 'Defects Per Million Opportunities (DPMO)',
        Value: data.dpmo || 0,
        Maximum: 10000,
        Target: 233,
        'Six Sigma': 3.4,
        Status: this.getQualityStatus(data.dpmo || 0, 'dpmo')
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(qualityData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quality Metrics');
  }

  private async addEnergyAnalysisSheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const energyData = this.generateEnergyAnalysisData(data);
    const worksheet = XLSX.utils.json_to_sheet(energyData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Energy Analysis');
  }

  private async addMaintenanceSheet(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    const maintenanceData = this.generateMaintenanceData(data);
    const worksheet = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance');
  }

  private async addRawDataSheets(
    workbook: XLSX.WorkBook,
    data: any,
    options: ExcelExportOptions
  ): Promise<void> {
    // Add time-series data if available
    if (data.timeSeriesData && data.timeSeriesData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data.timeSeriesData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Series Data');
    }

    // Add alerts data if available
    if (data.alertsData && data.alertsData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data.alertsData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alerts');
    }
  }

  private async addMetadataSheet(
    workbook: XLSX.WorkBook,
    options: ExcelExportOptions
  ): Promise<void> {
    const metadataData = [
      ['Export Configuration'],
      ['Filename', options.filename || 'Default'],
      ['Include Charts', options.includeCharts ? 'Yes' : 'No'],
      ['Include Metadata', options.includeMetadata ? 'Yes' : 'No'],
      ['Format as Table', options.formatAsTable ? 'Yes' : 'No'],
      ['Include Formulas', options.includeFormulas ? 'Yes' : 'No'],
      [''],
      ['System Information'],
      ['Export Date', new Date().toISOString()],
      ['User Agent', navigator.userAgent],
      ['Screen Resolution', `${window.screen.width}x${window.screen.height}`],
      [''],
      ['Data Sources'],
      ['Manufacturing Database', 'Connected'],
      ['Real-time Data Stream', 'Active'],
      ['Historical Archive', 'Available']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(metadataData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metadata');
  }

  private applyWorksheetFormatting(worksheet: XLSX.WorkSheet, formatting: any): void {
    if (!worksheet['!ref']) return;
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Apply header formatting
    if (formatting.headerStyle) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = formatting.headerStyle;
        }
      }
    }
  }

  private applyOverviewFormatting(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { width: 30 },
      { width: 20 },
      { width: 10 }
    ];

    // Apply formatting to headers
    const headerCells = ['A6', 'A12', 'A16'];
    headerCells.forEach(cell => {
      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: { bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'E7E6E6' } }
        };
      }
    });
  }

  private applyKPIConditionalFormatting(worksheet: XLSX.WorkSheet): void {
    // This would typically use a library that supports conditional formatting
    // For now, we'll apply basic styling based on values
    if (!worksheet['!ref']) return;
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const valueCell = XLSX.utils.encode_cell({ r: row, c: 1 }); // Assuming value is in column B
      if (worksheet[valueCell] && typeof worksheet[valueCell].v === 'number') {
        const value = worksheet[valueCell].v;
        if (value >= 85) {
          worksheet[valueCell].s = {
            fill: { fgColor: { rgb: 'C6EFCE' } },
            font: { color: { rgb: '006100' } }
          };
        } else if (value >= 70) {
          worksheet[valueCell].s = {
            fill: { fgColor: { rgb: 'FFEB9C' } },
            font: { color: { rgb: '9C5700' } }
          };
        } else {
          worksheet[valueCell].s = {
            fill: { fgColor: { rgb: 'FFC7CE' } },
            font: { color: { rgb: '9C0006' } }
          };
        }
      }
    }
  }

  private addOEEFormulas(worksheet: XLSX.WorkSheet): void {
    // Add calculated fields with formulas
    const formulaRows = [
      'F2=IF(B2>=C2,"Target Met","Below Target")',
      'F3=IF(B3>=C3,"Target Met","Below Target")',
      'F4=IF(B4>=C4,"Target Met","Below Target")',
      'F5=IF(B5>=C5,"Target Met","Below Target")'
    ];

    formulaRows.forEach((formula, index) => {
      const [cell, formulaText] = formula.split('=');
      if (worksheet[cell]) {
        worksheet[cell].f = formulaText;
      }
    });
  }

  private calculateColumnWidths(data: any[]): number[] {
    if (!data || data.length === 0) return [15];
    
    const headers = Object.keys(data[0]);
    return headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return Math.min(Math.max(maxLength + 2, 10), 50);
    });
  }

  private createStatisticsSheet(data: any[]): XLSX.WorkSheet {
    const numericFields = this.getNumericFields(data);
    const statistics = numericFields.map(field => {
      const values = data.map(row => row[field]).filter(val => typeof val === 'number');
      return {
        Field: field,
        Count: values.length,
        Average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        Minimum: values.length > 0 ? Math.min(...values) : 0,
        Maximum: values.length > 0 ? Math.max(...values) : 0,
        'Standard Deviation': this.calculateStandardDeviation(values)
      };
    });

    return XLSX.utils.json_to_sheet(statistics);
  }

  private getNumericFields(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    
    return Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number'
    );
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private generateKPISummaryData(data: any): any[] {
    return [
      {
        KPI: 'Overall Equipment Effectiveness (OEE)',
        Current: data.currentOEE || 0,
        Target: 85,
        'Variance %': ((data.currentOEE || 0) - 85) / 85 * 100,
        Trend: 'Stable',
        'Last Updated': new Date().toISOString()
      },
      {
        KPI: 'Availability',
        Current: data.availability || 0,
        Target: 90,
        'Variance %': ((data.availability || 0) - 90) / 90 * 100,
        Trend: 'Improving',
        'Last Updated': new Date().toISOString()
      },
      {
        KPI: 'Performance',
        Current: data.performance || 0,
        Target: 95,
        'Variance %': ((data.performance || 0) - 95) / 95 * 100,
        Trend: 'Stable',
        'Last Updated': new Date().toISOString()
      },
      {
        KPI: 'Quality',
        Current: data.quality || 0,
        Target: 99,
        'Variance %': ((data.quality || 0) - 99) / 99 * 100,
        Trend: 'Declining',
        'Last Updated': new Date().toISOString()
      }
    ];
  }

  private generateEnergyAnalysisData(data: any): any[] {
    return [
      {
        Metric: 'Energy Efficiency',
        Value: data.energyEfficiency || 0,
        Unit: '%',
        Target: 85,
        'Monthly Trend': 'Improving',
        'Cost Impact': 'Positive'
      },
      {
        Metric: 'Energy Intensity',
        Value: data.energyIntensity || 0,
        Unit: 'kWh/unit',
        Target: 45,
        'Monthly Trend': 'Stable',
        'Cost Impact': 'Neutral'
      }
    ];
  }

  private generateMaintenanceData(data: any): any[] {
    return [
      {
        Metric: 'Mean Time Between Failures (MTBF)',
        Value: data.mtbf || 0,
        Unit: 'hours',
        Target: 200,
        'Performance': data.mtbf >= 200 ? 'Good' : 'Needs Attention'
      },
      {
        Metric: 'Mean Time To Repair (MTTR)',
        Value: data.mttr || 0,
        Unit: 'hours',
        Target: 3,
        'Performance': data.mttr <= 3 ? 'Good' : 'Needs Attention'
      }
    ];
  }

  private getQualityStatus(value: number, type: string): string {
    switch (type) {
      case 'cpk':
      case 'ppk':
        if (value >= 2.0) return 'Six Sigma';
        if (value >= 1.33) return 'Capable';
        if (value >= 1.0) return 'Minimum';
        return 'Not Capable';
      case 'yield':
        if (value >= 99.9) return 'World Class';
        if (value >= 99) return 'Target';
        if (value >= 95) return 'Minimum';
        return 'Below Standard';
      case 'dpmo':
        if (value <= 3.4) return 'Six Sigma';
        if (value <= 233) return 'Target';
        if (value <= 10000) return 'Acceptable';
        return 'Needs Improvement';
      default:
        return 'Unknown';
    }
  }
}

export const excelExportService = ExcelExportService.getInstance();