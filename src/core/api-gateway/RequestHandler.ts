/**
 * Request Handler Implementation
 * 
 * This class implements the RequestHandler interface and provides
 * functionality for processing API requests.
 */

import { AbstractBaseService } from '../architecture/BaseService';
import { RequestHandler } from './interfaces';
import {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  MiddlewareFunction,
} from './types';

/**
 * Request handler implementation
 */
export class RequestHandlerImpl extends AbstractBaseService implements RequestHandler {
  /**
   * Pre-request middlewares
   */
  private preMiddlewares: MiddlewareFunction[] = [];
  
  /**
   * Post-request middlewares
   */
  private postMiddlewares: MiddlewareFunction[] = [];
  
  /**
   * Create a new request handler
   */
  constructor() {
    super('RequestHandler', '1.0.0');
  }
  
  /**
   * Initialize the handler
   */
  protected async doInitialize(): Promise<void> {
    // Clear middlewares
    this.preMiddlewares = [];
    this.postMiddlewares = [];
    
    console.log('Request handler initialized');
  }
  
  /**
   * Start the handler
   */
  protected async doStart(): Promise<void> {
    console.log('Request handler started');
  }
  
  /**
   * Stop the handler
   */
  protected async doStop(): Promise<void> {
    console.log('Request handler stopped');
  }
  
  /**
   * Handle an API request
   * @param req API request
   * @param res API response
   * @param route Matched route
   */
  public async handleRequest(
    req: ApiRequest,
    res: ApiResponse,
    route: ApiRoute
  ): Promise<void> {
    try {
      // Apply pre-request middlewares
      const preResult = await this.applyMiddleware(req, res, this.preMiddlewares);
      
      // If any middleware ended the response, stop processing
      if (!preResult) {
        return;
      }
      
      // Apply route-specific middlewares
      if (route.middleware && route.middleware.length > 0) {
        const routeResult = await this.applyMiddleware(req, res, route.middleware);
        
        // If any middleware ended the response, stop processing
        if (!routeResult) {
          return;
        }
      }
      
      // Execute route handler
      await route.handler(req, res);
      
      // Apply post-request middlewares
      // Only if the response hasn't been sent yet
      if (res.getStatus() === 0) {
        await this.applyMiddleware(req, res, this.postMiddlewares);
      }
    } catch (error) {
      // Handle error
      console.error(`Error handling request: ${error instanceof Error ? error.message : String(error)}`);
      
      // Send error response
      res.error(
        500,
        'Internal Server Error',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  /**
   * Register a middleware function
   * @param middleware Middleware function
   * @param position Position in middleware chain
   */
  public registerMiddleware(
    middleware: MiddlewareFunction,
    position: 'pre' | 'post' = 'pre'
  ): void {
    if (position === 'pre') {
      this.preMiddlewares.push(middleware);
    } else {
      this.postMiddlewares.push(middleware);
    }
    
    console.log(`Middleware registered at ${position} position`);
  }
  
  /**
   * Apply middleware to a request
   * @param req API request
   * @param res API response
   * @param middlewares Middleware functions to apply
   */
  public async applyMiddleware(
    req: ApiRequest,
    res: ApiResponse,
    middlewares: MiddlewareFunction[]
  ): Promise<boolean> {
    // If no middlewares, return true
    if (!middlewares || middlewares.length === 0) {
      return true;
    }
    
    // Apply middlewares in sequence
    for (const middleware of middlewares) {
      // Skip if response has already been sent
      if (res.getStatus() !== 0) {
        return false;
      }
      
      let nextCalled = false;
      let middlewareError: Error | null = null;
      
      try {
        // Execute middleware
        await middleware(req, res, async () => {
          nextCalled = true;
        });
      } catch (error) {
        middlewareError = error instanceof Error ? error : new Error(String(error));
      }
      
      // If middleware didn't call next or threw an error, stop processing
      if (!nextCalled || middlewareError) {
        if (middlewareError) {
          console.error(`Middleware error: ${middlewareError.message}`);
          
          // Send error response if not already sent
          if (res.getStatus() === 0) {
            res.error(
              500,
              'Internal Server Error',
              middlewareError.message
            );
          }
        }
        
        return false;
      }
    }
    
    return true;
  }
}