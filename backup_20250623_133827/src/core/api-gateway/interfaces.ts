/**
 * API Gateway Interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the interfaces for the API gateway.
 */

import { ModularService } from './services/interfaces';
import {
  ApiVersion,
  ApiRoute,
  ApiRequest,
  ApiResponse,
  MiddlewareFunction,
  ApiGatewayConfig,
  ApiError,
  HttpMethod,
} from './types';

/**
 * Route registry interface
 * Manages API routes and versioning
 */
export interface RouteRegistry {
  /**
   * Register a new route
   * @param route Route to register
   */
  registerRoute(route: ApiRoute): void;
  
  /**
   * Register multiple routes
   * @param routes Routes to register
   */
  registerRoutes(routes: ApiRoute[]): void;
  
  /**
   * Get all registered routes
   */
  getRoutes(): ApiRoute[];
  
  /**
   * Get routes for a specific version
   * @param version API version
   */
  getRoutesByVersion(version: ApiVersion): ApiRoute[];
  
  /**
   * Find a route that matches the request
   * @param path Request path
   * @param method HTTP method
   * @param version API version
   */
  findRoute(path: string, method: HttpMethod, version: ApiVersion): {
    route: ApiRoute;
    params: Record<string, string | number | boolean>;
  } | null;
  
  /**
   * Generate route documentation
   * @param format Documentation format
   */
  generateDocumentation(format: 'json' | 'yaml' | 'html'): string;
}

/**
 * Request handler interface
 * Processes API requests
 */
export interface RequestHandler {
  /**
   * Handle an API request
   * @param req API request
   * @param res API response
   * @param route Matched route
   */
  handleRequest(req: ApiRequest, res: ApiResponse, route: ApiRoute): Promise<void>;
  
  /**
   * Register a middleware function
   * @param middleware Middleware function
   * @param position Position in middleware chain
   */
  registerMiddleware(
    middleware: MiddlewareFunction,
    position?: 'pre' | 'post'
  ): void;
  
  /**
   * Apply middleware to a request
   * @param req API request
   * @param res API response
   * @param middlewares Middleware functions to apply
   */
  applyMiddleware(
    req: ApiRequest,
    res: ApiResponse,
    middlewares: MiddlewareFunction[]
  ): Promise<boolean>;
}

/**
 * Authentication manager interface
 * Handles API authentication
 */
export interface AuthManager {
  /**
   * Authenticate a request
   * @param req API request
   */
  authenticate(req: ApiRequest): Promise<boolean>;
  
  /**
   * Generate an authentication token
   * @param user User information
   * @param expiresIn Token expiration time
   */
  generateToken(user: { id: string; email?: string; roles?: string[] }, expiresIn?: number): Promise<string>;
  
  /**
   * Verify an authentication token
   * @param token Authentication token
   */
  verifyToken(token: string): Promise<{ id: string; email?: string; roles?: string[] }>;
  
  /**
   * Generate a refresh token
   * @param userId User ID
   */
  generateRefreshToken(userId: string): Promise<string>;
  
  /**
   * Refresh an authentication token
   * @param refreshToken Refresh token
   */
  refreshToken(refreshToken: string): Promise<string>;
}

/**
 * Authorization manager interface
 * Handles API authorization
 */
export interface AuthorizationManager {
  /**
   * Authorize a request
   * @param req API request
   * @param route API route
   */
  authorize(req: ApiRequest, route: ApiRoute): Promise<boolean>;
  
  /**
   * Check if a user has a role
   * @param user User information
   * @param role Role to check
   */
  hasRole(user: { id: string; roles?: string[] }, role: string): boolean;
  
  /**
   * Check if a user has any of the required roles
   * @param user User information
   * @param roles Roles to check
   */
  hasAnyRole(user: { id: string; roles?: string[] }, roles: string[]): boolean;
  
  /**
   * Check if a user has all of the required roles
   * @param user User information
   * @param roles Roles to check
   */
  hasAllRoles(user: { id: string; roles?: string[] }, roles: string[]): boolean;
}

/**
 * Rate limiter interface
 * Manages API rate limiting
 */
export interface RateLimiter {
  /**
   * Check if a request exceeds the rate limit
   * @param req API request
   * @param limit Rate limit
   */
  checkLimit(req: ApiRequest, limit?: number): Promise<boolean>;
  
  /**
   * Reset rate limits for a client
   * @param clientId Client identifier
   */
  resetLimits(clientId: string): Promise<void>;
  
  /**
   * Get current rate limit status for a client
   * @param clientId Client identifier
   */
  getLimitStatus(clientId: string): Promise<{
    remaining: number;
    reset: Date;
    limit: number;
  }>;
}

/**
 * API gateway service interface
 * Main interface for the API gateway
 */
export interface ApiGatewayService extends ModularService {
  /**
   * Get the route registry
   */
  getRouteRegistry(): RouteRegistry;
  
  /**
   * Get the request handler
   */
  getRequestHandler(): RequestHandler;
  
  /**
   * Get the authentication manager
   */
  getAuthManager(): AuthManager;
  
  /**
   * Get the authorization manager
   */
  getAuthorizationManager(): AuthorizationManager;
  
  /**
   * Get the rate limiter
   */
  getRateLimiter(): RateLimiter;
  
  /**
   * Process an API request
   * @param req API request
   * @param res API response
   */
  processRequest(req: ApiRequest, res: ApiResponse): Promise<void>;
  
  /**
   * Register a service API
   * @param serviceName Service name
   * @param routes Service routes
   */
  registerServiceApi(serviceName: string, routes: ApiRoute[]): void;
  
  /**
   * Handle an API error
   * @param error Error to handle
   * @param req API request
   * @param res API response
   */
  handleError(error: ApiError, req: ApiRequest, res: ApiResponse): void;
}