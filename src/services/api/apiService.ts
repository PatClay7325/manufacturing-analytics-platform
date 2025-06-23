import httpClient, { HttpError, NetworkError, TimeoutError, RequestOptions } from '@/lib/httpClient';
import cacheManager, { CacheOptions } from '@/lib/cacheManager';
import { getResourceUrl, apiConfig } from '@/config/api';

/**
 * Interface for API request options
 */
export interface ApiRequestOptions extends Omit<RequestOptions, 'cache'> {
  cache?: boolean | Partial<CacheOptions>;
  resource?: string;
  endpoint?: string;
}

/**
 * Error types for API requests
 */
export { HttpError, NetworkError, TimeoutError };

/**
 * Generic API error class
 */
export class ApiError extends Error {
  code: string;
  status?: number;
  data?: unknown;

  constructor(message: string, code: string = 'API_ERROR', status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/**
 * API Service for making requests to the backend
 * 
 * This service adds:
 * - Consistent error handling
 * - Response caching
 * - Resource URL generation
 * - Response transformation
 */
export class ApiService {
  /**
   * Create a URL for a resource endpoint
   */
  private getUrl(options: ApiRequestOptions): string {
    // If endpoint is a full URL, use it directly
    if (options.endpoint && options.endpoint.startsWith('http')) {
      return options.endpoint;
    }
    
    // If resource and endpoint are provided, combine them
    if (options.resource && options.endpoint) {
      return getResourceUrl(options.resource as keyof typeof apiConfig.endpoints, options.endpoint);
    }
    
    // If only resource is provided, use the resource URL
    if (options.resource) {
      return getResourceUrl(options.resource as keyof typeof apiConfig.endpoints);
    }
    
    // Otherwise, use the endpoint as is
    if (options.endpoint) {
      return options.endpoint;
    }
    
    throw new Error('Either resource or endpoint must be provided');
  }

  /**
   * Transform API error to a standardized format
   */
  private handleError(error: unknown): never {
    if (error instanceof HttpError) {
      // Handle specific HTTP error status codes
      switch (error.status) {
        case 401:
          throw new ApiError('Unauthorized: Please log in', 'UNAUTHORIZED', error.status, error.data);
        case 403:
          throw new ApiError('Forbidden: Access denied', 'FORBIDDEN', error.status, error.data);
        case 404:
          throw new ApiError('Not found', 'NOT_FOUND', error.status, error.data);
        case 429:
          throw new ApiError('Too many requests', 'RATE_LIMIT_EXCEEDED', error.status, error.data);
        default:
          if (error.status >= 500) {
            throw new ApiError('Server error', 'SERVER_ERROR', error.status, error.data as unknown);
          }
          throw new ApiError(error.message, 'HTTP_ERROR', error.status, error.data as unknown);
      }
    } else if (error instanceof NetworkError) {
      throw new ApiError('Network error: Please check your connection', 'NETWORK_ERROR');
    } else if (error instanceof TimeoutError) {
      throw new ApiError('Request timed out', 'TIMEOUT');
    } else {
      throw new ApiError((error as Error).message || 'An unknown error occurred', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(options: ApiRequestOptions): Promise<T> {
    const url = this.getUrl(options);
    const { cache, params, resource, endpoint, ...fetchOptions } = options;
    
    try {
      // Handle caching
      if (cache) {
        const cacheOptions = typeof cache === 'object' ? cache : {};
        
        return await cacheManager.fetchWithCache<T>(
          () => httpClient.get<T>(url, { params, ...fetchOptions }),
          url,
          cacheOptions,
          params
        );
      }
      
      // No caching, just fetch
      return await httpClient.get<T>(url, { params, ...fetchOptions });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a POST request
   */
  async post<T = unknown, D = unknown>(options: ApiRequestOptions, data?: D): Promise<T> {
    const url = this.getUrl(options);
    const { cache, params, resource, endpoint, ...fetchOptions } = options;
    
    try {
      return await httpClient.post<T>(url, data, { params, ...fetchOptions });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown, D = unknown>(options: ApiRequestOptions, data?: D): Promise<T> {
    const url = this.getUrl(options);
    const { cache, params, resource, endpoint, ...fetchOptions } = options;
    
    try {
      return await httpClient.put<T>(url, data, { params, ...fetchOptions });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown, D = unknown>(options: ApiRequestOptions, data?: D): Promise<T> {
    const url = this.getUrl(options);
    const { cache, params, resource, endpoint, ...fetchOptions } = options;
    
    try {
      return await httpClient.patch<T>(url, data, { params, ...fetchOptions });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(options: ApiRequestOptions): Promise<T> {
    const url = this.getUrl(options);
    const { cache, params, resource, endpoint, ...fetchOptions } = options;
    
    try {
      return await httpClient.delete<T>(url, { params, ...fetchOptions });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Clear the cache for a specific resource
   */
  clearResourceCache(resource: string): void {
    cacheManager.clearByPrefix(getResourceUrl(resource as keyof typeof apiConfig.endpoints));
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    cacheManager.clear();
  }
}

// Create and export a default instance
const apiService = new ApiService();
export default apiService;
