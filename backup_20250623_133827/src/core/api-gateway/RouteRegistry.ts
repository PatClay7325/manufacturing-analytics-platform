/**
 * Route Registry Implementation
 * 
 * This class implements the RouteRegistry interface and provides
 * functionality for managing API routes and versioning.
 */

import { AbstractBaseService } from './architecture/BaseService';
import { RouteRegistry } from './interfaces';
import {
  ApiRoute,
  ApiVersion,
  HttpMethod,
  RouteParam,
} from './types';

/**
 * Pattern for matching route parameters (e.g., /:id/)
 */
const PARAM_PATTERN = /:[a-zA-Z0-9_]+/g;

/**
 * Route registry implementation
 */
export class RouteRegistryImpl extends AbstractBaseService implements RouteRegistry {
  /**
   * Routes by version
   */
  private routesByVersion: Map<ApiVersion, ApiRoute[]> = new Map();
  
  /**
   * Create a new route registry
   */
  constructor() {
    super('RouteRegistry', '1.0.0');
    
    // Initialize route maps for each version
    this.routesByVersion.set('v1', []);
    this.routesByVersion.set('v2', []);
    this.routesByVersion.set('v3', []);
    this.routesByVersion.set('latest', []);
  }
  
  /**
   * Initialize the registry
   */
  protected async doInitialize(): Promise<void> {
    // Clear routes
    this.routesByVersion.forEach((routes, version) => {
      this.routesByVersion.set(version, []);
    });
    
    console.log('Route registry initialized');
  }
  
  /**
   * Start the registry
   */
  protected async doStart(): Promise<void> {
    console.log('Route registry started');
  }
  
  /**
   * Stop the registry
   */
  protected async doStop(): Promise<void> {
    console.log('Route registry stopped');
  }
  
  /**
   * Register a new route
   * @param route Route to register
   */
  public registerRoute(route: ApiRoute): void {
    // Validate route
    this.validateRoute(route);
    
    // Add route to the appropriate version
    const routes = this.routesByVersion.get(route.version) || [];
    routes.push({ ...route });
    this.routesByVersion.set(route.version, routes);
    
    // If this is the latest version, add to 'latest' as well
    if (route.version === 'v3') {
      const latestRoutes = this.routesByVersion.get('latest') || [];
      latestRoutes.push({ ...route, version: 'latest' });
      this.routesByVersion.set('latest', latestRoutes);
    }
    
    console.log(`Route registered: ${route.method} ${route.path} (${route.version})`);
  }
  
  /**
   * Register multiple routes
   * @param routes Routes to register
   */
  public registerRoutes(routes: ApiRoute[]): void {
    routes.forEach(route => this.registerRoute(route));
  }
  
  /**
   * Get all registered routes
   */
  public getRoutes(): ApiRoute[] {
    // Combine routes from all versions
    const allRoutes: ApiRoute[] = [];
    
    this.routesByVersion.forEach((routes) => {
      allRoutes.push(...routes);
    });
    
    return allRoutes;
  }
  
  /**
   * Get routes for a specific version
   * @param version API version
   */
  public getRoutesByVersion(version: ApiVersion): ApiRoute[] {
    return this.routesByVersion.get(version) || [];
  }
  
  /**
   * Find a route that matches the request
   * @param path Request path
   * @param method HTTP method
   * @param version API version
   */
  public findRoute(
    path: string,
    method: HttpMethod,
    version: ApiVersion
  ): { route: ApiRoute; params: Record<string, any> } | null {
    // Get routes for the specified version
    const routes = this.routesByVersion.get(version) || [];
    
    // Find a matching route
    for (const route of routes) {
      if (route.method !== method) {
        continue;
      }
      
      const { match, params } = this.matchRoutePath(route.path, path);
      
      if (match) {
        return { route, params };
      }
    }
    
    return null;
  }
  
  /**
   * Generate route documentation
   * @param format Documentation format
   */
  public generateDocumentation(format: 'json' | 'yaml' | 'html'): string {
    // Get all routes
    const allRoutes = this.getRoutes();
    
    // Group routes by tag
    const routesByTag: Record<string, ApiRoute[]> = {};
    
    allRoutes.forEach(route => {
      const tags = route.tags || ['default'];
      
      tags.forEach(tag => {
        if (!routesByTag[tag]) {
          routesByTag[tag] = [];
        }
        
        routesByTag[tag].push(route);
      });
    });
    
    // Generate documentation based on format
    switch (format) {
      case 'json':
        return this.generateJsonDocumentation(routesByTag);
      
      case 'yaml':
        return this.generateYamlDocumentation(routesByTag);
      
      case 'html':
        return this.generateHtmlDocumentation(routesByTag);
      
      default:
        throw new Error(`Unsupported documentation format: ${format}`);
    }
  }
  
