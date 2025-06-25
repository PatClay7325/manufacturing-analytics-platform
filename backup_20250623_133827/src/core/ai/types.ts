/**
 * AI Types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the types and interfaces for the AI integration.
 */

/**
 * AI model provider
 */
export enum AIProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  AZURE = 'azure',
  HUGGINGFACE = 'huggingface',
  CUSTOM = 'custom',
}

/**
 * AI model information
 */
export interface AIModel {
  /**
   * Model ID
   */
  id: string;
  
  /**
   * Model name
   */
  name: string;
  
  /**
   * Model provider
   */
  provider: AIProvider;
  
  /**
   * Model version
   */
  version: string;
  
  /**
   * Model description
   */
  description?: string;
  
  /**
   * Model capabilities
   */
  capabilities: string[];
  
  /**
   * Input token limit
   */
  inputTokenLimit?: number;
  
  /**
   * Output token limit
   */
  outputTokenLimit?: number;
  
  /**
   * Model parameters
   */
  parameters?: Record<string, unknown>;
}

/**
 * AI request types
 */
export enum AIRequestType {
  COMPLETION = 'completion',
  CHAT = 'chat',
  EMBEDDING = 'embedding',
}

/**
 * Base AI request interface
 */
export interface AIRequest {
  /**
   * Request ID
   */
  id: string;
  
  /**
   * Request type
   */
  type: AIRequestType;
  
  /**
   * Model ID
   */
  modelId: string;
  
  /**
   * Request parameters
   */
  parameters?: Record<string, unknown>;
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  /**
   * Message role
   */
  role: 'system' | 'user' | 'assistant' | 'function';
  
  /**
   * Message content
   */
  content: string;
  
  /**
   * Name of the sender (optional)
   */
  name?: string;
  
  /**
   * Function call information (if role is 'function')
   */
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest extends AIRequest {
  /**
   * Request type
   */
  type: AIRequestType.CHAT;
  
  /**
   * Chat messages
   */
  messages: ChatMessage[];
  
  /**
   * System message
   */
  system?: string;
  
  /**
   * Temperature (0-1)
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Top-p sampling
   */
  topP?: number;
  
  /**
   * Stream response
   */
  stream?: boolean;
}

/**
 * Text completion request
 */
export interface TextCompletionRequest extends AIRequest {
  /**
   * Request type
   */
  type: AIRequestType.COMPLETION;
  
  /**
   * Prompt text
   */
  prompt: string;
  
  /**
   * System message
   */
  system?: string;
  
  /**
   * Temperature (0-1)
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Top-p sampling
   */
  topP?: number;
  
  /**
   * Stream response
   */
  stream?: boolean;
}

/**
 * Embedding request
 */
export interface EmbeddingRequest extends AIRequest {
  /**
   * Request type
   */
  type: AIRequestType.EMBEDDING;
  
  /**
   * Text to embed
   */
  text: string[];
}

/**
 * AI response interface
 */
export interface AIResponse<T = unknown> {
  /**
   * Request ID
   */
  requestId: string;
  
  /**
   * Response data
   */
  data: T;
  
  /**
   * Error message (if any)
   */
  error?: string;
  
  /**
   * Response metadata
   */
  metadata?: {
    /**
     * Model used
     */
    model: string;
    
    /**
     * Usage information
     */
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    
    /**
     * Response time in milliseconds
     */
    responseTime: number;
  };
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse extends AIResponse<ChatMessage> {
  /**
   * Full conversation history
   */
  conversation: ChatMessage[];
}

/**
 * Text completion response
 */
export interface TextCompletionResponse extends AIResponse<string> {
  /**
   * Original prompt
   */
  prompt: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse extends AIResponse<number[][]> {
  /**
   * Dimensions of embeddings
   */
  dimensions: number;
}

/**
 * AI cache options
 */
export interface AICacheOptions {
  /**
   * Enable caching
   */
  enabled: boolean;
  
  /**
   * Time-to-live in seconds
   */
  ttl: number;
  
  /**
   * Maximum number of cache entries
   */
  maxEntries: number;
}

/**
 * AI circuit breaker options
 */
export interface AICircuitBreakerOptions {
  /**
   * Enable circuit breaker
   */
  enabled: boolean;
  
  /**
   * Failure threshold before opening circuit
   */
  failureThreshold: number;
  
  /**
   * Reset timeout in milliseconds
   */
  resetTimeout: number;
}

/**
 * AI retry options
 */
export interface AIRetryOptions {
  /**
   * Enable retries
   */
  enabled: boolean;
  
  /**
   * Maximum number of retries
   */
  maxRetries: number;
  
  /**
   * Initial retry delay in milliseconds
   */
  initialDelay: number;
  
  /**
   * Maximum retry delay in milliseconds
   */
  maxDelay: number;
  
  /**
   * Backoff factor
   */
  backoffFactor: number;
}