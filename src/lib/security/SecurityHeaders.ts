/**
 * Enterprise Security Headers & CORS Configuration
 * CSP, HSTS, X-Frame-Options, and comprehensive security policies
 */

import { IncomingMessage, ServerResponse } from 'http';
import { logger } from '@/lib/logger';
import { Counter, register } from 'prom-client';

export interface SecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: Record<string, string[]>;
    reportUri?: string;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

// Security metrics
const securityViolations = new Counter({
  name: 'security_violations_total',
  help: 'Total number of security violations detected',
  labelNames: ['type', 'source'],
});

const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['ip', 'endpoint', 'status'],
});

const corsRequests = new Counter({
  name: 'cors_requests_total',
  help: 'Total number of CORS requests',
  labelNames: ['origin', 'status'],
});

register.registerMetric(securityViolations);
register.registerMetric(rateLimitHits);
register.registerMetric(corsRequests);

export class SecurityHeadersService {
  private static instance: SecurityHeadersService;
  private config: SecurityConfig;
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.config = this.getDefaultConfig();
    this.setupRateLimitCleanup();
  }

  static getInstance(): SecurityHeadersService {
    if (!SecurityHeadersService.instance) {
      SecurityHeadersService.instance = new SecurityHeadersService();
    }
    return SecurityHeadersService.instance;
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(req: IncomingMessage, res: ServerResponse): void {
    // Content Security Policy
    if (this.config.csp.enabled) {
      const cspValue = this.buildCSPHeader();
      const headerName = this.config.csp.reportOnly 
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      res.setHeader(headerName, cspValue);
    }

    // HTTP Strict Transport Security
    if (this.config.hsts.enabled) {
      const hstsValue = this.buildHSTSHeader();
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
    );
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.setHeader('Server', 'Manufacturing-Analytics');
    
    // Cache control for sensitive pages
    if (this.isSensitivePage(req.url || '')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }

  /**
   * Handle CORS preflight and requests
   */
  handleCORS(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.config.cors.enabled) {
      return false;
    }

    const origin = req.headers.origin as string;
    const method = req.method?.toUpperCase();
    
    // Check if origin is allowed
    const isAllowedOrigin = this.isAllowedOrigin(origin);
    
    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', this.config.cors.credentials.toString());
      res.setHeader('Access-Control-Max-Age', this.config.cors.maxAge.toString());
      
      corsRequests.inc({ origin: origin || 'unknown', status: 'allowed' });
    } else {
      corsRequests.inc({ origin: origin || 'unknown', status: 'blocked' });
      securityViolations.inc({ type: 'cors_violation', source: origin || 'unknown' });
      
      logger.warn({ origin, method, url: req.url }, 'CORS violation detected');
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Methods', this.config.cors.methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', this.config.cors.headers.join(', '));
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(403);
        res.end('CORS policy violation');
      }
      return true; // Handled
    }

    return false; // Not handled, continue with request
  }

  /**
   * Apply rate limiting
   */
  applyRateLimit(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.config.rateLimiting.enabled) {
      return false;
    }

    const clientId = this.getClientId(req);
    const endpoint = this.normalizeEndpoint(req.url || '/');
    const now = Date.now();
    
    let entry = this.rateLimitStore.get(clientId);
    
    if (!entry || now >= entry.resetTime) {
      // Create new or reset expired entry
      entry = {
        count: 1,
        resetTime: now + this.config.rateLimiting.windowMs,
        blocked: false,
      };
      this.rateLimitStore.set(clientId, entry);
    } else {
      entry.count++;
    }

    // Check if rate limit exceeded
    if (entry.count > this.config.rateLimiting.maxRequests) {
      if (!entry.blocked) {
        entry.blocked = true;
        logger.warn({ clientId, endpoint, count: entry.count }, 'Rate limit exceeded');
      }
      
      rateLimitHits.inc({ ip: clientId, endpoint, status: 'blocked' });
      securityViolations.inc({ type: 'rate_limit_exceeded', source: clientId });
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.rateLimiting.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());
      
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      }));
      
      return true; // Request blocked
    }

    // Set rate limit headers for successful requests
    res.setHeader('X-RateLimit-Limit', this.config.rateLimiting.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (this.config.rateLimiting.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    
    rateLimitHits.inc({ ip: clientId, endpoint, status: 'allowed' });
    
    return false; // Request allowed
  }

  /**
   * Validate request security
   */
  validateRequestSecurity(req: IncomingMessage): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-cluster-client-ip'];
    for (const header of suspiciousHeaders) {
      if (req.headers[header]) {
        violations.push(`Suspicious header detected: ${header}`);
      }
    }
    
    // Check for suspicious user agents
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousUA = [
      'sqlmap', 'nikto', 'nessus', 'openvas', 'burp', 'nmap',
      'masscan', 'zap', 'w3af', 'havij', 'pangolin'
    ];
    
    for (const suspicious of suspiciousUA) {
      if (userAgent.toLowerCase().includes(suspicious)) {
        violations.push(`Suspicious user agent: ${suspicious}`);
        securityViolations.inc({ type: 'suspicious_user_agent', source: userAgent });
      }
    }
    
    // Check for suspicious URLs
    const url = req.url || '';
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /%2e%2e%2f/i, // Encoded path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /exec\(/i, // Command injection
      /\bor\b.*1.*=.*1/i, // SQL injection
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        violations.push(`Suspicious URL pattern detected`);
        securityViolations.inc({ type: 'suspicious_url', source: this.getClientId(req) });
      }
    }
    
    // Log violations
    if (violations.length > 0) {
      logger.warn({
        clientId: this.getClientId(req),
        url: req.url,
        userAgent: req.headers['user-agent'],
        violations,
      }, 'Security violations detected');
    }
    
    return { valid: violations.length === 0, violations };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info({ config: this.config }, 'Security configuration updated');
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    rateLimitEntries: number;
    blockedIPs: string[];
    recentViolations: number;
  } {
    const blockedIPs = Array.from(this.rateLimitStore.entries())
      .filter(([, entry]) => entry.blocked)
      .map(([ip]) => ip);
    
    return {
      rateLimitEntries: this.rateLimitStore.size,
      blockedIPs,
      recentViolations: 0, // Would track recent violations
    };
  }

  /**
   * Build Content Security Policy header
   */
  private buildCSPHeader(): string {
    const directives = [];
    
    for (const [directive, sources] of Object.entries(this.config.csp.directives)) {
      directives.push(`${directive} ${sources.join(' ')}`);
    }
    
    if (this.config.csp.reportUri) {
      directives.push(`report-uri ${this.config.csp.reportUri}`);
    }
    
    return directives.join('; ');
  }

  /**
   * Build HSTS header
   */
  private buildHSTSHeader(): string {
    let hsts = `max-age=${this.config.hsts.maxAge}`;
    
    if (this.config.hsts.includeSubDomains) {
      hsts += '; includeSubDomains';
    }
    
    if (this.config.hsts.preload) {
      hsts += '; preload';
    }
    
    return hsts;
  }

  /**
   * Check if origin is allowed
   */
  private isAllowedOrigin(origin: string): boolean {
    if (!origin) {
      return false;
    }
    
    return this.config.cors.origins.some(allowedOrigin => {
      if (allowedOrigin === '*') {
        return true;
      }
      if (allowedOrigin.includes('*')) {
        // Handle wildcard patterns
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(req: IncomingMessage): string {
    // Try to get real IP from various headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    const real = req.headers['x-real-ip'] as string;
    const remote = req.socket.remoteAddress;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return real || remote || 'unknown';
  }

  /**
   * Normalize endpoint for rate limiting
   */
  private normalizeEndpoint(url: string): string {
    // Remove query parameters and normalize dynamic segments
    const path = url.split('?')[0];
    
    // Replace common dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
  }

  /**
   * Check if page contains sensitive information
   */
  private isSensitivePage(url: string): boolean {
    const sensitivePatterns = [
      '/admin', '/api', '/auth', '/profile', '/settings',
      '/diagnostics', '/health', '/metrics'
    ];
    
    return sensitivePatterns.some(pattern => url.startsWith(pattern));
  }

  /**
   * Setup rate limit cleanup
   */
  private setupRateLimitCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.rateLimitStore.entries()) {
        if (now >= entry.resetTime) {
          this.rateLimitStore.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug({ cleaned }, 'Cleaned up expired rate limit entries');
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Get default security configuration
   */
  private getDefaultConfig(): SecurityConfig {
    return {
      csp: {
        enabled: true,
        reportOnly: process.env.NODE_ENV !== 'production',
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js requirements
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'https:'],
          'connect-src': ["'self'", 'https:', 'wss:'],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
        reportUri: '/api/csp-violations',
      },
      hsts: {
        enabled: process.env.NODE_ENV === 'production',
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      cors: {
        enabled: true,
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        headers: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
          'X-API-Key',
        ],
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
        skipSuccessfulRequests: false,
      },
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
export const securityHeadersService = SecurityHeadersService.getInstance();