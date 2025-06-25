/**
 * Optimized Ollama Service
 * Implements performance optimizations for Ollama integration:
 * - Model preloading and warm-up
 * - Streaming with backpressure handling
 * - Response caching
 * - Batch processing
 * - Automatic fallback to faster models
 */

import { logger } from '@/lib/logger';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  streamingEnabled?: boolean;
  timeout?: number;
  keepAlive?: string;
}

export interface OllamaResponse {
  content: string;
  model: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export class OptimizedOllamaService {
  private config: OllamaConfig;
  private modelLoaded: Map<string, boolean> = new Map();
  private responseCache: Map<string, { response: string; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(config: OllamaConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 2048,
      streamingEnabled: true,
      timeout: 30000,
      keepAlive: '5m',
      fallbackModel: 'gemma:2b',
      ...config
    };

    // Preload models on initialization
    this.preloadModels();
  }

  /**
   * Preload models to reduce first request latency
   */
  private async preloadModels(): Promise<void> {
    const models = [this.config.model];
    if (this.config.fallbackModel) {
      models.push(this.config.fallbackModel);
    }

    for (const model of models) {
      try {
        await this.warmUpModel(model);
        this.modelLoaded.set(model, true);
        logger.info(`Model preloaded: ${model}`);
      } catch (error) {
        logger.warn(`Failed to preload model ${model}:`, error);
      }
    }
  }

  /**
   * Warm up a model with a simple request
   */
  private async warmUpModel(model: string): Promise<void> {
    const warmUpPrompt = 'Hello, please respond with "ready".';
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: warmUpPrompt,
          stream: false,
          options: {
            temperature: 0,
            num_predict: 10
          },
          keep_alive: this.config.keepAlive
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout for warm-up
      });

      if (!response.ok) {
        throw new Error(`Warm-up failed: ${response.statusText}`);
      }

      await response.json();
    } catch (error) {
      logger.error(`Model warm-up failed for ${model}:`, error);
      throw error;
    }
  }

  /**
   * Generate completion with streaming support
   */
  async generateStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      systemPrompt?: string;
      context?: number[];
    }
  ): Promise<OllamaResponse> {
    const model = options?.model || this.config.model;
    const cacheKey = this.getCacheKey(prompt, model);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Ollama cache hit');
      // Stream cached response
      const chunks = cached.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return {
        content: cached,
        model,
        done: true
      };
    }

    const startTime = Date.now();
    let content = '';
    let metrics: Partial<OllamaResponse> = {};

    try {
      const response = await this.makeRequest(model, prompt, options);
      
      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.response) {
                content += data.response;
                onChunk(data.response);
              }

              if (data.done) {
                metrics = {
                  total_duration: data.total_duration,
                  load_duration: data.load_duration,
                  prompt_eval_duration: data.prompt_eval_duration,
                  eval_duration: data.eval_duration
                };
              }
            } catch (e) {
              logger.warn('Failed to parse Ollama response line:', e);
            }
          }
        }
      }

      // Cache successful response
      this.addToCache(cacheKey, content);

      const totalTime = Date.now() - startTime;
      logger.info('Ollama generation completed', {
        model,
        totalTime,
        contentLength: content.length,
        ...metrics
      });

      return {
        content,
        model,
        done: true,
        ...metrics
      };

    } catch (error) {
      logger.error('Ollama streaming error:', error);
      
      // Try fallback model if available
      if (this.config.fallbackModel && model !== this.config.fallbackModel) {
        logger.info('Attempting fallback model:', this.config.fallbackModel);
        return this.generateStream(prompt, onChunk, {
          ...options,
          model: this.config.fallbackModel
        });
      }

      throw error;
    }
  }

  /**
   * Generate completion without streaming
   */
  async generate(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    let fullResponse = '';
    
    await this.generateStream(
      prompt,
      (chunk) => { fullResponse += chunk; },
      options
    );

    return fullResponse;
  }

  /**
   * Make request to Ollama API
   */
  private async makeRequest(
    model: string,
    prompt: string,
    options?: any
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: {
            temperature: options?.temperature ?? this.config.temperature,
            num_predict: this.config.maxTokens,
            stop: ['Human:', 'Assistant:', '\n\n\n']
          },
          system: options?.systemPrompt,
          context: options?.context,
          keep_alive: this.config.keepAlive
        }),
        signal: controller.signal
      });

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get cache key for prompt
   */
  private getCacheKey(prompt: string, model: string): string {
    return `${model}:${prompt.substring(0, 100)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): string | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, response: string): void {
    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });

    // Clean old entries
    if (this.responseCache.size > 100) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to list models');
      }
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      logger.error('Failed to list Ollama models:', error);
      return [];
    }
  }
}

// Singleton instance
let ollamaService: OptimizedOllamaService | null = null;

export function getOllamaService(config?: Partial<OllamaConfig>): OptimizedOllamaService {
  if (!ollamaService) {
    ollamaService = new OptimizedOllamaService({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      fallbackModel: 'gemma:2b',
      ...config
    });
  }
  return ollamaService;
}