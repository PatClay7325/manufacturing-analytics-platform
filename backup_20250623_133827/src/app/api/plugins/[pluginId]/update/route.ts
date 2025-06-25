import { NextRequest, NextResponse } from 'next/server';
import { pluginService } from '@/services/pluginService';

export async function POST(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const body = await request.json();
    const { userId, organizationId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await pluginService.updatePlugin(
      params.pluginId,
      userId,
      organizationId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Plugin update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plugin' },
      { status: 500 }
    );
  }
}