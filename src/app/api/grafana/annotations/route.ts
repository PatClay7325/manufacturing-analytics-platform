import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// Annotations endpoint for Grafana JSON datasource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { range, annotation } = body;
    
    const from = new Date(range?.from || new Date().getTime() - 24 * 60 * 60 * 1000);
    const to = new Date(range?.to || new Date());

    // Fetch alerts as annotations
    const alerts = await prisma.alert.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const annotations = alerts.map(alert => ({
      time: new Date(alert.createdAt).getTime(),
      title: alert.name,
      text: alert.message || '',
      tags: [alert.severity, alert.status],
    }));

    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Grafana annotations error:', error);
    return NextResponse.json([]);
  }
}