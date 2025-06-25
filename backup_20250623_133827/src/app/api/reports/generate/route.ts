/**
 * Report Generation API Route
 * Generate reports in various formats (PDF, Excel, CSV, JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReportingService, ReportConfig } from '@/services/reportingService';

const reportingService = ReportingService.getInstance();

export async function POST(request: NextRequest) {
  try {
    const config: ReportConfig = await request.json();

    // Validate required fields
    if (!config.dashboardUid) {
      return NextResponse.json(
        { error: 'Dashboard UID is required' },
        { status: 400 }
      );
    }

    if (!config.format) {
      return NextResponse.json(
        { error: 'Report format is required' },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel', 'csv', 'json'].includes(config.format)) {
      return NextResponse.json(
        { error: 'Invalid report format. Supported formats: pdf, excel, csv, json' },
        { status: 400 }
      );
    }

    // Generate the report
    const result = await reportingService.generateReport(config);

    // Return report data based on format
    if (config.format === 'json') {
      return NextResponse.json({
        reportId: result.reportId,
        timestamp: result.timestamp,
        data: JSON.parse(result.data as string)
      });
    }

    // For binary formats (PDF, Excel), return as download
    const headers = new Headers();
    headers.set('Content-Type', 
      config.format === 'pdf' ? 'application/pdf' :
      config.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
      'text/csv'
    );
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);

    return new NextResponse(result.data, { headers });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}