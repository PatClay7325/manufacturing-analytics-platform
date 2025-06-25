import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// In-memory storage for demo purposes
// In a real implementation, this would be stored in a database
const exploreHistory: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const starred = searchParams.get('starred') === 'true';

    // Filter history by user and optional starred filter
    let userHistory = exploreHistory.filter(item => item.userId === authResult.user!.userId);
    
    if (starred) {
      userHistory = userHistory.filter(item => item.starred);
    }

    // Sort by timestamp descending and limit
    const sortedHistory = userHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return NextResponse.json({ history: sortedHistory });

  } catch (error) {
    console.error('Failed to fetch explore history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch explore history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'create:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { queries, range, datasource, comment } = body;

    // Validate required fields
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'Invalid queries: must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!range || !range.from || !range.to) {
      return NextResponse.json(
        { error: 'Invalid range: from and to are required' },
        { status: 400 }
      );
    }

    if (!datasource || !datasource.uid || !datasource.type) {
      return NextResponse.json(
        { error: 'Invalid datasource: uid and type are required' },
        { status: 400 }
      );
    }

    // Create history entry
    const historyItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId: authResult.user.userId,
      queries: queries.filter((q: any) => q.expr && q.expr.trim()), // Only save non-empty queries
      range,
      datasource,
      comment: comment?.substring(0, 500) || undefined, // Limit comment length
      starred: false
    };

    // Add to history (keeping only last 100 items per user)
    exploreHistory.push(historyItem);
    
    // Clean up old entries for this user (keep last 100)
    const userHistoryCount = exploreHistory.filter(item => item.userId === authResult.user!.userId).length;
    if (userHistoryCount > 100) {
      const userItems = exploreHistory
        .filter(item => item.userId === authResult.user!.userId)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const toRemove = userItems.slice(0, userHistoryCount - 100);
      toRemove.forEach(item => {
        const index = exploreHistory.findIndex(h => h.id === item.id);
        if (index !== -1) {
          exploreHistory.splice(index, 1);
        }
      });
    }

    return NextResponse.json({ history: historyItem }, { status: 201 });

  } catch (error) {
    console.error('Failed to save explore history:', error);
    return NextResponse.json(
      { error: 'Failed to save explore history' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'edit:own');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'History ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { starred, comment } = body;

    // Find the history item
    const historyIndex = exploreHistory.findIndex(item => 
      item.id === id && item.userId === authResult.user!.userId
    );

    if (historyIndex === -1) {
      return NextResponse.json(
        { error: 'History item not found' },
        { status: 404 }
      );
    }

    // Update the item
    const historyItem = exploreHistory[historyIndex];
    if (starred !== undefined) {
      historyItem.starred = Boolean(starred);
    }
    if (comment !== undefined) {
      historyItem.comment = comment?.substring(0, 500) || undefined;
    }
    historyItem.updatedAt = Date.now();

    exploreHistory[historyIndex] = historyItem;

    return NextResponse.json({ history: historyItem });

  } catch (error) {
    console.error('Failed to update explore history:', error);
    return NextResponse.json(
      { error: 'Failed to update explore history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'delete:own');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'History ID is required' },
        { status: 400 }
      );
    }

    // Find and remove the history item
    const historyIndex = exploreHistory.findIndex(item => 
      item.id === id && item.userId === authResult.user!.userId
    );

    if (historyIndex === -1) {
      return NextResponse.json(
        { error: 'History item not found' },
        { status: 404 }
      );
    }

    exploreHistory.splice(historyIndex, 1);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete explore history:', error);
    return NextResponse.json(
      { error: 'Failed to delete explore history' },
      { status: 500 }
    );
  }
}