  /**
   * Validate a route
   * @param route Route to validate
   */
  private validateRoute(route: ApiRoute): void {
    // Check required fields
    if (!route.path) {
      throw new Error('Route path is required');
    }
    
    if (!route.method) {
      throw new Error('Route method is required');
    }
    
    if (!route.version) {
      throw new Error('Route version is required');
    }
    
    if (!route.handler) {
      throw new Error('Route handler is required');
    }
    
    // Check for parameter name conflicts
    const pathParamNames = this.extractPathParamNames(route.path);
    const allParamNames = new Set<string>();
    
    // Check path parameters
    if (route.params) {
      route.params.forEach(param => {
        if (allParamNames.has(param.name)) {
          throw new Error(`Duplicate parameter name: ${param.name}`);
        }
        
        allParamNames.add(param.name);
        
        if (!pathParamNames.includes(param.name)) {
          throw new Error(`Path parameter ${param.name} not found in route path`);
        }
      });
    }
    
    // Check query parameters
    if (route.queryParams) {
      route.queryParams.forEach(param => {
        if (allParamNames.has(param.name)) {
          throw new Error(`Duplicate parameter name: ${param.name}`);
        }
        
        allParamNames.add(param.name);
      });
    }
    
    // Check body parameters
    if (route.bodyParams) {
      route.bodyParams.forEach(param => {
        if (allParamNames.has(param.name)) {
          throw new Error(`Duplicate parameter name: ${param.name}`);
        }
        
        allParamNames.add(param.name);
      });
    }
  }
  
  /**
   * Extract path parameter names from a route path
   * @param path Route path
   */
  private extractPathParamNames(path: string): string[] {
    const paramNames: string[] = [];
    const matches = path.match(PARAM_PATTERN);
    
    if (matches) {
      matches.forEach(match => {
        // Remove the ':' prefix
        const paramName = match.substring(1);
        paramNames.push(paramName);
      });
    }
    
    return paramNames;
  }
  
  /**
   * Match a route path against a request path
   * @param routePath Route path pattern
   * @param requestPath Request path
   */
  private matchRoutePath(
    routePath: string,
    requestPath: string
  ): { match: boolean; params: Record<string, any> } {
    // Split paths into segments
    const routeSegments = routePath.split('/').filter(Boolean);
    const requestSegments = requestPath.split('/').filter(Boolean);
    
    // If segment counts don't match, paths don't match
    if (routeSegments.length !== requestSegments.length) {
      return { match: false, params: {} };
    }
    
    const params: Record<string, any> = {};
    
    // Compare segments
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];
      
      // Check if route segment is a parameter
      if (routeSegment.startsWith(':')) {
        // Extract parameter name (remove ':' prefix)
        const paramName = routeSegment.substring(1);
        
        // Add parameter value to params
        params[paramName] = requestSegment;
        continue;
      }
      
