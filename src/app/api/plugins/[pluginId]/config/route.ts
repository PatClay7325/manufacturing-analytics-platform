import { NextRequest, NextResponse } from 'next/server';
import { pluginService } from '@/services/pluginService';

export async function GET(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'user-123';
    const organizationId = searchParams.get('organizationId') || undefined;

    const config = await pluginService.getPluginConfig(
      params.pluginId,
      userId,
      organizationId
    );

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Plugin config fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plugin config' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const body = await request.json();
    const { userId, organizationId, ...config } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await pluginService.updatePluginConfig(
      params.pluginId,
      userId,
      config,
      organizationId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Plugin config update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plugin config' },
      { status: 500 }
    );
  }
}