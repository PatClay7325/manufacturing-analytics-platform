import { apiConfig } from '@/config/api';

// HTTP request methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// HTTP error types
export class HttpError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(status: number, statusText: string, message?: string, data?: unknown) {
    super(message || `HTTP Error ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class NetworkError extends Error {
  constructor(message?: string) {
    super(message || 'Network error occurred');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message || 'Request timed out');
    this.name = 'TimeoutError';
  }
}

// Request options
export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  data?: unknown;
  timeout?: number;
  withCredentials?: boolean;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP client for making API requests
 * 
 * Features:
 * - Request timeouts
 * - Automatic retries
 * - Error handling and standardized errors
 * - Query parameter serialization
 * - JSON request/response handling
 * - Authentication token handling
 */
export class HttpClient {
  private baseUrl: string;
  private defaultOptions: RequestInit;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(
    baseUrl: string = apiConfig.baseUrl,
    defaultHeaders: Record<string, string> = apiConfig.headers,
    defaultOptions: RequestInit = apiConfig.defaultOptions,
    defaultTimeout: number = apiConfig.timeout
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
    this.defaultOptions = defaultOptions;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Create a URL with query parameters
   */
  private createUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    let fullUrl: string;
    
    if (endpoint.startsWith('http')) {
      fullUrl = endpoint;
    } else {
      // For relative URLs, combine with base URL
      if (this.baseUrl.startsWith('http')) {
        fullUrl = `${this.baseUrl}${endpoint}`;
      } else {
        // If baseUrl is also relative, use current origin
        if (typeof window !== 'undefined') {
          fullUrl = `${window.location.origin}${this.baseUrl}${endpoint}`;
        } else {
          // Server-side fallback
          fullUrl = `http://localhost:3000${this.baseUrl}${endpoint}`;
        }
      }
    }
    
    // If no params, return the URL as-is
    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }
    
    // Add query parameters manually to avoid URL constructor issues
    const queryParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return queryParams ? `${fullUrl}?${queryParams}` : fullUrl;
  }

  /**
   * Get the authentication token
   */
  private getAuthToken(): string | null {
    // In a real application, this would get the token from localStorage, cookies, or state management
    return localStorage.getItem('authToken');
  }

  /**
   * Add authentication headers if a token exists
   */
  private addAuthHeaders(headers: HeadersInit): HeadersInit {
    const token = this.getAuthToken();
    
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    return headers;
  }

  /**
   * Handle fetch timeouts
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      // Set timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new TimeoutError());
      }, timeout);
      
      // Make the fetch request
      fetch(url, {
        ...options,
        signal: controller.signal
      })
        .then(resolve)
        .catch(error => {
          // Handle specific abort error as timeout
          if (error.name === 'AbortError') {
            reject(new TimeoutError());
          } else if (error.message && error.message.includes('NetworkError')) {
            reject(new NetworkError());
          } else {
            reject(error);
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });
  }

  /**
   * Process the API response
   */
  private async processResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      throw new HttpError(
        response.status,
        response.statusText,
        data?.message || response.statusText,
        data
      );
    }
    
    return data;
  }

  /**
   * Execute a request with retries
   */
  private async executeRequest(
    method: HttpMethod,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<unknown> {
    const {
      params,
      data,
      timeout = this.defaultTimeout,
      retries = 3,
      retryDelay = 1000,
      withCredentials = false,
      ...fetchOptions
    } = options;
    
    // Prepare URL with query parameters
    const url = this.createUrl(endpoint, params);
    
    // Prepare headers
    let headers: HeadersInit = {
      ...this.defaultHeaders,
      ...fetchOptions.headers
    };
    
    // Add auth headers if needed
    headers = this.addAuthHeaders(headers);
    
    // Prepare request options
    const requestOptions: RequestInit = {
      ...this.defaultOptions,
      ...fetchOptions,
      method,
      headers,
      credentials: 'include' // Always include credentials for cookies
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && data !== undefined) {
      requestOptions.body = JSON.stringify(data);
    }
    
    // Execute request with retries
    let lastError: Error | null = null;
    let attempts = 0;
    
    while (attempts <= retries) {
      try {
        const response = await this.fetchWithTimeout(url, requestOptions, timeout);
        return await this.processResponse(response);
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors or 5xx server errors
        if (
          error instanceof NetworkError ||
          (error instanceof HttpError && error.status >= 500)
        ) {
          if (attempts < retries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempts + 1)));
            attempts++;
            continue;
          }
        }
        
        // Don't retry for other errors
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * GET request
   */
  public async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest('GET', endpoint, options) as Promise<T>;
  }

  /**
   * POST request
   */
  public async post<T = unknown, D = unknown>(endpoint: string, data?: D, options?: RequestOptions): Promise<T> {
    return this.executeRequest('POST', endpoint, { ...options, data }) as Promise<T>;
  }

  /**
   * PUT request
   */
  public async put<T = unknown, D = unknown>(endpoint: string, data?: D, options?: RequestOptions): Promise<T> {
    return this.executeRequest('PUT', endpoint, { ...options, data }) as Promise<T>;
  }

  /**
   * PATCH request
   */
  public async patch<T = unknown, D = unknown>(endpoint: string, data?: D, options?: RequestOptions): Promise<T> {
    return this.executeRequest('PATCH', endpoint, { ...options, data }) as Promise<T>;
  }

  /**
   * DELETE request
   */
  public async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest('DELETE', endpoint, options) as Promise<T>;
  }
}

// Create and export a default instance
const httpClient = new HttpClient();
export default httpClient;