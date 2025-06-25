/**
 * AI Interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the interfaces for the AI integration.
 */

import { ModularService } from '../services/interfaces';
import { 
  AIModel, 
  AIRequest, 
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

/**
 * AI provider interface
 * Represents a connection to an AI model provider
 */
export interface AIProvider {
  /**
   * Provider name
   */
  readonly name: string;
  
  /**
   * Provider description
   */
  readonly description: string;
  
  /**
   * Get available models
   */
  getAvailableModels(): Promise<AIModel[]>;
  
  /**
   * Get model by ID
   * @param modelId Model ID
   */
  getModel(modelId: string): Promise<AIModel | null>;
  
  /**
   * Execute a generic AI request
   * @param request AI request
   */
  executeRequest<T>(request: AIRequest): Promise<T>;
  
  /**
   * Execute a chat completion request
   * @param request Chat completion request
   */
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /**
   * Execute a text completion request
   * @param request Text completion request
   */
  textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse>;
  
  /**
   * Execute an embedding request
   * @param request Embedding request
   */
  embedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

/**
 * AI service interface
 * Manages AI integrations and provides access to AI capabilities
 */
export interface AIService extends ModularService {
  /**
   * Get available providers
   */
  getProviders(): AIProvider[];
  
  /**
   * Get provider by name
   * @param name Provider name
   */
  getProvider(name: string): AIProvider | null;
  
  /**
   * Get available models
   * @param providerName Optional provider name filter
   */
  getAvailableModels(providerName?: string): Promise<AIModel[]>;
  
  /**
   * Get model by ID
   * @param modelId Model ID
   * @param providerName Optional provider name
   */
  getModel(modelId: string, providerName?: string): Promise<AIModel | null>;
  
  /**
   * Execute a chat completion request
   * @param request Chat completion request
   */
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /**
   * Execute a text completion request
   * @param request Text completion request
   */
  textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse>;
  
  /**
   * Execute an embedding request
   * @param request Embedding request
   */
  embedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  
  /**
   * Configure caching for AI requests
   * @param options Cache options
   */
  configureCache(options: AICacheOptions): void;
  
  /**
   * Configure circuit breaker for AI requests
   * @param options Circuit breaker options
   */
  configureCircuitBreaker(options: AICircuitBreakerOptions): void;
  
  /**
   * Configure retry policy for AI requests
   * @param options Retry options
   */
  configureRetry(options: AIRetryOptions): void;
}

/**
 * AI agent interface
 * Represents a specialized AI agent for a specific task
 */
export interface AIAgent {
  /**
   * Agent name
   */
  readonly name: string;
  
  /**
   * Agent description
   */
  readonly description: string;
  
  /**
   * Agent version
   */
  readonly version: string;
  
  /**
   * Initialize the agent
   * @param aiService AI service to use
   * @param config Agent configuration
   */
  initialize(aiService: AIService, config?: Record<string, unknown>): Promise<void>;
  
  /**
   * Execute the agent with input
   * @param input Input data
   * @param context Optional context data
   */
  execute(input: unknown, context?: Record<string, unknown>): Promise<unknown>;
  
  /**
   * Get agent capabilities
   */
  getCapabilities(): string[];
}

/**
 * Manufacturing assistant interface
 * Specialized agent for manufacturing questions
 */
export interface ManufacturingAssistant extends AIAgent {
  /**
   * Answer a manufacturing question
   * @param question Question text
   * @param context Optional manufacturing context
   */
  answerQuestion(
    question: string, 
    context?: Record<string, unknown>
  ): Promise<string>;
  
  /**
   * Analyze manufacturing data
   * @param data Manufacturing data
   * @param instructions Analysis instructions
   */
  analyzeData(
    data: Record<string, unknown>, 
    instructions: string
  ): Promise<Record<string, unknown>>;
  
  /**
   * Generate manufacturing recommendations
   * @param situation Current manufacturing situation
   * @param goal Desired outcome
   */
  generateRecommendations(
    situation: Record<string, unknown>, 
    goal: string
  ): Promise<string[]>;
}