/**
 * Fetch Manager with proper AbortController cleanup
 * Prevents EventTarget memory leaks from multiple AbortSignal instances
 */

export class FetchManager {
  private static instance: FetchManager;
  private controllers: Map<string, AbortController> = new Map();
  private maxControllers = 10;

  private constructor() {
    // Singleton
  }

  static getInstance(): FetchManager {
    if (!FetchManager.instance) {
      FetchManager.instance = new FetchManager();
    }
    return FetchManager.instance;
  }

  /**
   * Create a managed fetch with automatic cleanup
   */
  async fetch(
    url: string,
    options: RequestInit & { timeout?: number } = {},
    key?: string
  ): Promise<Response> {
    const fetchKey = key || `${url}-${Date.now()}`;
    
    // Clean up old controller if exists
    this.cleanup(fetchKey);
    
    // Create new controller
    const controller = new AbortController();
    this.controllers.set(fetchKey, controller);
    
    // Clean up old controllers if we exceed the limit
    if (this.controllers.size > this.maxControllers) {
      const oldestKey = this.controllers.keys().next().value;
      this.cleanup(oldestKey);
    }

    try {
      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, options.timeout);
      }

      // Merge signal with existing options
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      // Perform fetch
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      return response;
    } finally {
      // Always cleanup after fetch completes
      this.cleanup(fetchKey);
    }
  }

  /**
   * Cleanup a specific controller
   */
  private cleanup(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      try {
        // Abort if not already aborted
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        // Ignore abort errors
      }
      this.controllers.delete(key);
    }
  }

  /**
   * Cleanup all controllers
   */
  cleanupAll(): void {
    for (const key of Array.from(this.controllers.keys())) {
      this.cleanup(key);
    }
  }

  /**
   * Get active controller count
   */
  getActiveCount(): number {
    return this.controllers.size;
  }
}

// Export singleton instance
export const fetchManager = FetchManager.getInstance();

/**
 * Wrapper function for managed fetch with timeout
 */
export async function managedFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  return fetchManager.fetch(url, options);
}