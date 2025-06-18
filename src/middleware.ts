import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware function that runs before every request
 * Adds common security headers and performance optimizations
 */
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Add common security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Add cache control headers for GET requests to improve performance
    if (request.method === 'GET') {
      // Set appropriate cache times based on the resource type
      if (request.nextUrl.pathname.includes('/api/metrics')) {
        // Metrics data can be cached for a shorter time as it changes frequently
        response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
      } else if (request.nextUrl.pathname.includes('/api/alerts')) {
        // Alerts also change frequently
        response.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=60');
      } else if (request.nextUrl.pathname.includes('/api/equipment')) {
        // Equipment data is more static
        response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800');
      } else if (request.nextUrl.pathname.includes('/api/chat')) {
        // Chat data is user-specific and should have minimal caching
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      } else {
        // Default caching for other API routes
        response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=600');
      }
    } else {
      // Non-GET methods should not be cached
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  } else if (request.nextUrl.pathname.includes('/_next/')) {
    // Cache static assets more aggressively
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  return response;
}

// Apply middleware to all requests
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};