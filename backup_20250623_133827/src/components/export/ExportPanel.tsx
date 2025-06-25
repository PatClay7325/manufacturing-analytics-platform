/**
 * Export Panel Component
 * Implements Phase 2.2: Comprehensive export capabilities
 */

import React, { useState, useRef } from 'react';
import { 
  Download, FileText, Table, Image, Mail, Share2, 
  Settings, Calendar, Filter, CheckCircle, AlertCircle,
  Loader2, Users, Lock, Globe
} from 'lucide-react';
import { pdfExportService, ExportOptions, ComplianceReportOptions } from '@/services/pdfExportService';
import { excelExportService, ExcelExportOptions } from '@/services/excelExportService';
import { TimeRange } from '@/components/common/TimeRangeSelector';

export interface ExportPanelProps {
  dashboardId: string;
  currentData: any;
  timeRange: TimeRange;
  selectedEquipment: string[];
  onExportComplete?: (filename: string, format: string) => void;
  onExportError?: (error: string) => void;
}

export function ExportPanel({
  dashboardId,
  currentData,
  timeRange,
  selectedEquipment,
  onExportComplete,
  onExportError
}: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'pdf' | 'excel' | 'compliance'>('quick');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  
  // PDF Export State
  const [pdfOptions, setPdfOptions] = useState<ExportOptions>({
    title: 'Manufacturing Dashboard Export',
    includeCharts: true,
    includeData: true,
    includeMetadata: true,
    format: 'A4',
    orientation: 'landscape'
  });

  // Excel Export State
  const [excelOptions, setExcelOptions] = useState<ExcelExportOptions>({
    filename: 'Manufacturing_Data_Export',
    includeCharts: true,
    includeMetadata: true,
    formatAsTable: true,
    includeFormulas: true
  });

  // Compliance Report State
  const [complianceOptions, setComplianceOptions] = useState<ComplianceReportOptions>({
    standard: 'ISO22400',
    title: 'ISO 22400 Compliance Report',
    includeTargets: true,
    includeDeviations: true,
    includeTrends: true,
    format: 'A4',
    orientation: 'portrait'
  });

  // Email/Share State
  const [shareOptions, setShareOptions] = useState({
    recipients: '',
    subject: 'Manufacturing Analytics Report',
    message: 'Please find the attached manufacturing analytics report.',
    includeRawData: false,
    accessLevel: 'view' as 'view' | 'edit'
  });

  const handleQuickExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    setExportProgress(`Generating ${format.toUpperCase()} export...`);

    try {
      switch (format) {
        case 'pdf':
          await pdfExportService.exportDashboard(dashboardId, {
            ...pdfOptions,
            timeRange,
            equipment: selectedEquipment
          });
          break;
        
        case 'excel':
          await excelExportService.exportManufacturingData(currentData, {
            ...excelOptions,
            timeRange,
            equipment: selectedEquipment
          });
          break;
        
        case 'csv':
          await exportCSV();
          break;
      }

      setExportProgress('Export completed successfully!');
      onExportComplete?.(`dashboard_export.${format}`, format);
      setTimeout(() => setExportProgress(''), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportProgress('');
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedPDFExport = async () => {
    setIsExporting(true);
    setExportProgress('Generating advanced PDF report...');

    try {
      await pdfExportService.exportDashboard(dashboardId, {
        ...pdfOptions,
        timeRange,
        equipment: selectedEquipment
      });

      setExportProgress('PDF export completed!');
      onExportComplete?.(pdfOptions.title?.replace(/\s+/g, '_') + '.pdf', 'pdf');
      setTimeout(() => setExportProgress(''), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      setExportProgress('');
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedExcelExport = async () => {
    setIsExporting(true);
    setExportProgress('Generating Excel workbook...');

    try {
      await excelExportService.exportManufacturingData(currentData, {
        ...excelOptions,
        timeRange,
        equipment: selectedEquipment
      });

      setExportProgress('Excel export completed!');
      onExportComplete?.(excelOptions.filename + '.xlsx', 'excel');
      setTimeout(() => setExportProgress(''), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Excel export failed';
      setExportProgress('');
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleComplianceReport = async () => {
    setIsExporting(true);
    setExportProgress('Generating compliance report...');

    try {
      await pdfExportService.generateComplianceReport(currentData, {
        ...complianceOptions,
        timeRange,
        equipment: selectedEquipment
      });

      setExportProgress('Compliance report generated!');
      onExportComplete?.(`${complianceOptions.standard}_compliance_report.pdf`, 'compliance');
      setTimeout(() => setExportProgress(''), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compliance report failed';
      setExportProgress('');
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    // Simple CSV export of current data
    const csvData = convertToCSV(currentData);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manufacturing_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any): string => {
    if (!data || typeof data !== 'object') return '';
    
    // Create CSV from current metrics
    const headers = ['Metric', 'Value', 'Unit', 'Timestamp'];
    const rows = [
      ['OEE', data.currentOEE || 'N/A', '%', new Date().toISOString()],
      ['Availability', data.availability || 'N/A', '%', new Date().toISOString()],
      ['Performance', data.performance || 'N/A', '%', new Date().toISOString()],
      ['Quality', data.quality || 'N/A', '%', new Date().toISOString()],
      ['MTBF', data.mtbf || 'N/A', 'hours', new Date().toISOString()],
      ['MTTR', data.mttr || 'N/A', 'hours', new Date().toISOString()],
      ['Energy Efficiency', data.energyEfficiency || 'N/A', '%', new Date().toISOString()]
    ];

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Export Dashboard
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        {isExporting && (
          <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">{exportProgress}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'quick', label: 'Quick Export', icon: Download },
            { id: 'pdf', label: 'PDF Options', icon: FileText },
            { id: 'excel', label: 'Excel Options', icon: Table },
            { id: 'compliance', label: 'Compliance', icon: CheckCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              disabled={isExporting}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'quick' && (
            <QuickExportTab
              onExport={handleQuickExport}
              isExporting={isExporting}
              timeRange={timeRange}
              selectedEquipment={selectedEquipment}
            />
          )}

          {activeTab === 'pdf' && (
            <PDFExportTab
              options={pdfOptions}
              onOptionsChange={setPdfOptions}
              onExport={handleAdvancedPDFExport}
              isExporting={isExporting}
            />
          )}

          {activeTab === 'excel' && (
            <ExcelExportTab
              options={excelOptions}
              onOptionsChange={setExcelOptions}
              onExport={handleAdvancedExcelExport}
              isExporting={isExporting}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceExportTab
              options={complianceOptions}
              onOptionsChange={setComplianceOptions}
              onExport={handleComplianceReport}
              isExporting={isExporting}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface QuickExportTabProps {
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  isExporting: boolean;
  timeRange: TimeRange;
  selectedEquipment: string[];
}

function QuickExportTab({ onExport, isExporting, timeRange, selectedEquipment }: QuickExportTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Quick Export Options
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Export current dashboard data using default settings.
        </p>
      </div>

      {/* Current Context */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export Context</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>Time Range: {timeRange.label}</div>
          <div>Equipment: {selectedEquipment.length > 0 ? selectedEquipment.join(', ') : 'All Equipment'}</div>
          <div>Export Date: {new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onExport('pdf')}
          disabled={isExporting}
          className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        >
          <FileText className="h-8 w-8 text-red-600 mb-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">PDF Report</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Professional dashboard snapshot with charts and data
          </span>
        </button>

        <button
          onClick={() => onExport('excel')}
          disabled={isExporting}
          className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        >
          <Table className="h-8 w-8 text-green-600 mb-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">Excel Workbook</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Multi-sheet workbook with analysis and formulas
          </span>
        </button>

        <button
          onClick={() => onExport('csv')}
          disabled={isExporting}
          className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        >
          <Download className="h-8 w-8 text-blue-600 mb-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">CSV Data</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Raw data in comma-separated format
          </span>
        </button>
      </div>
    </div>
  );
}

interface PDFExportTabProps {
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: () => void;
  isExporting: boolean;
}

function PDFExportTab({ options, onOptionsChange, onExport, isExporting }: PDFExportTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          PDF Export Settings
        </h3>
      </div>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={options.title || ''}
            onChange={(e) => onOptionsChange({ ...options, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter report title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Format
          </label>
          <select
            value={options.format || 'A4'}
            onChange={(e) => onOptionsChange({ ...options, format: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Orientation
          </label>
          <select
            value={options.orientation || 'landscape'}
            onChange={(e) => onOptionsChange({ ...options, orientation: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Watermark
          </label>
          <input
            type="text"
            value={options.watermark || ''}
            onChange={(e) => onOptionsChange({ ...options, watermark: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Optional watermark text..."
          />
        </div>
      </div>

      {/* Content Options */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Content Options</h4>
        <div className="space-y-3">
          {[
            { key: 'includeCharts', label: 'Include Charts', description: 'Export visual charts and graphs' },
            { key: 'includeData', label: 'Include Data Tables', description: 'Export raw data in tabular format' },
            { key: 'includeMetadata', label: 'Include Metadata', description: 'Export system information and settings' }
          ].map(({ key, label, description }) => (
            <label key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={options[key as keyof ExportOptions] as boolean}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
                className="mt-1 rounded border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Generate PDF Report
      </button>
    </div>
  );
}

interface ExcelExportTabProps {
  options: ExcelExportOptions;
  onOptionsChange: (options: ExcelExportOptions) => void;
  onExport: () => void;
  isExporting: boolean;
}

function ExcelExportTab({ options, onOptionsChange, onExport, isExporting }: ExcelExportTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Excel Export Settings
        </h3>
      </div>

      {/* Filename */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filename
        </label>
        <input
          type="text"
          value={options.filename || ''}
          onChange={(e) => onOptionsChange({ ...options, filename: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter filename (without extension)..."
        />
      </div>

      {/* Content Options */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Export Options</h4>
        <div className="space-y-3">
          {[
            { key: 'includeCharts', label: 'Include Chart Data', description: 'Export chart data in separate sheets' },
            { key: 'includeMetadata', label: 'Include Metadata', description: 'Export system and configuration data' },
            { key: 'formatAsTable', label: 'Format as Tables', description: 'Use Excel table formatting' },
            { key: 'includeFormulas', label: 'Include Formulas', description: 'Add calculated fields and analysis formulas' }
          ].map(({ key, label, description }) => (
            <label key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={options[key as keyof ExcelExportOptions] as boolean}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
                className="mt-1 rounded border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Table className="h-4 w-4" />
        )}
        Generate Excel Workbook
      </button>
    </div>
  );
}

interface ComplianceExportTabProps {
  options: ComplianceReportOptions;
  onOptionsChange: (options: ComplianceReportOptions) => void;
  onExport: () => void;
  isExporting: boolean;
}

function ComplianceExportTab({ options, onOptionsChange, onExport, isExporting }: ComplianceExportTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Compliance Report Settings
        </h3>
      </div>

      {/* Standard Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Compliance Standard
        </label>
        <select
          value={options.standard}
          onChange={(e) => onOptionsChange({ ...options, standard: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="ISO22400">ISO 22400 - Manufacturing KPIs</option>
          <option value="ISO13053">ISO 13053 - Six Sigma</option>
          <option value="ISO14224">ISO 14224 - Reliability</option>
          <option value="ISO50001">ISO 50001 - Energy Management</option>
          <option value="ALL">All Standards</option>
        </select>
      </div>

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Signed By
          </label>
          <input
            type="text"
            value={options.signedBy || ''}
            onChange={(e) => onOptionsChange({ ...options, signedBy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Report author name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Department
          </label>
          <input
            type="text"
            value={options.department || ''}
            onChange={(e) => onOptionsChange({ ...options, department: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Department or team..."
          />
        </div>
      </div>

      {/* Report Content */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Report Content</h4>
        <div className="space-y-3">
          {[
            { key: 'includeTargets', label: 'Include Targets', description: 'Show target values and benchmarks' },
            { key: 'includeDeviations', label: 'Include Deviations', description: 'Highlight values outside acceptable ranges' },
            { key: 'includeTrends', label: 'Include Trends', description: 'Show historical trend analysis' }
          ].map(({ key, label, description }) => (
            <label key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={options[key as keyof ComplianceReportOptions] as boolean}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
                className="mt-1 rounded border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        Generate Compliance Report
      </button>
    </div>
  );
}