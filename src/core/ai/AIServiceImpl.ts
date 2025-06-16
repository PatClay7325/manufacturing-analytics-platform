/**
 * AI Service Implementation
 * 
 * This class implements the AIService interface and provides
 * access to AI capabilities.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseModularService } from '../services/BaseModularService';
import { AIService, AIProvider } from './interfaces';
import { 
  AIModel, 
  AIRequestType,
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  TextCompletionRequest, 
  TextCompletionResponse, 
  EmbeddingRequest, 
  EmbeddingResponse,
  AICacheOptions,
  AICircuitBreakerOptions,
  AIRetryOptions
} from './types';
import { OllamaProvider } from './OllamaProvider';

/**
 * Simple in-memory cache implementation
 */
interface CacheEntry<T> {
  /**
   * Cache entry expiration timestamp
   */
  expiration: number;
  
  /**
   * Cached data
   */
  data: T;
}

/**
 * AI service implementation
 */
export class AIServiceImpl extends BaseModularService implements AIService {
  /**
   * List of registered providers
   */
  private providers: Map<string, AIProvider> = new Map();
  
  /**
   * Request cache
   */
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  
  /**
   * Cache options
   */
  private cacheOptions: AICacheOptions = {
    enabled: true,
    ttl: 3600, // 1 hour
    maxEntries: 1000,
  };
  
  /**
   * Circuit breaker options
   */
  private circuitBreakerOptions: AICircuitBreakerOptions = {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  };
  
  /**
   * Retry options
   */
  private retryOptions: AIRetryOptions = {
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2,
  };
  
  /**
   * Circuit breaker state
   */
  private circuitOpen: boolean = false;
  
  /**
   * Circuit breaker reset timeout
   */
  private circuitResetTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Failure counter for circuit breaker
   */
  private failureCounter: number = 0;
  
  /**
   * Create a new AI service
   */
  constructor() {
    // Define capabilities
    const capabilities = [
      {
        name: 'ai.chat',
        description: 'Chat completion capability',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'ai.completion',
        description: 'Text completion capability',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'ai.embedding',
        description: 'Text embedding capability',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'ai.caching',
        description: 'AI request caching',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'ai.resilience',
        description: 'AI request resilience (circuit breaker, retries)',
        version: '1.0.0',
        enabled: true,
      },
    ];
    
    // Define dependencies
    const dependencies = {
      required: [],
      optional: ['events'],
    };
    
    super('AIService', '1.0.0', dependencies, capabilities);
  }
  
