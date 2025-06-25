import { NextRequest, NextResponse } from 'next/server';
import { pluginService } from '@/services/pluginService';

export async function POST(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const body = await request.json();
    const { enabled, userId, organizationId } = body;

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await pluginService.togglePlugin(
      params.pluginId,
      userId,
      enabled,
      organizationId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Plugin toggle error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle plugin' },
      { status: 500 }
    );
  }
}