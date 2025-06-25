import { Groq } from 'groq-sdk';
import pRetry from 'p-retry';
import { Agent } from 'https';
import { logger } from '@/lib/logger';

// TypeScript types for Groq responses
export interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface GroqCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GroqClientConfig {
  apiKey?: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  streamBatchSize?: number;
}

export interface ModelRoutingConfig {
  simple: string;
  complex: string;
  reasoning: string;
  code: string;
  vision: string;
}

// Default model routing configuration
const DEFAULT_MODEL_ROUTING: ModelRoutingConfig = {
  simple: 'llama-3.2-3b-preview',      // Ultra-fast for simple queries
  complex: 'llama-3.2-90b-text-preview', // More capable for complex tasks
  reasoning: 'llama-3.1-70b-versatile',  // Best for reasoning tasks
  code: 'llama3-70b-8192',              // Optimized for code generation
  vision: 'llava-v1.5-7b-4096-preview'  // For multimodal tasks
};

// Connection pool for HTTP agent
const httpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

export class GroqClient {
  private client: Groq;
  private config: GroqClientConfig;
  private modelRouting: ModelRoutingConfig;
  private activeStreams: Set<AbortController> = new Set();

  constructor(config?: GroqClientConfig) {
    this.config = {
      apiKey: config?.apiKey || process.env.GROQ_API_KEY,
      baseURL: config?.baseURL || 'https://api.groq.com/openai/v1',
      maxRetries: config?.maxRetries || 3,
      timeout: config?.timeout || 30000,
      model: config?.model || DEFAULT_MODEL_ROUTING.simple,
      temperature: config?.temperature || 0.7,
      maxTokens: config?.maxTokens || 2048,
      topP: config?.topP || 0.9,
      streamBatchSize: config?.streamBatchSize || 5,
    };

    if (!this.config.apiKey) {
      throw new Error('GROQ_API_KEY is required. Set it in environment variables or pass it to the constructor.');
    }

    this.client = new Groq({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      dangerouslyAllowBrowser: false,
      defaultHeaders: {
        'X-Client-Name': 'manufacturing-analytics-groq-client',
        'X-Client-Version': '1.0.0',
      },
      httpAgent,
      timeout: this.config.timeout,
      maxRetries: 0, // We handle retries ourselves with p-retry
    });

    this.modelRouting = { ...DEFAULT_MODEL_ROUTING };
  }

