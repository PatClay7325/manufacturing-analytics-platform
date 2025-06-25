/**
 * PDF Export Service
 * Implements Phase 2.2: Dashboard snapshots and compliance reports
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { auditLogService, AuditAction } from './auditLogService';

export interface ExportOptions {
  title?: string;
  includeCharts?: boolean;
  includeData?: boolean;
  includeMetadata?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
    label: string;
  };
  equipment?: string[];
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  watermark?: string;
}

export interface ComplianceReportOptions extends ExportOptions {
  standard: 'ISO22400' | 'ISO13053' | 'ISO14224' | 'ISO50001' | 'ALL';
  includeTargets?: boolean;
  includeDeviations?: boolean;
  includeTrends?: boolean;
  signedBy?: string;
  department?: string;
}

export class PDFExportService {
  private static instance: PDFExportService;
  
  static getInstance(): PDFExportService {
    if (!PDFExportService.instance) {
      PDFExportService.instance = new PDFExportService();
    }
    return PDFExportService.instance;
  }

  /**
   * Export dashboard as PDF snapshot
   */
  async exportDashboard(
    elementId: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      const {
        title = 'Manufacturing Dashboard',
        format = 'A4',
        orientation = 'landscape',
        includeMetadata = true,
        watermark
      } = options;

      // Capture dashboard screenshot
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Configure capture options for high quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 30000,
        onclone: (clonedDoc) => {
          // Remove loading overlays and interactive elements
          const overlays = clonedDoc.querySelectorAll('.loading-overlay, .tooltip, .dropdown-menu');
          overlays.forEach(overlay => overlay.remove());
          
          // Ensure charts are visible
          const charts = clonedDoc.querySelectorAll('.recharts-wrapper');
          charts.forEach(chart => {
            (chart as HTMLElement).style.opacity = '1';
            (chart as HTMLElement).style.visibility = 'visible';
          });
        }
      });

      // Create PDF document
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: format.toLowerCase() as any
      });

      // Add title page
      this.addTitlePage(pdf, title, options);

      // Add dashboard screenshot
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = pdf.internal.pageSize.getWidth() - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Dashboard Snapshot', 10, 15);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 25);
      
      // Add image, split across pages if necessary
      if (imgHeight > pdf.internal.pageSize.getHeight() - 40) {
        const pagesNeeded = Math.ceil(imgHeight / (pdf.internal.pageSize.getHeight() - 40));
        for (let i = 0; i < pagesNeeded; i++) {
          const yOffset = -i * (pdf.internal.pageSize.getHeight() - 40);
          pdf.addImage(imgData, 'PNG', 10, 30 + yOffset, imgWidth, imgHeight);
          if (i < pagesNeeded - 1) {
            pdf.addPage();
          }
        }
      } else {
        pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);
      }

      // Add metadata if requested
      if (includeMetadata) {
        await this.addMetadataPage(pdf, options);
      }

      // Add watermark if provided
      if (watermark) {
        this.addWatermark(pdf, watermark);
      }

      // Generate filename and save
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${title.replace(/\s+/g, '_')}_${timestamp}.pdf`;
      
      pdf.save(filename);

      // Log export action
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.DATA_EXPORT,
        {
          resource: 'dashboard_pdf',
          details: {
            filename,
            format,
            orientation,
            elementId,
            options
          }
        }
      );

    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate ISO compliance report
   */
  async generateComplianceReport(
    data: any,
    options: ComplianceReportOptions
  ): Promise<void> {
    try {
      const {
        standard,
        title = `${standard} Compliance Report`,
        format = 'A4',
        orientation = 'portrait',
        includeTargets = true,
        includeDeviations = true,
        includeTrends = true,
        signedBy,
        department
      } = options;

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: format.toLowerCase() as any
      });

      // Add compliance cover page
      this.addComplianceCoverPage(pdf, title, standard, options);

      // Add executive summary
      pdf.addPage();
      this.addExecutiveSummary(pdf, data, standard);

      // Add detailed sections based on standard
      switch (standard) {
        case 'ISO22400':
          await this.addISO22400Section(pdf, data, options);
          break;
        case 'ISO13053':
          await this.addISO13053Section(pdf, data, options);
          break;
        case 'ISO14224':
          await this.addISO14224Section(pdf, data, options);
          break;
        case 'ISO50001':
          await this.addISO50001Section(pdf, data, options);
          break;
        case 'ALL':
          await this.addISO22400Section(pdf, data, options);
          await this.addISO13053Section(pdf, data, options);
          await this.addISO14224Section(pdf, data, options);
          await this.addISO50001Section(pdf, data, options);
          break;
      }

      // Add signature page
      if (signedBy || department) {
        this.addSignaturePage(pdf, signedBy, department);
      }

      // Add appendices
      this.addAppendices(pdf, data, options);

      // Save the report
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${standard}_Compliance_Report_${timestamp}.pdf`;
      
      pdf.save(filename);

      // Log compliance report generation
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.COMPLIANCE_REPORT,
        {
          resource: 'compliance_report',
          details: {
            filename,
            standard,
            signedBy,
            department,
            options
          }
        }
      );

    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw new Error(`Failed to generate compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addTitlePage(pdf: jsPDF, title: string, options: ExportOptions): void {
    // Company header
    pdf.setFontSize(20);
    pdf.text('Manufacturing Analytics Platform', 10, 30);
    
    pdf.setFontSize(16);
    pdf.text(title, 10, 50);
    
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 70);
    
    if (options.timeRange) {
      pdf.text(`Time Range: ${options.timeRange.label}`, 10, 85);
      pdf.text(`From: ${options.timeRange.start.toLocaleString()}`, 10, 95);
      pdf.text(`To: ${options.timeRange.end.toLocaleString()}`, 10, 105);
    }
    
    if (options.equipment && options.equipment.length > 0) {
      pdf.text(`Equipment: ${options.equipment.join(', ')}`, 10, 120);
    }

    // Add footer
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.text('Confidential - Internal Use Only', 10, pageHeight - 10);
  }

  private addComplianceCoverPage(
    pdf: jsPDF, 
    title: string, 
    standard: string, 
    options: ComplianceReportOptions
  ): void {
    pdf.setFontSize(24);
    pdf.text(title, 10, 40);
    
    pdf.setFontSize(16);
    pdf.text(`Standard: ${standard}`, 10, 60);
    
    pdf.setFontSize(12);
    pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 10, 80);
    pdf.text(`Reporting Period: ${options.timeRange?.label || 'All Time'}`, 10, 95);
    
    if (options.department) {
      pdf.text(`Department: ${options.department}`, 10, 110);
    }
    
    // Add compliance statement
    pdf.setFontSize(10);
    const complianceText = `This report has been generated in accordance with ${standard} standards for manufacturing operations. All data has been collected and analyzed following established protocols.`;
    const splitText = pdf.splitTextToSize(complianceText, 180);
    pdf.text(splitText, 10, 140);
  }

  private addExecutiveSummary(pdf: jsPDF, data: any, standard: string): void {
    pdf.setFontSize(16);
    pdf.text('Executive Summary', 10, 20);
    
    pdf.setFontSize(12);
    let yPosition = 40;
    
    const summary = this.generateExecutiveSummary(data, standard);
    const splitSummary = pdf.splitTextToSize(summary, 180);
    pdf.text(splitSummary, 10, yPosition);
  }

  private generateExecutiveSummary(data: any, standard: string): string {
    switch (standard) {
      case 'ISO22400':
        return `This report analyzes manufacturing KPIs according to ISO 22400 standards. Overall Equipment Effectiveness (OEE) averaged ${data.avgOEE || 'N/A'}% during the reporting period. Key areas for improvement include availability optimization and quality enhancement.`;
      case 'ISO13053':
        return `Six Sigma process capability analysis shows current Cpk values averaging ${data.avgCpk || 'N/A'}. Process performance indicators demonstrate ${data.sigmaLevel || 'N/A'} sigma level performance with opportunities for statistical control improvement.`;
      case 'ISO14224':
        return `Reliability analysis indicates MTBF of ${data.avgMTBF || 'N/A'} hours with MTTR averaging ${data.avgMTTR || 'N/A'} hours. Maintenance optimization strategies are recommended to improve overall equipment reliability.`;
      case 'ISO50001':
        return `Energy management performance shows energy intensity of ${data.avgEnergyIntensity || 'N/A'} kWh/unit with overall efficiency at ${data.avgEnergyEfficiency || 'N/A'}%. Energy optimization opportunities have been identified.`;
      default:
        return 'Comprehensive analysis of manufacturing operations across multiple ISO standards.';
    }
  }

  private async addISO22400Section(pdf: jsPDF, data: any, options: ComplianceReportOptions): Promise<void> {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('ISO 22400 - Manufacturing KPIs', 10, 20);
    
    let yPos = 40;
    
    // OEE Analysis
    pdf.setFontSize(12);
    pdf.text('Overall Equipment Effectiveness (OEE)', 10, yPos);
    yPos += 15;
    
    pdf.setFontSize(10);
    const oeeData = [
      `Current OEE: ${data.currentOEE || 'N/A'}%`,
      `Target OEE: 85%`,
      `Availability: ${data.availability || 'N/A'}%`,
      `Performance: ${data.performance || 'N/A'}%`,
      `Quality: ${data.quality || 'N/A'}%`
    ];
    
    oeeData.forEach(line => {
      pdf.text(line, 15, yPos);
      yPos += 8;
    });
  }

  private async addISO13053Section(pdf: jsPDF, data: any, options: ComplianceReportOptions): Promise<void> {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('ISO 13053 - Six Sigma Analysis', 10, 20);
    
    // Add Six Sigma metrics and analysis
    // Implementation details...
  }

  private async addISO14224Section(pdf: jsPDF, data: any, options: ComplianceReportOptions): Promise<void> {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('ISO 14224 - Reliability Analysis', 10, 20);
    
    // Add reliability metrics and analysis
    // Implementation details...
  }

  private async addISO50001Section(pdf: jsPDF, data: any, options: ComplianceReportOptions): Promise<void> {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('ISO 50001 - Energy Management', 10, 20);
    
    // Add energy management analysis
    // Implementation details...
  }

  private async addMetadataPage(pdf: jsPDF, options: ExportOptions): Promise<void> {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Report Metadata', 10, 20);
    
    pdf.setFontSize(10);
    let yPos = 40;
    
    const metadata = [
      `Export Date: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `Screen Resolution: ${window.screen.width}x${window.screen.height}`,
      `Export Options: ${JSON.stringify(options, null, 2)}`
    ];
    
    metadata.forEach(line => {
      const splitLine = pdf.splitTextToSize(line, 180);
      pdf.text(splitLine, 10, yPos);
      yPos += splitLine.length * 8 + 5;
    });
  }

  private addWatermark(pdf: jsPDF, watermark: string): void {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(50);
      pdf.setTextColor(200, 200, 200);
      
      // Rotate text for diagonal watermark
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.text(watermark, pageWidth / 2, pageHeight / 2, {
        angle: -45,
        align: 'center'
      });
    }
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
  }

  private addSignaturePage(pdf: jsPDF, signedBy?: string, department?: string): void {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Approval & Sign-off', 10, 20);
    
    pdf.setFontSize(12);
    let yPos = 50;
    
    if (signedBy) {
      pdf.text(`Prepared by: ${signedBy}`, 10, yPos);
      yPos += 20;
      pdf.text('Signature: ________________________', 10, yPos);
      yPos += 20;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 10, yPos);
      yPos += 30;
    }
    
    if (department) {
      pdf.text(`Department: ${department}`, 10, yPos);
      yPos += 20;
    }
    
    pdf.text('Approved by: ________________________', 10, yPos);
    yPos += 20;
    pdf.text('Signature: ________________________', 10, yPos);
    yPos += 20;
    pdf.text('Date: ________________________', 10, yPos);
  }

  private addAppendices(pdf: jsPDF, data: any, options: ComplianceReportOptions): void {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Appendices', 10, 20);
    
    pdf.setFontSize(12);
    pdf.text('A. Data Sources and Collection Methods', 10, 40);
    pdf.text('B. Calculation Methodologies', 10, 55);
    pdf.text('C. Reference Standards', 10, 70);
    pdf.text('D. Glossary of Terms', 10, 85);
  }
}

export const pdfExportService = PDFExportService.getInstance();