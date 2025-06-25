import { NextRequest, NextResponse } from 'next/server';
import { pluginService } from '@/services/pluginService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pluginId, version, userId, organizationId } = body;

    if (!pluginId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const installation = await pluginService.installPlugin({
      pluginId,
      version,
      userId,
      organizationId
    });

    return NextResponse.json(installation);
  } catch (error: any) {
    console.error('Plugin installation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to install plugin' },
      { status: 500 }
    );
  }
}