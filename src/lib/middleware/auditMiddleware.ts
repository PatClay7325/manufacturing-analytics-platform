/**
 * Audit Middleware
 * Automatically logs API requests and responses for audit purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditService, type AuditContext, type RequestContext } from '@/services/auditService';
import { v4 as uuidv4 } from 'uuid';

// Routes that should not be audited
const excludedPaths = [
  '/api/health',
  '/api/metrics',
  '/api/monitoring/logs',
  '/_next',
  '/static',
  '/favicon.ico'
];

// Sensitive headers to exclude from logging
const sensitiveHeaders = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-csrf-token'
];

export interface AuditMiddlewareConfig {
  enabled?: boolean;
  excludePaths?: string[];
  includePaths?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  logHeaders?: boolean;
}

/**
 * Create audit context from request
 */
function createAuditContext(request: NextRequest): AuditContext {
  const headers = request.headers;
  
  return {
    userId: headers.get('x-user-id') || undefined,
    userName: headers.get('x-user-name') || undefined,
    userEmail: headers.get('x-user-email') || undefined,
    userRole: headers.get('x-user-role') || undefined,
    sessionId: headers.get('x-session-id') || undefined,
    apiKeyId: headers.get('x-api-key-id') || undefined,
    requestId: headers.get('x-request-id') || uuidv4(),
    correlationId: headers.get('x-correlation-id') || undefined,
    parentEventId: headers.get('x-parent-event-id') || undefined
  };
}

/**
 * Create request context from NextRequest
 */
function createRequestContext(
  request: NextRequest,
  config: AuditMiddlewareConfig
): RequestContext {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  
  // Collect headers if enabled
  if (config.logHeaders) {
    request.headers.forEach((value, key) => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
  }
  
  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.ip || 
        undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    origin: request.headers.get('origin') || undefined,
    referer: request.headers.get('referer') || undefined
  };
}

/**
 * Determine event details from request
 */
function determineEventDetails(request: NextRequest) {
  const method = request.method;
  const path = new URL(request.url).pathname;
  
  // Determine event type based on HTTP method
  let eventType: string = 'read';
  if (method === 'POST') eventType = 'create';
  else if (method === 'PUT' || method === 'PATCH') eventType = 'update';
  else if (method === 'DELETE') eventType = 'delete';
  
  // Determine category from path
  let eventCategory = 'api';
  const pathParts = path.split('/').filter(Boolean);
  
  if (pathParts[0] === 'api' && pathParts[1]) {
    const resource = pathParts[1];
    
    // Map common resources to categories
    const categoryMap: Record<string, string> = {
      'auth': 'auth',
      'dashboards': 'dashboard',
      'alerts': 'alert',
      'users': 'user',
      'teams': 'team',
      'datasources': 'datasource',
      'plugins': 'plugin',
      'annotations': 'annotation',
      'playlists': 'playlist',
      'folders': 'folder',
      'organizations': 'organization',
      'preferences': 'preferences'
    };
    
    eventCategory = categoryMap[resource] || 'system';
  }
  
  // Special handling for auth endpoints
  if (path.includes('/api/auth/')) {
    eventCategory = 'auth';
    if (path.includes('/login')) eventType = 'login';
    else if (path.includes('/logout')) eventType = 'logout';
    else if (path.includes('/reset-password')) eventType = 'password_reset';
  }
  
  return { eventType, eventCategory, eventAction: `${eventCategory}.${eventType}` };
}

/**
 * Extract resource information from request
 */
function extractResourceInfo(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts.length < 3 || pathParts[0] !== 'api') {
    return undefined;
  }
  
  const resourceType = pathParts[1];
  const resourceId = pathParts[2];
  
  // Skip if resourceId is actually an action (like 'create', 'search', etc.)
  const actions = ['create', 'search', 'export', 'import', 'analytics', 'statistics'];
  if (actions.includes(resourceId)) {
    return undefined;
  }
  
  return {
    type: resourceType.slice(0, -1), // Remove plural 's'
    id: resourceId
  };
}

/**
 * Audit middleware for automatic request/response logging
 */
