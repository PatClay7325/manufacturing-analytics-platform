import { NextRequest, NextResponse } from 'next/server';
import { searchPlugins } from '@/services/pluginService';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    // Get user session (if using auth)
    // const session = await getServerSession();
    // const userId = session?.user?.id;
    
    // For now, use a dummy user ID
    const userId = 'user-123';

    const searchParams = request.nextUrl.searchParams;
    
    const params = {
      query: searchParams.get('query') || undefined,
      type: searchParams.get('type') as any || 'all',
      category: searchParams.get('category') || undefined,
      sort: searchParams.get('sort') as any || 'downloads',
      order: searchParams.get('order') as any || 'desc',
      installed: searchParams.get('installed') === 'true' ? true : undefined,
      signature: searchParams.get('signature') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = await searchPlugins(params, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Plugin search error:', error);
    return NextResponse.json(
      { error: 'Failed to search plugins' },
      { status: 500 }
    );
  }
}