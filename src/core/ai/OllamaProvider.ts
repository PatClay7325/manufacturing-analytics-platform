/**
 * Ollama AI Provider Implementation
 * 
 * This class implements the AIProvider interface for Ollama.
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

/**
 * Ollama API response types
 */
interface OllamaModelResponse {
  models: {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: Record<string, unknown>;
  }[];
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Ollama API client parameters
 */
export interface OllamaClientParams {
  /**
   * Ollama API base URL
   */
  baseUrl: string;
  
  /**
   * Default model to use
   */
  defaultModel: string;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements AIProvider {
  /**
   * Provider name
   */
  public readonly name: string = 'ollama';
  
  /**
   * Provider description
   */
  public readonly description: string = 'Ollama AI provider for local LLM inference';
  
  /**
   * Ollama API base URL
   */
  private readonly baseUrl: string;
  
  /**
   * Default model to use
   */
  private readonly defaultModel: string;
  
  /**
   * Request timeout in milliseconds
   */
  private readonly timeout: number;
  
  /**
   * Cache of available models
   */
  private modelsCache: AIModel[] | null = null;
  
  /**
   * Cache expiration timestamp
   */
  private modelsCacheExpiration: number = 0;
  
  /**
   * Create a new Ollama provider
   * @param params Provider parameters
   */
  constructor(params: OllamaClientParams) {
    this.baseUrl = params.baseUrl.endsWith('/') 
      ? params.baseUrl.slice(0, -1) 
      : params.baseUrl;
    
    this.defaultModel = params.defaultModel;
    this.timeout = params.timeout || 30000;
  }
  
  /**
   * Get available models
   */
  public async getAvailableModels(): Promise<AIModel[]> {
    try {
      // Check cache
      if (this.modelsCache && Date.now() < this.modelsCacheExpiration) {
        return this.modelsCache;
      }
      
      // Fetch models from Ollama API
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as OllamaModelResponse;
      
      // Map Ollama models to AIModel interface
      const models: AIModel[] = data.models.map(model => {
        // Parse model name and version
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
            modifiedAt: model.modified_at,
            details: model.details || {},
          },
        };
      });
      
      // Update cache
      this.modelsCache = models;
      this.modelsCacheExpiration = Date.now() + (5 * 60 * 1000); // Cache for 5 minutes
      
      return models;
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }
  
  /**
   * Get model by ID
   * @param modelId Model ID
   */
  public async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.getAvailableModels();
    return models.find(model => model.id === modelId) || null;
  }
  
  /**
   * Execute a generic AI request
   * @param request AI request
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
   * Execute a chat completion request
   * @param request Chat completion request
   */
  public async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();
    
    try {
      // Prepare messages for Ollama format
      const messages = [...request.messages];
      
      // Add system message if provided
      if (request.system && !messages.some(msg => msg.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: request.system,
        });
      }
      
      // Determine model to use
      const modelId = request.modelId || this.defaultModel;
      
      // Prepare request body
      const body = {
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        options: {
          temperature: request.temperature,
          top_p: request.topP,
          num_predict: request.maxTokens,
        },
        stream: false,
      };
      
      // Send request to Ollama API
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message.content,
      };
      
      // Calculate token usage (approximate since Ollama doesn't provide this directly)
      const promptText = messages.map(m => m.content).join(' ');
      const completionText = assistantMessage.content;
      const promptTokens = Math.ceil(promptText.length / 4); // Rough approximation
      const completionTokens = Math.ceil(completionText.length / 4); // Rough approximation
      
      // Prepare response
      const responseTime = Date.now() - startTime;
      
      return {
        requestId,
        data: assistantMessage,
        conversation: [...messages, assistantMessage],
        metadata: {
          model: modelId,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
          responseTime,
        },
      };
    } catch (error) {
      return {
        requestId,
        data: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request.',
        },
        conversation: [...request.messages],
        error: `Error in chat completion: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          model: request.modelId || this.defaultModel,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }
  
  /**
   * Execute a text completion request
   * @param request Text completion request
   */
  public async textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();
    
    try {
      // Determine model to use
      const modelId = request.modelId || this.defaultModel;
      
      // Prepare system message
      const system = request.system || '';
      
      // Prepare request body
      const body = {
        model: modelId,
        prompt: request.prompt,
        system,
        options: {
          temperature: request.temperature,
          top_p: request.topP,
          num_predict: request.maxTokens,
        },
        stream: false,
      };
      
      // Send request to Ollama API
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as OllamaGenerateResponse;
      
      // Calculate token usage (approximate since Ollama doesn't provide this directly)
      const promptTokens = data.prompt_eval_count || Math.ceil(request.prompt.length / 4);
      const completionTokens = data.eval_count || Math.ceil(data.response.length / 4);
      
      // Prepare response
      const responseTime = Date.now() - startTime;
      
      return {
        requestId,
        data: data.response,
        prompt: request.prompt,
        metadata: {
          model: modelId,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
          responseTime,
        },
      };
    } catch (error) {
      return {
        requestId,
        data: 'I apologize, but I encountered an error processing your request.',
        prompt: request.prompt,
        error: `Error in text completion: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          model: request.modelId || this.defaultModel,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }
  
  /**
   * Execute an embedding request
   * @param request Embedding request
   */
  public async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();
    
    try {
      // Determine model to use
      const modelId = request.modelId || this.defaultModel;
      
      // Process each text item
      const embeddings = await Promise.all(
        request.text.map(async (text) => {
          // Prepare request body
          const body = {
            model: modelId,
            prompt: text,
          };
          
          // Send request to Ollama API
          const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout),
          });
          
          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json() as OllamaEmbeddingResponse;
          
          return data.embedding;
        })
      );
      
      // Calculate token usage
      const totalTokens = request.text.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
      
      // Get embedding dimensions
      const dimensions = embeddings[0]?.length || 0;
      
      // Prepare response
      const responseTime = Date.now() - startTime;
      
      return {
        requestId,
        data: embeddings,
        dimensions,
        metadata: {
          model: modelId,
          usage: {
            promptTokens: totalTokens,
            completionTokens: 0,
            totalTokens,
          },
          responseTime,
        },
      };
    } catch (error) {
      return {
        requestId,
        data: [],
        dimensions: 0,
        error: `Error in embedding: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          model: request.modelId || this.defaultModel,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }
}