export function createAuditMiddleware(config: AuditMiddlewareConfig = {}) {
  const {
    enabled = true,
    excludePaths = excludedPaths,
    includePaths,
    logRequestBody = true,
    logResponseBody = false,
    logHeaders = true
  } = config;

  return async function auditMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip if disabled
    if (!enabled) {
      return handler(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Check if path should be audited
    const shouldAudit = (() => {
      // Check excluded paths
      if (excludePaths.some(excluded => path.startsWith(excluded))) {
        return false;
      }
      
      // If include paths are specified, only audit those
      if (includePaths && includePaths.length > 0) {
        return includePaths.some(included => path.startsWith(included));
      }
      
      // Default to auditing API routes
      return path.startsWith('/api/');
    })();

    if (!shouldAudit) {
      return handler(request);
    }

    const startTime = Date.now();
    const auditContext = createAuditContext(request);
    const requestContext = createRequestContext(request, config);
    
    // Add request body if enabled and present
    if (logRequestBody && request.method !== 'GET') {
      try {
        const body = await request.json();
        requestContext.body = body;
        
        // Clone request with body for handler
        request = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body)
        });
      } catch {
        // Body parsing failed, continue without it
      }
    }

    let response: NextResponse;
    let error: Error | undefined;
    
    try {
      // Execute the actual handler
      response = await handler(request);
      
      // Log successful request
      const duration = Date.now() - startTime;
      const { eventType, eventCategory, eventAction } = determineEventDetails(request);
      const resource = extractResourceInfo(request);
      
      await auditService.log({
        eventType: eventType as any,
        eventCategory: eventCategory as any,
        eventAction,
        eventStatus: response.status >= 400 ? 'failure' : 'success',
        eventSeverity: response.status >= 500 ? 'error' : 'info',
        resource,
        request: requestContext,
        performance: {
          responseTime: duration,
          totalDuration: duration
        },
        metadata: {
          statusCode: response.status,
          ...(logResponseBody && { responseSize: response.headers.get('content-length') })
        }
      }, auditContext);
      
      return response;
    } catch (err) {
      error = err as Error;
      const duration = Date.now() - startTime;
      const { eventType, eventCategory, eventAction } = determineEventDetails(request);
      const resource = extractResourceInfo(request);
      
      // Log error
      await auditService.log({
        eventType: eventType as any,
        eventCategory: eventCategory as any,
        eventAction,
        eventStatus: 'error',
        eventSeverity: 'error',
        resource,
        request: requestContext,
        performance: {
          responseTime: duration,
          totalDuration: duration
        },
        error: {
          message: error.message,
          stack: error.stack
        }
      }, auditContext);
      
      throw error;
    }
  };
}

/**
 * Audit specific actions programmatically
 */
export const audit = {
  /**
   * Log a custom audit event
   */
  async log(
    action: string,
    category: string,
    status: 'success' | 'failure' | 'error',
    context: AuditContext,
    metadata?: Record<string, any>
  ) {
    await auditService.log({
      eventType: 'custom' as any,
      eventCategory: category as any,
      eventAction: action,
      eventStatus: status,
      metadata
    }, context);
  },

  /**
   * Log data access
   */
  async logAccess(
    resourceType: string,
    resourceId: string,
    context: AuditContext,
    metadata?: Record<string, any>
  ) {
    await auditService.logDataAccess(
      { type: resourceType, id: resourceId },
      'read',
      context,
      undefined,
      undefined
    );
  },

  /**
   * Log data modification
   */
  async logModification(
    resourceType: string,
    resourceId: string,
    action: 'create' | 'update' | 'delete',
    context: AuditContext,
    previousValue?: any,
    newValue?: any
  ) {
    await auditService.logDataModification(
      { type: resourceType, id: resourceId, previousValue, newValue },
      action,
      'success',
      context
    );
  },

  /**
   * Log authentication event
   */
  async logAuth(
    action: 'login' | 'logout' | 'login_failed',
    status: 'success' | 'failure',
    context: AuditContext,
    metadata?: Record<string, any>
  ) {
    await auditService.logAuth(action, status, context, undefined, metadata);
  }
};