/**
 * Reporting Service
 * Provides export and reporting functionality similar to manufacturingPlatform Enterprise
 * Includes PDF generation, scheduled reports, and data export
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { DashboardService, Dashboard } from './dashboardService';
import { prisma } from '@/lib/prisma';

export interface ReportConfig {
  id?: string;
  name: string;
  dashboardUid: string;
  recipients: string[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  format: 'pdf' | 'excel' | 'csv' | 'json';
  options?: {
    includeData?: boolean;
    includeCharts?: boolean;
    timeRange?: {
      from: string;
      to: string;
    };
  };
}

export interface ReportResult {
  reportId: string;
  timestamp: string;
  format: string;
  data: Buffer | string;
  filename: string;
}

export class ReportingService {
  private static instance: ReportingService;
  private dashboardService: DashboardService;

  private constructor() {
    this.dashboardService = DashboardService.getInstance();
  }

  static getInstance(): ReportingService {
    if (!ReportingService.instance) {
      ReportingService.instance = new ReportingService();
    }
    return ReportingService.instance;
  }

  /**
   * Generate a report for a dashboard
   */
  async generateReport(config: ReportConfig): Promise<ReportResult> {
    const dashboard = await this.dashboardService.getDashboard(config.dashboardUid);
    if (!dashboard) {
      throw new Error(`Dashboard ${config.dashboardUid} not found`);
    }

    const timestamp = new Date().toISOString();
    const reportId = `report-${Date.now()}`;
    
    let result: ReportResult;

    switch (config.format) {
      case 'pdf':
        result = await this.generatePDFReport(dashboard, config, reportId, timestamp);
        break;
      case 'excel':
        result = await this.generateExcelReport(dashboard, config, reportId, timestamp);
        break;
      case 'csv':
        result = await this.generateCSVReport(dashboard, config, reportId, timestamp);
        break;
      case 'json':
        result = await this.generateJSONReport(dashboard, config, reportId, timestamp);
        break;
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }

    // Save report to database
    await this.saveReportRecord(config, result);

    return result;
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(
    dashboard: Dashboard,
    config: ReportConfig,
    reportId: string,
    timestamp: string
  ): Promise<ReportResult> {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header
    pdf.setFontSize(20);
    pdf.text(dashboard.title, 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Generated: ${format(new Date(timestamp), 'PPpp')}`, 20, 30);

    // Add dashboard metadata
    pdf.setFontSize(10);
    let yPosition = 40;
    
    if (dashboard.tags.length > 0) {
      pdf.text(`Tags: ${dashboard.tags.join(', ')}`, 20, yPosition);
      yPosition += 10;
    }

    // If we need to capture charts, we'd use html2canvas here
    // For now, we'll add panel summaries
    pdf.setFontSize(14);
    pdf.text('Panel Summary', 20, yPosition + 10);
    yPosition += 20;

    pdf.setFontSize(10);
    for (const panel of dashboard.panels) {
      pdf.text(`• ${panel.title} (${panel.type})`, 30, yPosition);
      yPosition += 7;
      
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
    }

    // Get the PDF as buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

    return {
      reportId,
      timestamp,
      format: 'pdf',
      data: pdfBuffer,
      filename
    };
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(
    dashboard: Dashboard,
    config: ReportConfig,
    reportId: string,
    timestamp: string
  ): Promise<ReportResult> {
    const workbook = XLSX.utils.book_new();

    // Add dashboard info sheet
    const infoData = [
      ['Dashboard Report'],
      ['Title', dashboard.title],
      ['Generated', format(new Date(timestamp), 'PPpp')],
      ['Tags', dashboard.tags.join(', ')],
      ['Time Range', `${config.options?.timeRange?.from || dashboard.time.from} to ${config.options?.timeRange?.to || dashboard.time.to}`]
    ];
    
    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Dashboard Info');

    // Add panel data sheets
    for (const panel of dashboard.panels) {
      // In a real implementation, we'd fetch actual data for each panel
      const panelData = await this.fetchPanelData(panel, config.options?.timeRange);
      
      if (panelData && panelData.length > 0) {
        const sheet = XLSX.utils.json_to_sheet(panelData);
        const sheetName = panel.title.substring(0, 31).replace(/[\\/:*?[\]]/g, '_');
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      }
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

    return {
      reportId,
      timestamp,
      format: 'excel',
      data: excelBuffer,
      filename
    };
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    dashboard: Dashboard,
    config: ReportConfig,
    reportId: string,
    timestamp: string
  ): Promise<ReportResult> {
    const csvData: string[] = [];
    
    // Add header
    csvData.push(`Dashboard Report: ${dashboard.title}`);
    csvData.push(`Generated: ${format(new Date(timestamp), 'PPpp')}`);
    csvData.push('');

    // Fetch and add data for each panel
    for (const panel of dashboard.panels) {
      csvData.push(`Panel: ${panel.title}`);
      
      const panelData = await this.fetchPanelData(panel, config.options?.timeRange);
      if (panelData && panelData.length > 0) {
        // Convert to CSV format
        const headers = Object.keys(panelData[0]);
        csvData.push(headers.join(','));
        
        for (const row of panelData) {
          const values = headers.map(h => {
            const value = row[h];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvData.push(values.join(','));
        }
      }
      csvData.push('');
    }

    const csv = csvData.join('\n');
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;

    return {
      reportId,
      timestamp,
      format: 'csv',
      data: csv,
      filename
    };
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(
    dashboard: Dashboard,
    config: ReportConfig,
    reportId: string,
    timestamp: string
  ): Promise<ReportResult> {
    const reportData = {
      dashboard: {
        uid: dashboard.uid,
        title: dashboard.title,
        tags: dashboard.tags,
        timeRange: config.options?.timeRange || dashboard.time
      },
      generated: timestamp,
      panels: [] as any[]
    };

    // Fetch data for each panel
    for (const panel of dashboard.panels) {
      const panelData = await this.fetchPanelData(panel, config.options?.timeRange);
      reportData.panels.push({
        id: panel.id,
        title: panel.title,
        type: panel.type,
        data: panelData
      });
    }

    const json = JSON.stringify(reportData, null, 2);
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;

    return {
      reportId,
      timestamp,
      format: 'json',
      data: json,
      filename
    };
  }

  /**
   * Fetch data for a panel (mock implementation)
   */
  private async fetchPanelData(panel: any, timeRange?: any): Promise<any[]> {
    // In a real implementation, this would query the actual data sources
    // For now, return mock data based on panel type
    
    const from = timeRange?.from || 'now-6h';
    const to = timeRange?.to || 'now';
    
    try {
      // Query based on panel targets
      if (panel.targets && panel.targets.length > 0) {
        const target = panel.targets[0];
        
        switch (target.metric) {
          case 'oee':
            return await this.fetchOEEData(from, to);
          case 'production':
            return await this.fetchProductionData(from, to);
          case 'equipment_status':
            return await this.fetchEquipmentData(from, to);
          default:
            return [];
        }
      }
    } catch (error) {
      console.error(`Error fetching data for panel ${panel.title}:`, error);
      return [];
    }

    return [];
  }

  /**
   * Fetch OEE data
   */
  private async fetchOEEData(from: string, to: string): Promise<any[]> {
    // Implement actual data fetching
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: this.parseTimeRange(from),
          lte: this.parseTimeRange(to)
        }
      },
      select: {
        timestamp: true,
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true,
        machineName: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    return metrics;
  }

  /**
   * Fetch production data
   */
  private async fetchProductionData(from: string, to: string): Promise<any[]> {
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: this.parseTimeRange(from),
          lte: this.parseTimeRange(to)
        }
      },
      select: {
        timestamp: true,
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
        productType: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    return metrics;
  }

  /**
   * Fetch equipment data
   */
  private async fetchEquipmentData(from: string, to: string): Promise<any[]> {
    const equipment = await prisma.equipment.findMany({
      include: {
        EquipmentClass: true,
        Plant: true
      },
      take: 100
    });

    return equipment;
  }

  /**
   * Parse time range string (simplified)
   */
  private parseTimeRange(timeStr: string): Date {
    if (timeStr === 'now') {
      return new Date();
    }
    
    const match = timeStr.match(/now-(\d+)([hdwM])/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      const now = new Date();
      
      switch (unit) {
        case 'h':
          return new Date(now.getTime() - amount * 60 * 60 * 1000);
        case 'd':
          return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
        case 'w':
          return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
        case 'M':
          return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
      }
    }
    
    return new Date(timeStr);
  }

  /**
   * Save report record to database
   */
  private async saveReportRecord(config: ReportConfig, result: ReportResult): Promise<void> {
    await prisma.report.create({
      data: {
        name: config.name,
        dashboardUid: config.dashboardUid,
        format: config.format,
        filename: result.filename,
        generatedAt: result.timestamp,
        recipients: config.recipients,
        status: 'completed'
      }
    });
  }

  /**
   * List reports
   */
  async listReports(options?: {
    dashboardUid?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: any[]; total: number }> {
    const where: any = {};
    
    if (options?.dashboardUid) {
      where.dashboardUid = options.dashboardUid;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { generatedAt: 'desc' }
      }),
      prisma.report.count({ where })
    ]);

    return { reports, total };
  }

  /**
   * Schedule a report
   */
  async scheduleReport(config: ReportConfig): Promise<string> {
    if (!config.schedule?.enabled) {
      throw new Error('Schedule configuration is required');
    }

    const scheduled = await prisma.scheduledReport.create({
      data: {
        name: config.name,
        dashboardUid: config.dashboardUid,
        recipients: config.recipients,
        format: config.format,
        schedule: config.schedule,
        options: config.options || {},
        enabled: true,
        nextRun: this.calculateNextRun(config.schedule)
      }
    });

    return scheduled.id;
  }

  /**
   * Calculate next run time for scheduled report
   */
  private calculateNextRun(schedule: ReportConfig['schedule']): Date {
    const now = new Date();
    const [hours, minutes] = schedule!.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
      switch (schedule!.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    return nextRun;
  }
}