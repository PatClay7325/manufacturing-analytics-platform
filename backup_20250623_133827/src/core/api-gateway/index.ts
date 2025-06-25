/**
 * API Gateway Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the API gateway.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export route registry
export * from './RouteRegistry';

// Export request handler
export * from './RequestHandler';

// Export authentication manager
export * from './AuthManager';

// Export authorization manager
export * from './AuthorizationManager';

// Export rate limiter
export * from './RateLimiter';

// Export API gateway service
export * from './ApiGatewayService';

// Export a function to initialize the API gateway
import { ApiGatewayServiceImpl } from './ApiGatewayService';

/**
 * Initialize the API gateway
 * @param config Optional configuration
 * @returns API gateway service instance
 */
export async function initializeApiGateway(
  config?: Record<string, unknown>
): Promise<ApiGatewayServiceImpl> {
  // Create API gateway service
  const apiGatewayService = new ApiGatewayServiceImpl();
  
  try {
    // Initialize API gateway service
    await apiGatewayService.initialize({
      environment: 'development',
      debug: true,
      logLevel: 'info',
      tracing: false,
      ...config,
    });
    
    // Start API gateway service
    await apiGatewayService.start();
    
    console.log('API gateway initialized');
    
    return apiGatewayService;
  } catch (error) {
    console.error('Error initializing API gateway:', error);
    throw error;
  }
}