      // If segments don't match, paths don't match
      if (routeSegment !== requestSegment) {
        return { match: false, params: {} };
      }
    }
    
    // If we got here, paths match
    return { match: true, params };
  }
  
  /**
   * Generate JSON documentation
   * @param routesByTag Routes grouped by tag
   */
  private generateJsonDocumentation(routesByTag: Record<string, ApiRoute[]>): string {
    const documentation = {
      openapi: '3.0.0',
      info: {
        title: 'Adaptive Factory AI Solutions API',
        version: '1.0.0',
        description: 'API for the Hybrid Manufacturing Intelligence Platform',
      },
      paths: this.generatePathsDocumentation(routesByTag),
      components: {
        schemas: this.generateSchemasDocumentation(),
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
    
    return JSON.stringify(documentation, null, 2);
  }
  
  /**
   * Generate YAML documentation
   * @param routesByTag Routes grouped by tag
   */
  private generateYamlDocumentation(routesByTag: Record<string, ApiRoute[]>): string {
    // For simplicity, we'll convert the JSON to YAML
    // In a real implementation, we would use a YAML library
    const jsonDoc = this.generateJsonDocumentation(routesByTag);
    
    // This is a placeholder implementation
    return `# YAML documentation would be generated here
# Based on the JSON documentation:
${jsonDoc}`;
  }
  
  /**
   * Generate HTML documentation
   * @param routesByTag Routes grouped by tag
   */
  private generateHtmlDocumentation(routesByTag: Record<string, ApiRoute[]>): string {
    // This is a placeholder implementation
    // In a real implementation, we would generate HTML using a template engine
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Adaptive Factory AI Solutions API</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 20px; }
    .endpoint { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
    .method { font-weight: bold; display: inline-block; padding: 5px; border-radius: 3px; color: white; }
    .method.get { background-color: #61affe; }
    .method.post { background-color: #49cc90; }
    .method.put { background-color: #fca130; }
    .method.delete { background-color: #f93e3e; }
    .path { font-family: monospace; margin-left: 10px; }
    .params { margin-top: 10px; }
    .param { margin-left: 20px; margin-bottom: 5px; }
  </style>
</head>
<body>
  <h1>Manufacturing Intelligence Platform API</h1>`;
    
    // Add sections for each tag
    for (const [tag, routes] of Object.entries(routesByTag)) {
      html += `
  <h2>${tag}</h2>`;
      
      // Add endpoints for each route
      for (const route of routes) {
        const methodClass = route.method.toLowerCase();
        
        html += `
  <div class="endpoint">
    <div>
      <span class="method ${methodClass}">${route.method}</span>
      <span class="path">${route.path}</span>
    </div>
    <div class="description">${route.description || ''}</div>
    
    <div class="params">
      <h3>Parameters</h3>`;
        
        // Add path parameters
        if (route.params && route.params.length > 0) {
          html += `
      <h4>Path Parameters</h4>`;
          
          for (const param of route.params) {
            html += `
      <div class="param">
        <span class="param-name">${param.name}</span>
        <span class="param-type">(${param.type})</span>
        ${param.required ? '<span class="param-required">required</span>' : ''}
        <div class="param-description">${param.description || ''}</div>
      </div>`;
          }
        }
        
        // Add query parameters
        if (route.queryParams && route.queryParams.length > 0) {
          html += `
      <h4>Query Parameters</h4>`;
          
          for (const param of route.queryParams) {
            html += `
      <div class="param">
        <span class="param-name">${param.name}</span>
        <span class="param-type">(${param.type})</span>
        ${param.required ? '<span class="param-required">required</span>' : ''}
        <div class="param-description">${param.description || ''}</div>
      </div>`;
          }
        }
        
        // Add body parameters
        if (route.bodyParams && route.bodyParams.length > 0) {
          html += `
      <h4>Body Parameters</h4>`;
          
          for (const param of route.bodyParams) {
            html += `
      <div class="param">
        <span class="param-name">${param.name}</span>
        <span class="param-type">(${param.type})</span>
        ${param.required ? '<span class="param-required">required</span>' : ''}
        <div class="param-description">${param.description || ''}</div>
      </div>`;
          }
        }
        
        html += `
    </div>
  </div>`;
      }
    }
    
    html += `
</body>
</html>`;
    
    return html;
  }
  
  /**
   * Generate paths documentation for OpenAPI
   * @param routesByTag Routes grouped by tag
   */
  private generatePathsDocumentation(routesByTag: Record<string, ApiRoute[]>): Record<string, any> {
    const paths: Record<string, any> = {};
    
    // Flatten routes
    const allRoutes = Object.values(routesByTag).flat();
    
    // Group routes by path
    const routesByPath: Record<string, ApiRoute[]> = {};
    
    allRoutes.forEach(route => {
      if (!routesByPath[route.path]) {
        routesByPath[route.path] = [];
      }
      
      routesByPath[route.path].push(route);
    });
    
    // Generate path documentation
    for (const [path, routes] of Object.entries(routesByPath)) {
      paths[path] = {};
      
      routes.forEach(route => {
        const method = route.method.toLowerCase();
        
        paths[path][method] = {
          summary: route.description || '',
          tags: route.tags || ['default'],
          parameters: this.generateParametersDocumentation(route),
          responses: {
            '200': {
              description: 'Successful response',
            },
            '400': {
              description: 'Bad request',
            },
            '401': {
              description: 'Unauthorized',
            },
            '403': {
              description: 'Forbidden',
            },
            '404': {
              description: 'Not found',
            },
            '500': {
              description: 'Internal server error',
            },
          },
        };
        
        // Add request body if there are body parameters
        if (route.bodyParams && route.bodyParams.length > 0) {
          paths[path][method].requestBody = {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: route.bodyParams.reduce((props, param) => {
                    props[param.name] = {
                      type: param.type,
                      description: param.description || '',
                    };
                    return props;
                  }, {} as Record<string, any>),
                  required: route.bodyParams
                    .filter(param => param.required)
                    .map(param => param.name),
                },
              },
            },
          };
        }
        
        // Add security if authentication is required
        if (route.requiresAuth) {
          paths[path][method].security = [
            {
              bearerAuth: [],
            },
          ];
        }
      });
    }
    
    return paths;
  }
  
  /**
   * Generate parameters documentation for OpenAPI
   * @param route API route
   */
  private generateParametersDocumentation(route: ApiRoute): any[] {
    const parameters: any[] = [];
    
    // Add path parameters
    if (route.params) {
      route.params.forEach(param => {
        parameters.push({
          name: param.name,
          in: 'path',
          required: true,
          description: param.description || '',
          schema: {
            type: param.type,
          },
        });
      });
    }
    
    // Add query parameters
    if (route.queryParams) {
      route.queryParams.forEach(param => {
        parameters.push({
          name: param.name,
          in: 'query',
          required: param.required,
          description: param.description || '',
          schema: {
            type: param.type,
          },
        });
      });
    }
    
    return parameters;
  }
  
  /**
   * Generate schemas documentation for OpenAPI
   */
  private generateSchemasDocumentation(): Record<string, any> {
    // This is a placeholder implementation
    // In a real implementation, we would generate schemas from models
    return {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'integer',
            description: 'HTTP status code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code',
          },
          details: {
            type: 'object',
            description: 'Error details',
          },
        },
        required: ['status', 'message'],
      },
    };
  }
}