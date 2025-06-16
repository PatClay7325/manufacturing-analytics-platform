/**
 * API Gateway Service Implementation
 * 
 * This class implements the ApiGatewayService interface and provides
 * the main interface for the API gateway.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseModularService } from '../services/BaseModularService';
import {
  ApiGatewayService,
  RouteRegistry,
  RequestHandler,
  AuthManager,
  AuthorizationManager,
  RateLimiter,
} from './interfaces';
import {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ApiError,
  ApiGatewayConfig,
  ApiVersion,
  HttpMethod,
} from './types';
import { ServiceCapability, ServiceDependencies } from '../services/types';
import { RouteRegistryImpl } from './RouteRegistry';
import { RequestHandlerImpl } from './RequestHandler';
import { AuthManagerImpl } from './AuthManager';
import { AuthorizationManagerImpl } from './AuthorizationManager';
import { RateLimiterImpl } from './RateLimiter';

/**
 * API gateway service implementation
 */
export class ApiGatewayServiceImpl extends BaseModularService implements ApiGatewayService {
  /**
   * Route registry
   */
  private readonly routeRegistry: RouteRegistryImpl;
  
  /**
   * Request handler
   */
  private readonly requestHandler: RequestHandlerImpl;
  
  /**
   * Authentication manager
   */
  private readonly authManager: AuthManagerImpl;
  
  /**
   * Authorization manager
   */
  private readonly authorizationManager: AuthorizationManagerImpl;
  
  /**
   * Rate limiter
   */
  private readonly rateLimiter: RateLimiterImpl;
  
