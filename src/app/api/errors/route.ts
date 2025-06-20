import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Validate required fields
    if (!errorData.message || !errorData.stack) {
      return NextResponse.json(
        { error: 'Missing required error data' },
        { status: 400 }
      );
    }

    // Extract additional context
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Store error in database
    const errorRecord = await prisma.errorLog.create({
      data: {
        errorId: errorData.errorId,
        message: errorData.message.substring(0, 1000), // Limit message length
        stack: errorData.stack,
        componentStack: errorData.componentStack || null,
        context: errorData.context || null,
        userAgent: userAgent.substring(0, 500),
        url: errorData.url || referer,
        ipAddress,
        timestamp: new Date(errorData.timestamp || Date.now()),
        severity: determineSeverity(errorData),
        resolved: false
      }
    });

    // Log critical errors immediately
    if (errorRecord.severity === 'CRITICAL') {
      console.error('🚨 CRITICAL ERROR LOGGED:', {
        id: errorRecord.id,
        errorId: errorRecord.errorId,
        message: errorRecord.message,
        url: errorRecord.url
      });
    }

    return NextResponse.json({
      success: true,
      errorId: errorRecord.errorId,
      logId: errorRecord.id
    });

  } catch (error) {
    console.error('Failed to log error:', error);
    
    // Fallback to console logging if database fails
    console.error('Original error data:', {
      errorData: await request.clone().json().catch(() => 'Failed to parse'),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    
    const skip = (page - 1) * limit;
    
    // Build filters
    const where: any = {};
    if (severity) {
      where.severity = severity.toUpperCase();
    }
    if (resolved !== null) {
      where.resolved = resolved === 'true';
    }

    // Get errors with pagination
    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          errorId: true,
          message: true,
          context: true,
          url: true,
          timestamp: true,
          severity: true,
          resolved: true,
          ipAddress: true
        }
      }),
      prisma.errorLog.count({ where })
    ]);

    return NextResponse.json({
      errors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch errors' },
      { status: 500 }
    );
  }
}

function determineSeverity(errorData: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const message = errorData.message?.toLowerCase() || '';
  const stack = errorData.stack?.toLowerCase() || '';
  const context = errorData.context?.toLowerCase() || '';
  
  // Critical errors
  if (
    message.includes('database') ||
    message.includes('connection') ||
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    context?.includes('auth') ||
    context?.includes('database') ||
    stack.includes('prisma') ||
    stack.includes('database')
  ) {
    return 'CRITICAL';
  }
  
  // High severity errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('500') ||
    context?.includes('api') ||
    context?.includes('chart') ||
    context?.includes('dashboard')
  ) {
    return 'HIGH';
  }
  
  // Medium severity errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('404') ||
    message.includes('not found') ||
    context?.includes('component') ||
    context?.includes('form')
  ) {
    return 'MEDIUM';
  }
  
  // Default to low severity
  return 'LOW';
}