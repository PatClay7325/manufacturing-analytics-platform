import { NextRequest, NextResponse } from 'next/server';
import { pluginService, getPluginDetails } from '@/services/pluginService';

export async function GET(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'user-123';

    const plugin = await getPluginDetails(params.pluginId, userId);

    return NextResponse.json(plugin);
  } catch (error: any) {
    console.error('Plugin details fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plugin details' },
      { status: 500 }
    );
  }
}