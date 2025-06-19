import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Get all alerts
    const allAlerts = await prisma.alert.findMany({
      select: {
        id: true,
        severity: true,
        status: true,
        alertType: true,
        timestamp: true,
        workUnitId: true,
        createdAt: true
      }
    });

    // Calculate statistics
    const total = allAlerts.length;

    // By Status
    const byStatus = {
      active: allAlerts.filter(a => a.status === 'active').length,
      acknowledged: allAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: allAlerts.filter(a => a.status === 'resolved').length
    };

    // By Severity
    const bySeverity = {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      medium: allAlerts.filter(a => a.severity === 'medium').length,
      low: allAlerts.filter(a => a.severity === 'low').length,
      info: allAlerts.filter(a => a.severity === 'info').length
    };

    // By Source (Alert Type)
    const bySource = allAlerts.reduce((acc, alert) => {
      const source = alert.alertType || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get trend data for last 7 days
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const nextDate = startOfDay(subDays(new Date(), i - 1));
      
      const count = allAlerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= date && alertDate < nextDate;
      }).length;

      trend.push({
        date: date.toISOString(),
        count
      });
    }

    // Get alerts for specific time ranges for additional metrics
    const last24h = allAlerts.filter(a => 
      new Date(a.timestamp) >= subDays(new Date(), 1)
    ).length;

    const last7d = allAlerts.filter(a => 
      new Date(a.timestamp) >= subDays(new Date(), 7)
    ).length;

    const last30d = allAlerts.filter(a => 
      new Date(a.timestamp) >= subDays(new Date(), 30)
    ).length;

    // Calculate resolution metrics
    const resolvedAlerts = allAlerts.filter(a => a.status === 'resolved');
    const activeAndAcknowledged = allAlerts.filter(a => 
      a.status === 'active' || a.status === 'acknowledged'
    );

    const resolutionRate = total > 0 
      ? Math.round((resolvedAlerts.length / total) * 100) 
      : 0;

    // Mock MTTR (in production, calculate from actual resolution times)
    const mttr = 42; // minutes

    // Alert rate per hour (based on last 24h)
    const alertRate = Math.round((last24h / 24) * 10) / 10;

    const statistics = {
      total,
      byStatus,
      bySeverity,
      bySource,
      trend,
      metrics: {
        last24h,
        last7d,
        last30d,
        resolutionRate,
        mttr,
        alertRate
      }
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error fetching alert statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert statistics' },
      { status: 500 }
    );
  }
}