  /**
   * API gateway configuration
   */
  private config: ApiGatewayConfig = {
    basePath: '/api',
    defaultVersion: 'v1',
    cors: {
      enabled: true,
      allowedOrigins: ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
      maxAge: 86400,
      allowCredentials: true,
    },
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      max: 60,
      message: 'Too many requests, please try again later',
      statusCode: 429,
    },
    auth: {
      enabled: true,
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiration: 3600,
      jwtRefreshExpiration: 86400 * 7,
    },
    logging: {
      enabled: true,
      level: 'info',
      format: 'json',
      requests: true,
      responses: true,
    },
    docs: {
      enabled: true,
      path: '/docs',
      title: 'Manufacturing Intelligence Platform API',
      description: 'API for the Hybrid Manufacturing Intelligence Platform',
      version: '1.0.0',
    },
  };
  
  /**
   * Create a new API gateway service
   */
  constructor() {
    // Define capabilities
    const capabilities: ServiceCapability[] = [
      {
        name: 'api.routing',
        description: 'API routing and versioning',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'api.auth',
        description: 'API authentication and authorization',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'api.ratelimit',
        description: 'API rate limiting',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'api.docs',
        description: 'API documentation',
        version: '1.0.0',
        enabled: true,
      },
    ];
    
    // Define dependencies
    const dependencies: ServiceDependencies = {
      required: [],
      optional: ['events'],
    };
    
    super('ApiGatewayService', '1.0.0', dependencies, capabilities);
    
    // Create components
    this.routeRegistry = new RouteRegistryImpl();
    this.requestHandler = new RequestHandlerImpl();
    this.authManager = new AuthManagerImpl();
    this.authorizationManager = new AuthorizationManagerImpl();
    this.rateLimiter = new RateLimiterImpl();
  }
  
  /**
   * Initialize the service
   */
  protected async doInitialize(): Promise<void> {
    // Update config from environment variables
    this.updateConfigFromEnv();
    
    // Initialize components
    await this.routeRegistry.initialize(this.config);
    await this.requestHandler.initialize(this.config);
    await this.authManager.initialize(this.config);
    await this.authorizationManager.initialize(this.config);
    await this.rateLimiter.initialize(this.config);
    
    // Register core middlewares
    this.registerCoreMiddlewares();
    
    // Register documentation routes
    if (this.config.docs && this.config.docs.enabled) {
      this.registerDocumentationRoutes();
    }
    
    console.log('API gateway service initialized');
  }
  
  /**
   * Start the service
   */
  protected async doStart(): Promise<void> {
    // Start components
    await this.routeRegistry.start();
    await this.requestHandler.start();
    await this.authManager.start();
    await this.authorizationManager.start();
    await this.rateLimiter.start();
    
    console.log('API gateway service started');
  }
  
  /**
   * Stop the service
   */
  protected async doStop(): Promise<void> {
    // Stop components
    await this.routeRegistry.stop();
    await this.requestHandler.stop();
    await this.authManager.stop();
    await this.authorizationManager.stop();
    await this.rateLimiter.stop();
    
    console.log('API gateway service stopped');
  }
  
  /**
   * Get the route registry
   */
  public getRouteRegistry(): RouteRegistry {
    return this.routeRegistry;
  }
  
  /**
   * Get the request handler
   */
  public getRequestHandler(): RequestHandler {
    return this.requestHandler;
  }
  
  /**
   * Get the authentication manager
   */
  public getAuthManager(): AuthManager {
    return this.authManager;
  }
  
  /**
   * Get the authorization manager
   */
  public getAuthorizationManager(): AuthorizationManager {
    return this.authorizationManager;
  }
  
  /**
   * Get the rate limiter
   */
  public getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
  
  /**
   * Process an API request
   * @param req API request
   * @param res API response
   */
  public async processRequest(req: ApiRequest, res: ApiResponse): Promise<void> {
    try {
      // Set default version if not specified
      if (!req.version) {
        req.version = this.config.defaultVersion || 'v1';
      }
      
      // Find matching route
      const routeMatch = this.routeRegistry.findRoute(req.path, req.method, req.version);
      
      if (!routeMatch) {
        // No matching route found
        res.error(404, 'Not Found', `No route found for ${req.method} ${req.path}`);
        return;
      }
      
      // Set path parameters in request
      req.params = routeMatch.params;
      
      // Check if route requires authentication
      if (routeMatch.route.requiresAuth) {
        // Authenticate request
        const authenticated = await this.authManager.authenticate(req);
        
        if (!authenticated) {
          res.error(401, 'Unauthorized', 'Authentication required');
          return;
        }
        
        // Authorize request
        const authorized = await this.authorizationManager.authorize(req, routeMatch.route);
        
        if (!authorized) {
          res.error(403, 'Forbidden', 'Insufficient permissions');
          return;
        }
      }
      
      // Check rate limit
      if (this.config.rateLimit && this.config.rateLimit.enabled) {
        const limit = routeMatch.route.rateLimit || this.config.rateLimit.max;
        
        const withinLimit = await this.rateLimiter.checkLimit(req, limit);
        
        if (!withinLimit) {
          res.error(
            this.config.rateLimit.statusCode || 429,
            'Too Many Requests',
            this.config.rateLimit.message || 'Rate limit exceeded'
          );
          return;
        }
        
        // Add rate limit headers
        const limitStatus = await this.rateLimiter.getLimitStatus(req.ip || req.id);
        
        res.header('X-Rate-Limit-Limit', limitStatus.limit.toString());
        res.header('X-Rate-Limit-Remaining', limitStatus.remaining.toString());
        res.header('X-Rate-Limit-Reset', Math.floor(limitStatus.reset.getTime() / 1000).toString());
      }
      
      // Handle request
      await this.requestHandler.handleRequest(req, res, routeMatch.route);
    } catch (error) {
      // Handle error
      this.handleError(
        {
          status: 500,
          message: 'Internal Server Error',
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        req,
        res
      );
    }
  }
  
  /**
   * Register a service API
   * @param serviceName Service name
   * @param routes Service routes
   */
  public registerServiceApi(serviceName: string, routes: ApiRoute[]): void {
    // Add service name to route tags
    const serviceRoutes = routes.map(route => ({
      ...route,
      tags: [...(route.tags || []), serviceName],
    }));
    
    // Register routes
    this.routeRegistry.registerRoutes(serviceRoutes);
    
    console.log(`Registered ${routes.length} routes for service: ${serviceName}`);
  }
  
  /**
   * Handle an API error
   * @param error Error to handle
   * @param req API request
   * @param res API response
   */
  public handleError(error: ApiError, req: ApiRequest, res: ApiResponse): void {
    // Log error
    console.error(`API error (${req.method} ${req.path}):`, error);
    
    // Send error response
    res.error(error.status || 500, error.message, error.details);
  }
  
  /**
   * Update configuration from environment variables
   */
  private updateConfigFromEnv(): void {
    // Base path
    if (process.env.API_BASE_PATH) {
      this.config.basePath = process.env.API_BASE_PATH;
    }
    
    // Default version
    if (process.env.API_DEFAULT_VERSION) {
      this.config.defaultVersion = process.env.API_DEFAULT_VERSION as ApiVersion;
    }
    
    // CORS
    if (process.env.API_CORS_ENABLED) {
      this.config.cors!.enabled = process.env.API_CORS_ENABLED === 'true';
    }
    
    // Rate limiting
    if (process.env.API_RATE_LIMIT_ENABLED) {
      this.config.rateLimit!.enabled = process.env.API_RATE_LIMIT_ENABLED === 'true';
    }
    
    if (process.env.API_RATE_LIMIT_MAX) {
      this.config.rateLimit!.max = parseInt(process.env.API_RATE_LIMIT_MAX, 10);
    }
    
    // Auth
    if (process.env.API_AUTH_ENABLED) {
      this.config.auth!.enabled = process.env.API_AUTH_ENABLED === 'true';
    }
    
    if (process.env.JWT_SECRET) {
      this.config.auth!.jwtSecret = process.env.JWT_SECRET;
    }
  }
  
  /**
   * Register core middlewares
   */
  private registerCoreMiddlewares(): void {
    // CORS middleware
    if (this.config.cors && this.config.cors.enabled) {
      this.requestHandler.registerMiddleware(this.corsMiddleware.bind(this), 'pre');
    }
    
    // Logging middleware
    if (this.config.logging && this.config.logging.enabled) {
      this.requestHandler.registerMiddleware(this.loggingMiddleware.bind(this), 'pre');
    }
  }
  
  /**
   * CORS middleware
   * @param req API request
   * @param res API response
   * @param next Next function
   */
  private async corsMiddleware(
    req: ApiRequest,
    res: ApiResponse,
    next: () => Promise<void>
  ): Promise<void> {
    // Get CORS config
    const cors = this.config.cors!;
    
    // Set CORS headers
    if (cors.allowedOrigins.includes('*')) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (req.headers.origin && cors.allowedOrigins.includes(req.headers.origin)) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
    }
    
    if (cors.allowCredentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (cors.maxAge) {
      res.header('Access-Control-Max-Age', cors.maxAge.toString());
    }
    
    res.header('Access-Control-Allow-Methods', cors.allowedMethods.join(', '));
    res.header('Access-Control-Allow-Headers', cors.allowedHeaders.join(', '));
    res.header('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    // Continue to next middleware
    await next();
  }
  
  /**
   * Logging middleware
   * @param req API request
   * @param res API response
   * @param next Next function
   */
  private async loggingMiddleware(
    req: ApiRequest,
    res: ApiResponse,
    next: () => Promise<void>
  ): Promise<void> {
    // Log request
    if (this.config.logging!.requests) {
      console.log(`API request: ${req.method} ${req.path} (${req.version})`);
    }
    
    // Record start time
    const startTime = Date.now();
    
    // Continue to next middleware
    await next();
    
    // Log response
    if (this.config.logging!.responses) {
      const duration = Date.now() - startTime;
      console.log(`API response: ${res.getStatus()} (${duration}ms)`);
    }
  }
  
  /**
   * Register documentation routes
   */
  private registerDocumentationRoutes(): void {
    // Register route for OpenAPI JSON
    this.routeRegistry.registerRoute({
      path: `${this.config.basePath}${this.config.docs!.path}/openapi.json`,
      method: 'GET',
      version: 'v1',
      handler: async (req, res) => {
        const documentation = this.routeRegistry.generateDocumentation('json');
        res.header('Content-Type', 'application/json');
        res.json(JSON.parse(documentation));
      },
      description: 'Get OpenAPI documentation in JSON format',
      tags: ['documentation'],
    });
    
    // Register route for OpenAPI YAML
    this.routeRegistry.registerRoute({
      path: `${this.config.basePath}${this.config.docs!.path}/openapi.yaml`,
      method: 'GET',
      version: 'v1',
      handler: async (req, res) => {
        const documentation = this.routeRegistry.generateDocumentation('yaml');
        res.header('Content-Type', 'text/yaml');
        res.text(documentation);
      },
      description: 'Get OpenAPI documentation in YAML format',
      tags: ['documentation'],
    });
    
    // Register route for HTML documentation
    this.routeRegistry.registerRoute({
      path: `${this.config.basePath}${this.config.docs!.path}`,
      method: 'GET',
      version: 'v1',
      handler: async (req, res) => {
        const documentation = this.routeRegistry.generateDocumentation('html');
        res.header('Content-Type', 'text/html');
        res.text(documentation);
      },
      description: 'Get API documentation in HTML format',
      tags: ['documentation'],
    });
  }
  
  /**
   * Create a standard API request object
   * @param method HTTP method
   * @param path Request path
   * @param version API version
   * @param query Query parameters
   * @param body Request body
   * @param headers Request headers
   */
  public createRequest(
    method: HttpMethod,
    path: string,
    version: ApiVersion = 'v1',
    query: Record<string, any> = {},
    body: any = {},
    headers: Record<string, string> = {}
  ): ApiRequest {
    return {
      id: uuidv4(),
      path,
      method,
      version,
      params: {},
      query,
      body,
      headers,
      timestamp: new Date(),
    };
  }
  
  /**
   * Create a standard API response object
   */
  public createResponse(): ApiResponse {
    let statusCode = 0;
    const headers: Record<string, string> = {};
    
    const response: ApiResponse = {
      status(code) {
        statusCode = code;
        return response;
      },
      
      header(name, value) {
        headers[name] = value;
        return response;
      },
      
      json(body) {
        if (statusCode === 0) {
          statusCode = 200;
        }
        
        console.log(`Sending JSON response: ${statusCode}`);
      },
      
      text(body) {
        if (statusCode === 0) {
          statusCode = 200;
        }
        
        console.log(`Sending text response: ${statusCode}`);
      },
      
      error(status, message, details) {
        statusCode = status;
        console.log(`Sending error response: ${status} - ${message}`);
      },
      
      stream(stream) {
        if (statusCode === 0) {
          statusCode = 200;
        }
        
        console.log(`Sending stream response: ${statusCode}`);
      },
      
      end() {
        if (statusCode === 0) {
          statusCode = 204;
        }
        
        console.log(`Ending response: ${statusCode}`);
      },
      
      getStatus() {
        return statusCode;
      },
      
      getHeaders() {
        return { ...headers };
      },
    };
    
    return response;
  }
  
  /**
   * Get service description
   */
  protected async getServiceDescription(): Promise<string> {
    return `
The API Gateway Service provides a centralized entry point for API requests,
with features like routing, versioning, authentication, authorization, and rate limiting.
It supports OpenAPI documentation and CORS.
`;
  }
  
  /**
   * Get API documentation
   */
  protected async getApiDocumentation(): Promise<string> {
    return `
## API Gateway Service API

### Register Service API
\`\`\`
POST /api/gateway/services
Body: {
  serviceName: string,
  routes: ApiRoute[]
}
\`\`\`

### Get API Documentation
\`\`\`
GET /api/docs
GET /api/docs/openapi.json
GET /api/docs/openapi.yaml
\`\`\`

### Authenticate
\`\`\`
POST /api/auth/login
Body: {
  username: string,
  password: string
}
\`\`\`

### Refresh Token
\`\`\`
POST /api/auth/refresh
Body: {
  refreshToken: string
}
\`\`\`
`;
  }
}