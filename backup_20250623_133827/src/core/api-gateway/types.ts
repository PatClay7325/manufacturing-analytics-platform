/**
 * API Gateway Types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the types and interfaces for the API gateway.
 */

/**
 * HTTP method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * API version type
 */
export type ApiVersion = 'v1' | 'v2' | 'v3' | 'latest';

/**
 * Route parameter type
 */
export interface RouteParam {
  /**
   * Parameter name
   */
  name: string;
  
  /**
   * Parameter type
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /**
   * Whether the parameter is required
   */
  required: boolean;
  
  /**
   * Parameter description
   */
  description?: string;
  
  /**
   * Default value
   */
  default?: string | number | boolean | null;
  
  /**
   * Validation schema
   */
  schema?: Record<string, unknown>;
}

/**
 * API route definition
 */
export interface ApiRoute {
  /**
   * Route path
   */
  path: string;
  
  /**
   * HTTP method
   */
  method: HttpMethod;
  
  /**
   * API version
   */
  version: ApiVersion;
  
  /**
   * Route handler
   */
  handler: RouteHandler;
  
  /**
   * Route parameters
   */
  params?: RouteParam[];
  
  /**
   * Query parameters
   */
  queryParams?: RouteParam[];
  
  /**
   * Body parameters
   */
  bodyParams?: RouteParam[];
  
  /**
   * Required roles for authorization
   */
  requiredRoles?: string[];
  
  /**
   * Whether authentication is required
   */
  requiresAuth?: boolean;
  
  /**
   * Route description
   */
  description?: string;
  
  /**
   * Route tags for documentation
   */
  tags?: string[];
  
  /**
   * Rate limit (requests per minute)
   */
  rateLimit?: number;
  
  /**
   * Cache TTL in seconds
   */
  cacheTtl?: number;
  
  /**
   * Middleware to apply to this route
   */
  middleware?: MiddlewareFunction[];
}

/**
 * API route handler function
 */
export type RouteHandler = (req: ApiRequest, res: ApiResponse) => Promise<void>;

/**
 * Middleware function
 */
export type MiddlewareFunction = (req: ApiRequest, res: ApiResponse, next: () => Promise<void>) => Promise<void>;

/**
 * API request
 */
export interface ApiRequest {
  /**
   * Request path
   */
  path: string;
  
  /**
   * HTTP method
   */
  method: HttpMethod;
  
  /**
   * API version
   */
  version: ApiVersion;
  
  /**
   * Path parameters
   */
  params: Record<string, string | number | boolean>;
  
  /**
   * Query parameters
   */
  query: Record<string, string | number | boolean | string[]>;
  
  /**
   * Request body
   */
  body: unknown;
  
  /**
   * Request headers
   */
  headers: Record<string, string>;
  
  /**
   * Authenticated user
   */
  user?: {
    id: string;
    roles: string[];
    email?: string;
    name?: string;
    tenantId?: string;
  };
  
  /**
   * Request ID
   */
  id: string;
  
  /**
   * Request timestamp
   */
  timestamp: Date;
  
  /**
   * Client IP address
   */
  ip?: string;
}

/**
 * API response
 */
export interface ApiResponse {
  /**
   * Set status code
   */
  status(code: number): ApiResponse;
  
  /**
   * Set header
   */
  header(name: string, value: string): ApiResponse;
  
  /**
   * Send JSON response
   */
  json(body: unknown): void;
  
  /**
   * Send text response
   */
  text(body: string): void;
  
  /**
   * Send error response
   */
  error(status: number, message: string, details?: unknown): void;
  
  /**
   * Send stream response
   */
  stream(stream: NodeJS.ReadableStream): void;
  
  /**
   * End response without data
   */
  end(): void;
  
  /**
   * Get current status code
   */
  getStatus(): number;
  
  /**
   * Get current headers
   */
  getHeaders(): Record<string, string>;
}

/**
 * API error
 */
export interface ApiError {
  /**
   * Error status code
   */
  status: number;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Error details
   */
  details?: unknown;
  
  /**
   * Stack trace (development only)
   */
  stack?: string;
}

/**
 * API gateway configuration
 */
export interface ApiGatewayConfig {
  /**
   * Base path for API
   */
  basePath?: string;
  
  /**
   * Default API version
   */
  defaultVersion?: ApiVersion;
  
  /**
   * CORS configuration
   */
  cors?: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: HttpMethod[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge?: number;
    allowCredentials?: boolean;
  };
  
  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    enabled: boolean;
    windowMs: number;
    max: number;
    message?: string;
    statusCode?: number;
    skipSuccessfulRequests?: boolean;
  };
  
  /**
   * Authentication configuration
   */
  auth?: {
    enabled: boolean;
    jwtSecret?: string;
    jwtExpiration?: number;
    jwtRefreshExpiration?: number;
  };
  
  /**
   * Logging configuration
   */
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    format?: 'json' | 'text';
    requests?: boolean;
    responses?: boolean;
  };
  
  /**
   * Documentation configuration
   */
  docs?: {
    enabled: boolean;
    path?: string;
    title?: string;
    description?: string;
    version?: string;
  };
}