  /**
   * Initialize the service
   */
  protected async doInitialize(): Promise<void> {
    // Initialize providers
    this.initializeProviders();
    
    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), 60000); // Cleanup every minute
    
    console.log('AI service initialized');
  }
  
  /**
   * Start the service
   */
  protected async doStart(): Promise<void> {
    console.log('AI service started');
  }
  
  /**
   * Stop the service
   */
  protected async doStop(): Promise<void> {
    // Clear cache
    this.cache.clear();
    
    // Clear circuit breaker timeout
    if (this.circuitResetTimeout) {
      clearTimeout(this.circuitResetTimeout);
      this.circuitResetTimeout = null;
    }
    
    console.log('AI service stopped');
  }
  
  /**
   * Initialize providers
   */
  private initializeProviders(): void {
    // Initialize Ollama provider if configured
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const ollamaDefaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
    
    const ollamaProvider = new OllamaProvider({
      baseUrl: ollamaUrl,
      defaultModel: ollamaDefaultModel,
    });
    
    this.providers.set(ollamaProvider.name, ollamaProvider);
    
    console.log(`AI provider registered: ${ollamaProvider.name}`);
  }
  
  /**
   * Get available providers
   */
  public getProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get provider by name
   * @param name Provider name
   */
  public getProvider(name: string): AIProvider | null {
    return this.providers.get(name) || null;
  }
  
  /**
   * Get available models
   * @param providerName Optional provider name filter
   */
  public async getAvailableModels(providerName?: string): Promise<AIModel[]> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return [];
      }
      
      return provider.getAvailableModels();
    }
    
    // Get models from all providers
    const modelsPromises = Array.from(this.providers.values()).map(
      provider => provider.getAvailableModels()
    );
    
    const modelsArrays = await Promise.all(modelsPromises);
    
    // Flatten the arrays
    return modelsArrays.flat();
  }
  
  /**
   * Get model by ID
   * @param modelId Model ID
   * @param providerName Optional provider name
   */
  public async getModel(modelId: string, providerName?: string): Promise<AIModel | null> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return null;
      }
      
      return provider.getModel(modelId);
    }
    
    // Try to find model in any provider
    for (const provider of this.providers.values()) {
      const model = await provider.getModel(modelId);
      if (model) {
        return model;
      }
    }
    
    return null;
  }
  
  /**
   * Execute a chat completion request
   * @param request Chat completion request
   */
  public async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Ensure request has an ID
    const requestId = request.id || uuidv4();
    const requestWithId: ChatCompletionRequest = {
      ...request,
      id: requestId,
      type: AIRequestType.CHAT,
    };
    
    // Check cache if enabled
    if (this.cacheOptions.enabled) {
      const cacheKey = this.getCacheKey(requestWithId);
      const cachedResponse = this.getFromCache<ChatCompletionResponse>(cacheKey);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Check circuit breaker
    if (this.circuitBreakerOptions.enabled && this.circuitOpen) {
      return {
        requestId,
        data: {
          role: 'assistant',
          content: 'I apologize, but the AI service is currently unavailable. Please try again later.',
        },
        conversation: [...request.messages],
        error: 'Circuit breaker open',
        metadata: {
          model: request.modelId,
          responseTime: 0,
        },
      };
    }
    
    // Execute request with retry if enabled
    return this.executeWithRetry(async () => {
      try {
        // Determine provider to use
        const provider = this.getProviderForModel(request.modelId);
        
        if (!provider) {
          throw new Error(`No provider found for model: ${request.modelId}`);
        }
        
        // Execute request
        const response = await provider.chatCompletion(requestWithId);
        
        // Cache response if enabled
        if (this.cacheOptions.enabled) {
          const cacheKey = this.getCacheKey(requestWithId);
          this.addToCache(cacheKey, response);
        }
        
        // Reset failure counter on success
        this.resetFailureCounter();
        
        return response;
      } catch (error) {
        // Increment failure counter
        this.incrementFailureCounter();
        
        throw error;
      }
    });
  }
  
  /**
   * Execute a text completion request
   * @param request Text completion request
   */
  public async textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse> {
    // Ensure request has an ID
    const requestId = request.id || uuidv4();
    const requestWithId: TextCompletionRequest = {
      ...request,
      id: requestId,
      type: AIRequestType.COMPLETION,
    };
    
    // Check cache if enabled
    if (this.cacheOptions.enabled) {
      const cacheKey = this.getCacheKey(requestWithId);
      const cachedResponse = this.getFromCache<TextCompletionResponse>(cacheKey);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Check circuit breaker
    if (this.circuitBreakerOptions.enabled && this.circuitOpen) {
      return {
        requestId,
        data: 'I apologize, but the AI service is currently unavailable. Please try again later.',
        prompt: request.prompt,
        error: 'Circuit breaker open',
        metadata: {
          model: request.modelId,
          responseTime: 0,
        },
      };
    }
    
    // Execute request with retry if enabled
    return this.executeWithRetry(async () => {
      try {
        // Determine provider to use
        const provider = this.getProviderForModel(request.modelId);
        
        if (!provider) {
          throw new Error(`No provider found for model: ${request.modelId}`);
        }
        
        // Execute request
        const response = await provider.textCompletion(requestWithId);
        
        // Cache response if enabled
        if (this.cacheOptions.enabled) {
          const cacheKey = this.getCacheKey(requestWithId);
          this.addToCache(cacheKey, response);
        }
        
        // Reset failure counter on success
        this.resetFailureCounter();
        
        return response;
      } catch (error) {
        // Increment failure counter
        this.incrementFailureCounter();
        
        throw error;
      }
    });
  }
  
  /**
   * Execute an embedding request
   * @param request Embedding request
   */
  public async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Ensure request has an ID
    const requestId = request.id || uuidv4();
    const requestWithId: EmbeddingRequest = {
      ...request,
      id: requestId,
      type: AIRequestType.EMBEDDING,
    };
    
    // Check cache if enabled
    if (this.cacheOptions.enabled) {
      const cacheKey = this.getCacheKey(requestWithId);
      const cachedResponse = this.getFromCache<EmbeddingResponse>(cacheKey);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Check circuit breaker
    if (this.circuitBreakerOptions.enabled && this.circuitOpen) {
      return {
        requestId,
        data: [],
        dimensions: 0,
        error: 'Circuit breaker open',
        metadata: {
          model: request.modelId,
          responseTime: 0,
        },
      };
    }
    
    // Execute request with retry if enabled
    return this.executeWithRetry(async () => {
      try {
        // Determine provider to use
        const provider = this.getProviderForModel(request.modelId);
        
        if (!provider) {
          throw new Error(`No provider found for model: ${request.modelId}`);
        }
        
        // Execute request
        const response = await provider.embedding(requestWithId);
        
        // Cache response if enabled
        if (this.cacheOptions.enabled) {
          const cacheKey = this.getCacheKey(requestWithId);
          this.addToCache(cacheKey, response);
        }
        
        // Reset failure counter on success
        this.resetFailureCounter();
        
        return response;
      } catch (error) {
        // Increment failure counter
        this.incrementFailureCounter();
        
        throw error;
      }
    });
  }
  
  /**
   * Configure caching for AI requests
   * @param options Cache options
   */
  public configureCache(options: AICacheOptions): void {
    this.cacheOptions = {
      ...this.cacheOptions,
      ...options,
    };
    
    // Clear cache if disabled
    if (!options.enabled) {
      this.cache.clear();
    }
  }
  
  /**
   * Configure circuit breaker for AI requests
   * @param options Circuit breaker options
   */
  public configureCircuitBreaker(options: AICircuitBreakerOptions): void {
    this.circuitBreakerOptions = {
      ...this.circuitBreakerOptions,
      ...options,
    };
    
    // Reset circuit breaker if disabled
    if (!options.enabled) {
      this.resetCircuitBreaker();
    }
  }
  
  /**
   * Configure retry policy for AI requests
   * @param options Retry options
   */
  public configureRetry(options: AIRetryOptions): void {
    this.retryOptions = {
      ...this.retryOptions,
      ...options,
    };
  }
  
  /**
   * Get provider for model
   * @param modelId Model ID
   */
  private getProviderForModel(modelId?: string): AIProvider | null {
    if (!modelId) {
      // Default to Ollama if no model specified
      return this.providers.get('ollama') || null;
    }
    
    // Check if model ID includes provider name
    if (modelId.includes(':')) {
      const [providerName, modelName] = modelId.split(':');
      return this.providers.get(providerName) || null;
    }
    
    // Try to find provider for model
    // For now, default to Ollama
    return this.providers.get('ollama') || null;
  }
  
  /**
   * Get cache key for request
   * @param request AI request
   */
  private getCacheKey(request: any): string {
    // Normalize request for consistent cache keys
    const normalizedRequest = {
      type: request.type,
      modelId: request.modelId,
      // For chat completion
      messages: request.messages,
      system: request.system,
      // For text completion
      prompt: request.prompt,
      // For embedding
      text: request.text,
      // Common parameters
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      topP: request.topP,
    };
    
    return JSON.stringify(normalizedRequest);
  }
  
  /**
   * Get response from cache
   * @param key Cache key
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiration) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Add response to cache
   * @param key Cache key
   * @param data Response data
   */
  private addToCache<T>(key: string, data: T): void {
    // Enforce cache size limit
    if (this.cache.size >= this.cacheOptions.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    // Add new entry
    this.cache.set(key, {
      expiration: Date.now() + (this.cacheOptions.ttl * 1000),
      data,
    });
  }
  
  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiration) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Execute function with retry
   * @param fn Function to execute
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.retryOptions.enabled) {
      return fn();
    }
    
    let lastError: Error | null = null;
    let delay = this.retryOptions.initialDelay;
    
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // First attempt or retry
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Last attempt failed, rethrow error
        if (attempt === this.retryOptions.maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next retry with backoff
        delay = Math.min(delay * this.retryOptions.backoffFactor, this.retryOptions.maxDelay);
      }
    }
    
    // This should never happen, but TypeScript needs a return statement
    throw lastError || new Error('Unknown error during retry');
  }
  
  /**
   * Increment failure counter for circuit breaker
   */
  private incrementFailureCounter(): void {
    if (!this.circuitBreakerOptions.enabled) {
      return;
    }
    
    this.failureCounter++;
    
    // Check if threshold reached
    if (this.failureCounter >= this.circuitBreakerOptions.failureThreshold) {
      this.openCircuit();
    }
  }
  
  /**
   * Reset failure counter
   */
  private resetFailureCounter(): void {
    this.failureCounter = 0;
  }
  
  /**
   * Open circuit breaker
   */
  private openCircuit(): void {
    if (this.circuitOpen) {
      return;
    }
    
    console.log('Opening circuit breaker for AI service');
    
    this.circuitOpen = true;
    
    // Schedule circuit reset
    this.circuitResetTimeout = setTimeout(
      () => this.resetCircuitBreaker(),
      this.circuitBreakerOptions.resetTimeout
    );
  }
  
  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(): void {
    if (!this.circuitOpen) {
      return;
    }
    
    console.log('Resetting circuit breaker for AI service');
    
    this.circuitOpen = false;
    this.failureCounter = 0;
    
    // Clear timeout if exists
    if (this.circuitResetTimeout) {
      clearTimeout(this.circuitResetTimeout);
      this.circuitResetTimeout = null;
    }
  }
  
  /**
   * Get service description
   */
  protected async getServiceDescription(): Promise<string> {
    return `
The AI Service provides integration with AI models for natural language processing,
chat completions, text completions, and embeddings. It supports multiple AI providers
with a unified interface, resilience patterns, and caching.
`;
  }
  
  /**
   * Get API documentation
   */
  protected async getApiDocumentation(): Promise<string> {
    return `
## AI API

### Get Available Models
\`\`\`
GET /api/ai/models
Query parameters:
- provider: Filter by provider name
\`\`\`

### Get Model by ID
\`\`\`
GET /api/ai/models/:id
\`\`\`

### Chat Completion
\`\`\`
POST /api/ai/chat
Body: {
  modelId: string,
  messages: Array<{role: string, content: string}>,
  system?: string,
  temperature?: number,
  maxTokens?: number,
  topP?: number
}
\`\`\`

### Text Completion
\`\`\`
POST /api/ai/completion
Body: {
  modelId: string,
  prompt: string,
  system?: string,
  temperature?: number,
  maxTokens?: number,
  topP?: number
}
\`\`\`

### Embedding
\`\`\`
POST /api/ai/embedding
Body: {
  modelId: string,
  text: string[]
}
\`\`\`
`;
  }
  
  /**
   * Get custom metrics
   */
  protected async getCustomMetrics(): Promise<Record<string, unknown>> {
    return {
      cacheSize: this.cache.size,
      cacheEnabled: this.cacheOptions.enabled,
      circuitBreakerStatus: this.circuitOpen ? 'open' : 'closed',
      failureCounter: this.failureCounter,
      providers: Array.from(this.providers.keys()),
    };
  }
}