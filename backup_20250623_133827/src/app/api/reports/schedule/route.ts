/**
 * Scheduled Reports API Route
 * Create and manage scheduled reports
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

    if (!config.schedule || !config.schedule.enabled) {
      return NextResponse.json(
        { error: 'Schedule configuration is required' },
        { status: 400 }
      );
    }

    if (!config.recipients || config.recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required for scheduled reports' },
        { status: 400 }
      );
    }

    // Schedule the report
    const scheduledReportId = await reportingService.scheduleReport(config);

    return NextResponse.json({
      message: 'Report scheduled successfully',
      scheduledReportId
    });

  } catch (error) {
    console.error('Error scheduling report:', error);
    return NextResponse.json(
      { error: 'Failed to schedule report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboardUid = searchParams.get('dashboardUid');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { reports, total } = await reportingService.listReports({
      dashboardUid: dashboardUid || undefined,
      limit,
      offset
    });

    return NextResponse.json({
      reports,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: 'Failed to list reports', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}