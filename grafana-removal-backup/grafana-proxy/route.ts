import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { authenticate } from '@/lib/auth/middleware';
import { rateLimit } from '@/lib/middleware/rate-limit';

// Secure configuration with proper validation
const GRAFANA_URL = process.env.GRAFANA_URL;
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

if (!GRAFANA_URL) {
  throw new Error('GRAFANA_URL environment variable is required');
}

if (!GRAFANA_API_KEY) {
  throw new Error('GRAFANA_API_KEY environment variable is required');
}

// Allowed paths for security
const ALLOWED_PATHS = [
  'dashboards',
  'datasources', 
  'folders',
  'search',
  'health',
  'user',
  'orgs'
];

function validatePath(path: string): boolean {
  // Remove any query parameters for validation
  const cleanPath = path.split('?')[0];
  
  // Check if path starts with allowed prefixes
  return ALLOWED_PATHS.some(allowedPath => 
    cleanPath.startsWith(allowedPath) || cleanPath === allowedPath
  );
}

function sanitizePath(path: string): string {
  // Remove potential path traversal attempts
  return path.replace(/\.\./g, '').replace(/\/+/g, '/');
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authentication check
    const authResult = await authenticate(request);
    if (!authResult.isAuthenticated) {
      logger.warn('Unauthorized Grafana proxy attempt', {
        ip: request.ip,
        userAgent: request.headers.get('user-agent')
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path') || '';
    
    if (!rawPath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const sanitizedPath = sanitizePath(rawPath);
    
    if (!validatePath(sanitizedPath)) {
      logger.warn('Invalid Grafana proxy path attempt', {
        path: rawPath,
        user: authResult.user?.email,
        ip: request.ip
      });
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }
    
    const url = `${GRAFANA_URL}/api/${sanitizedPath}`;
    
    logger.info('Grafana proxy request', {
      path: sanitizedPath,
      user: authResult.user?.email,
      url: url.replace(GRAFANA_URL, '[REDACTED]')
    });
    
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${GRAFANA_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Manufacturing-Analytics-Platform/1.0'
      },
      // Timeout after 30 seconds
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      logger.error('Grafana API error', {
        status: response.status,
        statusText: response.statusText,
        path: sanitizedPath,
        user: authResult.user?.email
      });
      
      return NextResponse.json({ 
        error: 'Grafana API error', 
        status: response.status
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Grafana proxy timeout', { error: error.message });
      return NextResponse.json({ 
        error: 'Request timeout' 
      }, { status: 408 });
    }
    
    logger.error('Grafana proxy error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}
