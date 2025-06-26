/**
 * Optimized Ollama Provider with Streaming Support
 * Designed for resource-constrained systems
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  AIProvider as AIProviderEnum,
  AIModel, 
  AIRequest, 
  AIRequestType,
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  TextCompletionRequest, 
  TextCompletionResponse, 
  EmbeddingRequest, 
  EmbeddingResponse,
  ChatMessage
} from './types';
import { AIProvider } from './interfaces';
import { managedFetch } from '@/lib/fetch-manager';

/**
 * Streaming response handler
 */
export interface StreamingOptions {
  onToken?: (token: string) => void;
  onProgress?: (partial: string) => void;
  onComplete?: (full: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Performance optimization options
 */
export interface PerformanceOptions {
  // Reduce context size for faster processing
  maxContextTokens?: number;
  // Enable response caching
  enableCache?: boolean;
  // Cache TTL in seconds
  cacheTTL?: number;
  // Batch size for embeddings
  embeddingBatchSize?: number;
  // Request timeout for low-power systems
  timeout?: number;
  // Number of CPU threads to use
  numThread?: number;
  // GPU layers (0 for CPU only)
  numGpu?: number;
}

/**
 * Optimized Ollama parameters
 */
export interface OptimizedOllamaParams {
  baseUrl: string;
  defaultModel: string;
  performance?: PerformanceOptions;
}

/**
 * Simple LRU cache for responses
 */
class SimpleCache<T> {
  private cache: Map<string, { data: T; expires: number }> = new Map();
  private maxSize: number = 100;

  set(key: string, value: T, ttl: number): void {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { data: value, expires });
    
    // Simple size limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Optimized Ollama provider with streaming
 */
export class OllamaStreamingProvider implements AIProvider {
  public readonly name: string = 'ollama-streaming';
  public readonly description: string = 'Optimized Ollama provider with streaming for low-resource systems';
  
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly performance: PerformanceOptions;
  private readonly responseCache: SimpleCache<any>;
  
  constructor(params: OptimizedOllamaParams) {
    this.baseUrl = params.baseUrl.endsWith('/') 
      ? params.baseUrl.slice(0, -1) 
      : params.baseUrl;
    
    this.defaultModel = params.defaultModel;
    
    // Default performance settings for low-resource systems
    this.performance = {
      maxContextTokens: 2048,      // Reduced from 4096
      enableCache: true,
      cacheTTL: 300,              // 5 minutes
      embeddingBatchSize: 5,      // Small batches
      timeout: 60000,             // 60 seconds
      numThread: 4,               // Limit CPU threads
      numGpu: 0,                  // CPU only by default
      ...params.performance
    };
    
    this.responseCache = new SimpleCache();
  }
  
  /**
   * Get available models (cached)
   */
  public async getAvailableModels(): Promise<AIModel[]> {
    const cacheKey = 'models_list';
    const cached = this.responseCache.get(cacheKey);
    if (cached) return cached as AIModel[];
    
    try {
      const response = await managedFetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // Quick timeout for model list
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      const models: AIModel[] = data.models.map((model: any) => {
        const [name, version] = model.name.split(':');
        return {
          id: model.name,
          name: name,
          provider: AIProviderEnum.OLLAMA,
          version: version || 'latest',
          description: `Ollama model: ${model.name}`,
          capabilities: ['completion', 'chat', 'embedding'],
          parameters: {
            size: model.size,
            digest: model.digest,
          },
        };
      });
      
      this.responseCache.set(cacheKey, models, 300); // Cache for 5 minutes
      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
  
  /**
   * Get model by ID
   */
  public async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.getAvailableModels();
    return models.find(model => model.id === modelId) || null;
  }
  
  /**
   * Execute request with routing
   */
  public async executeRequest<T>(request: AIRequest): Promise<T> {
    switch (request.type) {
      case AIRequestType.CHAT:
        return this.chatCompletion(request as ChatCompletionRequest) as unknown as T;
      case AIRequestType.COMPLETION:
        return this.textCompletion(request as TextCompletionRequest) as unknown as T;
      case AIRequestType.EMBEDDING:
        return this.embedding(request as EmbeddingRequest) as unknown as T;
      default:
        throw new Error(`Unsupported request type: ${request.type}`);
    }
  }
  
  /**
   * Streaming chat completion
   */
  public async chatCompletion(
    request: ChatCompletionRequest,
    streaming?: StreamingOptions
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();
    
    try {
      // Check cache first
      if (this.performance.enableCache) {
        const cacheKey = this.getCacheKey(request);
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
          return cached as ChatCompletionResponse;
        }
      }
      
      // Optimize messages for performance
      const messages = this.optimizeMessages(request.messages, request.system);
      const modelId = request.modelId || this.defaultModel;
      
      // Prepare optimized request body
      const body = {
        model: modelId,
        messages: messages,
        options: {
          temperature: request.temperature ?? 0.7,
          top_p: request.topP ?? 0.9,
          num_predict: request.maxTokens ?? 500,    // Limited for performance
          num_ctx: this.performance.maxContextTokens,
          num_thread: this.performance.numThread,
          num_gpu: this.performance.numGpu,
          repeat_penalty: 1.1,                      // Reduce repetition
          stop: ["\n\n", "User:", "Assistant:"],   // Early stopping
        },
        stream: streaming !== undefined,
      };
      
      const response = await managedFetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: this.performance.timeout!,
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      let assistantMessage: ChatMessage;
      
      if (streaming) {
        // Handle streaming response
        assistantMessage = await this.handleStreamingResponse(
          response,
          streaming
        );
      } else {
        // Handle regular response
        const data = await response.json();
        assistantMessage = {
          role: 'assistant',
          content: data.message?.content || data.response || 'No response',
        };
      }
      
      const responseTime = Date.now() - startTime;
      const result: ChatCompletionResponse = {
        requestId,
        data: assistantMessage,
        conversation: [...messages, assistantMessage],
        metadata: {
          model: modelId,
          usage: {
            promptTokens: Math.ceil(messages.map(m => m.content).join(' ').length / 4),
            completionTokens: Math.ceil(assistantMessage.content.length / 4),
            totalTokens: 0, // Will be calculated
          },
          responseTime,
        },
      };
      
      result.metadata!.usage!.totalTokens = 
        result.metadata!.usage!.promptTokens + 
        result.metadata!.usage!.completionTokens;
      
      // Cache successful response
      if (this.performance.enableCache && !streaming) {
        const cacheKey = this.getCacheKey(request);
        this.responseCache.set(cacheKey, result, this.performance.cacheTTL!);
      }
      
      return result;
    } catch (error) {
      return {
        requestId,
        data: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again with a shorter query.',
        },
        conversation: [...request.messages],
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          model: request.modelId || this.defaultModel,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }
  
  /**
   * Handle streaming response
   */
  private async handleStreamingResponse(
    response: Response,
    streaming: StreamingOptions
  ): Promise<ChatMessage> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Add chunk to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            // Handle Ollama's streaming format
            if (data.message?.content) {
              const token = data.message.content;
              fullContent += token;
              
              // Call streaming callbacks
              streaming.onToken?.(token);
              streaming.onProgress?.(fullContent);
            }
            // Stop if done
            if (data.done) {
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.debug('Skipping invalid JSON:', line);
          }
        }
      }
      
      streaming.onComplete?.(fullContent);
      
      return {
        role: 'assistant',
        content: fullContent,
      };
    } catch (error) {
      streaming.onError?.(error as Error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Optimize messages for performance
   */
  private optimizeMessages(
    messages: ChatMessage[],
    system?: string
  ): ChatMessage[] {
    const optimized: ChatMessage[] = [];
    
    // Add system message if provided
    if (system) {
      optimized.push({
        role: 'system',
        content: this.truncateContent(system, 200), // Limit system prompt
      });
    }
    
    // Keep only recent messages to reduce context
    const recentMessages = messages.slice(-5); // Last 5 messages only
    
    for (const msg of recentMessages) {
      optimized.push({
        role: msg.role,
        content: this.truncateContent(msg.content, 500), // Limit message length
      });
    }
    
    return optimized;
  }
  
  /**
   * Truncate content for performance
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(request: any): string {
    const key = {
      model: request.modelId,
      messages: request.messages?.map((m: any) => ({
        role: m.role,
        content: m.content.substring(0, 100), // First 100 chars only
      })),
      temperature: request.temperature,
    };
    return JSON.stringify(key);
  }
  
  /**
   * Text completion (simplified)
   */
  public async textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse> {
    const chatRequest: ChatCompletionRequest = {
      ...request,
      type: AIRequestType.CHAT,
      messages: [{ role: 'user', content: request.prompt }],
    };
    
    const response = await this.chatCompletion(chatRequest);
    
    return {
      requestId: response.requestId,
      data: response.data.content,
      prompt: request.prompt,
      metadata: response.metadata,
      error: response.error,
    };
  }
  
  /**
   * Optimized embedding for low resources
   */
  public async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();
    
    try {
      const modelId = request.modelId || this.defaultModel;
      const batchSize = this.performance.embeddingBatchSize || 5;
      const embeddings: number[][] = [];
      
      // Process in small batches
      for (let i = 0; i < request.text.length; i += batchSize) {
        const batch = request.text.slice(i, i + batchSize);
        
        const batchEmbeddings = await Promise.all(
          batch.map(async (text) => {
            const body = {
              model: modelId,
              prompt: this.truncateContent(text, 500), // Limit text length
              options: {
                num_thread: this.performance.numThread,
                num_gpu: this.performance.numGpu,
              },
            };
            
            const response = await managedFetch(`${this.baseUrl}/api/embeddings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              timeout: 30000, // 30s timeout
            });
            
            if (!response.ok) {
              throw new Error(`Embedding error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.embedding;
          })
        );
        
        embeddings.push(...batchEmbeddings);
      }
      
      const dimensions = embeddings[0]?.length || 0;
      
      return {
        requestId,
        data: embeddings,
        dimensions,
        metadata: {
          model: modelId,
          usage: {
            promptTokens: request.text.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
            completionTokens: 0,
            totalTokens: 0,
          },
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        requestId,
        data: [],
        dimensions: 0,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          model: request.modelId || this.defaultModel,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }
}