  /**
   * Stream a completion with ultra-low latency
   * Target: <100ms first token latency
   */
  async streamCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stop?: string[];
      modelType?: keyof ModelRoutingConfig;
      onChunk?: (chunk: GroqStreamChunk) => void;
    }
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const startTime = Date.now();
    const abortController = new AbortController();
    this.activeStreams.add(abortController);

    try {
      // Select model based on routing type
      const model = options?.model || 
        (options?.modelType ? this.modelRouting[options.modelType] : this.config.model);

      const streamOptions = {
        model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        top_p: options?.topP ?? this.config.topP,
        stop: options?.stop,
        stream: true as const,
      };

      // Use p-retry for resilient streaming
      const stream = await pRetry(
        async () => {
          const response = await this.client.chat.completions.create(streamOptions, {
            signal: abortController.signal,
          });
          return response;
        },
        {
          retries: this.config.maxRetries!,
          onFailedAttempt: (error) => {
            logger.warn(`Groq streaming attempt ${error.attemptNumber} failed:`, error.message);
          },
          retryOptions: {
            factor: 2,
            minTimeout: 100,
            maxTimeout: 3000,
          },
        }
      );

      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      // Return async generator for streaming
      return (async function* () {
        try {
          for await (const chunk of stream) {
            if (abortController.signal.aborted) {
              break;
            }

            tokenCount++;
            
            // Track first token latency
            if (firstTokenTime === null && chunk.choices[0]?.delta?.content) {
              firstTokenTime = Date.now() - startTime;
              logger.debug(`Groq first token latency: ${firstTokenTime}ms`);
            }

            // Call onChunk callback if provided
            if (options?.onChunk) {
              options.onChunk(chunk as GroqStreamChunk);
            }

            // Yield content
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }

            // Check if stream is complete
            if (chunk.choices[0]?.finish_reason) {
              const totalTime = Date.now() - startTime;
              const tokensPerSecond = (tokenCount / totalTime) * 1000;
              logger.debug(`Groq stream complete: ${tokenCount} tokens in ${totalTime}ms (${tokensPerSecond.toFixed(0)} tokens/sec)`);
              break;
            }
          }
        } catch (error) {
          logger.error('Groq streaming error:', error);
          throw error;
        }
      })();
    } catch (error) {
      logger.error('Failed to create Groq stream:', error);
      throw error;
    } finally {
      this.activeStreams.delete(abortController);
    }
  }

  /**
   * Get a non-streaming completion
   */
  async getCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stop?: string[];
      modelType?: keyof ModelRoutingConfig;
    }
  ): Promise<GroqCompletionResponse> {
    const startTime = Date.now();

    try {
      // Select model based on routing type
      const model = options?.model || 
        (options?.modelType ? this.modelRouting[options.modelType] : this.config.model);

      const completionOptions = {
        model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        top_p: options?.topP ?? this.config.topP,
        stop: options?.stop,
      };

      // Use p-retry for resilient requests
      const response = await pRetry(
        async () => {
          const result = await this.client.chat.completions.create(completionOptions);
          return result;
        },
        {
          retries: this.config.maxRetries!,
          onFailedAttempt: (error) => {
            logger.warn(`Groq completion attempt ${error.attemptNumber} failed:`, error.message);
          },
          retryOptions: {
            factor: 2,
            minTimeout: 100,
            maxTimeout: 3000,
          },
        }
      );

      const latency = Date.now() - startTime;
      const tokensPerSecond = (response.usage.total_tokens / latency) * 1000;
      
      logger.debug(`Groq completion: ${response.usage.total_tokens} tokens in ${latency}ms (${tokensPerSecond.toFixed(0)} tokens/sec)`);

      return response as GroqCompletionResponse;
    } catch (error) {
      logger.error('Failed to get Groq completion:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple completions in parallel
   */
  async batchCompletions(
    requests: Array<{
      messages: Array<{ role: string; content: string }>;
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        modelType?: keyof ModelRoutingConfig;
      };
    }>,
    options?: {
      batchSize?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<GroqCompletionResponse[]> {
    const batchSize = options?.batchSize || this.config.streamBatchSize || 5;
    const results: GroqCompletionResponse[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(req => 
        this.getCompletion(req.messages, req.options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (options?.onProgress) {
        options.onProgress(results.length, requests.length);
      }
    }
    
    return results;
  }

  /**
   * Route request to appropriate model based on complexity
   */
  async routeCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      forceModel?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    // Analyze message complexity
    const complexity = this.analyzeComplexity(messages);
    const modelType = this.selectModelType(complexity);
    
    logger.debug(`Routing to ${modelType} model based on complexity score: ${complexity.score}`);

    if (options?.stream) {
      return this.streamCompletion(messages, {
        ...options,
        modelType,
      });
    } else {
      const response = await this.getCompletion(messages, {
        ...options,
        modelType,
      });
      return response.choices[0].message.content;
    }
  }

  /**
   * Analyze message complexity to determine model routing
   */
  private analyzeComplexity(messages: Array<{ role: string; content: string }>): {
    score: number;
    hasCode: boolean;
    hasReasoning: boolean;
    length: number;
  } {
    const fullText = messages.map(m => m.content).join(' ');
    const length = fullText.length;
    
    // Check for code patterns
    const codePatterns = /```|function|class|const|let|var|import|export|def|if|for|while/gi;
    const hasCode = codePatterns.test(fullText);
    
    // Check for reasoning patterns
    const reasoningPatterns = /because|therefore|however|analyze|explain|compare|evaluate/gi;
    const hasReasoning = reasoningPatterns.test(fullText);
    
    // Calculate complexity score
    let score = 0;
    if (length > 1000) score += 2;
    if (length > 3000) score += 3;
    if (hasCode) score += 3;
    if (hasReasoning) score += 2;
    if (messages.length > 5) score += 2;
    
    return { score, hasCode, hasReasoning, length };
  }

  /**
   * Select model type based on complexity analysis
   */
  private selectModelType(complexity: { score: number; hasCode: boolean; hasReasoning: boolean }): keyof ModelRoutingConfig {
    if (complexity.hasCode) return 'code';
    if (complexity.score >= 8) return 'complex';
    if (complexity.hasReasoning && complexity.score >= 5) return 'reasoning';
    return 'simple';
  }

  /**
   * Update model routing configuration
   */
  updateModelRouting(routing: Partial<ModelRoutingConfig>): void {
    this.modelRouting = { ...this.modelRouting, ...routing };
  }

  /**
   * Abort all active streams
   */
  abortAllStreams(): void {
    this.activeStreams.forEach(controller => controller.abort());
    this.activeStreams.clear();
  }

  /**
   * Health check for Groq API
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    model: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.getCompletion(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 10 }
      );
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        model: this.config.model!,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        model: this.config.model!,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GroqClientConfig {
    return { ...this.config };
  }

  /**
   * Get model routing configuration
   */
  getModelRouting(): ModelRoutingConfig {
    return { ...this.modelRouting };
  }
}

// Export singleton instance for convenience
export const groqClient = new GroqClient();

// Export factory function for creating custom instances
export function createGroqClient(config?: GroqClientConfig): GroqClient {
  return new GroqClient(config);
}