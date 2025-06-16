/**
 * Manufacturing Assistant Implementation
 * 
 * This class implements the ManufacturingAssistant interface and provides
 * AI-powered assistance for manufacturing queries.
 */

import { v4 as uuidv4 } from 'uuid';
import { AIService, ManufacturingAssistant } from './interfaces';
import { AIRequestType, ChatCompletionRequest, ChatMessage } from './types';

/**
 * Manufacturing assistant configuration
 */
export interface ManufacturingAssistantConfig {
  /**
   * Model ID to use
   */
  modelId: string;
  
  /**
   * System prompt for the assistant
   */
  systemPrompt?: string;
  
  /**
   * Temperature for generation
   */
  temperature?: number;
  
  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;
}

/**
 * Manufacturing assistant implementation
 */
export class ManufacturingAssistantImpl implements ManufacturingAssistant {
  /**
   * Agent name
   */
  public readonly name: string = 'ManufacturingAssistant';
  
  /**
   * Agent description
   */
  public readonly description: string = 'AI-powered assistant for manufacturing operations';
  
  /**
   * Agent version
   */
  public readonly version: string = '1.0.0';
  
  /**
   * AI service instance
   */
  private aiService: AIService | null = null;
  
  /**
   * Assistant configuration
   */
  private config: ManufacturingAssistantConfig = {
    modelId: 'ollama:llama2',
    systemPrompt: 'You are a manufacturing operations expert assistant. Your role is to help manufacturing personnel with their questions about equipment, processes, quality, and operations. Provide concise, accurate, and helpful responses based on manufacturing best practices and standards like ISO 9001, ISO 14224, and ISO 22400.',
    temperature: 0.7,
    maxTokens: 1000,
  };
  
  /**
   * Conversation history
   */
  private conversation: ChatMessage[] = [];
  
  /**
   * Initialize the assistant
   * @param aiService AI service to use
   * @param config Assistant configuration
   */
  public async initialize(
    aiService: AIService, 
    config?: Record<string, unknown>
  ): Promise<void> {
    this.aiService = aiService;
    
    // Update config with provided values
    if (config) {
      this.config = {
        ...this.config,
        ...config,
      };
    }
    
    // Reset conversation
    this.resetConversation();
    
    console.log('Manufacturing assistant initialized');
  }
  
  /**
   * Execute the assistant with input
   * @param input Input data
   * @param context Optional context data
   */
  public async execute(
    input: unknown, 
    context?: Record<string, unknown>
  ): Promise<unknown> {
    if (typeof input === 'string') {
      return this.answerQuestion(input, context);
    }
    
    if (typeof input === 'object' && input !== null) {
      if ('question' in input && typeof input.question === 'string') {
        return this.answerQuestion(input.question as string, context);
      }
      
      if ('data' in input && 'instructions' in input) {
        return this.analyzeData(
          input.data as Record<string, unknown>,
          input.instructions as string
        );
      }
      
      if ('situation' in input && 'goal' in input) {
        return this.generateRecommendations(
          input.situation as Record<string, unknown>,
          input.goal as string
        );
      }
    }
    
    throw new Error('Invalid input for manufacturing assistant');
  }
  
  /**
   * Get agent capabilities
   */
  public getCapabilities(): string[] {
    return [
      'answer-questions',
      'analyze-data',
      'generate-recommendations',
      'explain-standards',
      'troubleshoot-issues',
    ];
  }
  
  /**
   * Answer a manufacturing question
   * @param question Question text
   * @param context Optional manufacturing context
   */
  public async answerQuestion(
    question: string, 
    context?: Record<string, unknown>
  ): Promise<string> {
    if (!this.aiService) {
      throw new Error('AI service not initialized');
    }
    
    // Add context to the conversation if provided
    if (context) {
      const contextMessage = this.formatContextMessage(context);
      this.conversation.push({
        role: 'system',
        content: contextMessage,
      });
    }
    
    // Add user question to conversation
    this.conversation.push({
      role: 'user',
      content: question,
    });
    
    // Prepare chat completion request
    const request: ChatCompletionRequest = {
      id: uuidv4(),
      type: AIRequestType.CHAT,
      modelId: this.config.modelId,
      messages: this.conversation,
      system: this.config.systemPrompt,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };
    
    // Execute chat completion
    const response = await this.aiService.chatCompletion(request);
    
    // Add assistant response to conversation
    this.conversation.push(response.data);
    
    // Manage conversation length
    this.pruneConversation();
    
    return response.data.content;
  }
  
  /**
   * Analyze manufacturing data
   * @param data Manufacturing data
   * @param instructions Analysis instructions
   */
  public async analyzeData(
    data: Record<string, unknown>, 
    instructions: string
  ): Promise<Record<string, unknown>> {
    if (!this.aiService) {
      throw new Error('AI service not initialized');
    }
    
    // Format data as string
    const dataStr = JSON.stringify(data, null, 2);
    
    // Create analysis prompt
    const prompt = `
Please analyze the following manufacturing data according to these instructions: ${instructions}

DATA:
${dataStr}

Provide your analysis in JSON format with the following structure:
{
  "summary": "Brief summary of the data",
  "insights": ["Key insight 1", "Key insight 2", ...],
  "issues": ["Issue 1", "Issue 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "metrics": {"metric1": value1, "metric2": value2, ...}
}
`;
    
    // Add analysis request to conversation
    this.conversation.push({
      role: 'user',
      content: prompt,
    });
    
    // Prepare chat completion request
    const request: ChatCompletionRequest = {
      id: uuidv4(),
      type: AIRequestType.CHAT,
      modelId: this.config.modelId,
      messages: this.conversation,
      system: this.config.systemPrompt,
      temperature: 0.3, // Lower temperature for more deterministic analysis
      maxTokens: this.config.maxTokens,
    };
    
    // Execute chat completion
    const response = await this.aiService.chatCompletion(request);
    
    // Add assistant response to conversation
    this.conversation.push(response.data);
    
    // Manage conversation length
    this.pruneConversation();
    
    // Extract JSON from response
    try {
      // Find JSON object in response
      const jsonMatch = response.data.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, create a simple result
      return {
        summary: response.data.content,
        error: 'Failed to parse structured analysis',
      };
    } catch (error) {
      return {
        summary: response.data.content,
        error: `Failed to parse analysis result: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Generate manufacturing recommendations
   * @param situation Current manufacturing situation
   * @param goal Desired outcome
   */
  public async generateRecommendations(
    situation: Record<string, unknown>, 
    goal: string
  ): Promise<string[]> {
    if (!this.aiService) {
      throw new Error('AI service not initialized');
    }
    
    // Format situation as string
    const situationStr = JSON.stringify(situation, null, 2);
    
    // Create recommendations prompt
    const prompt = `
I need recommendations for the following manufacturing situation:

SITUATION:
${situationStr}

GOAL:
${goal}

Please provide specific, actionable recommendations to achieve this goal.
Format your response as a numbered list of recommendations.
`;
    
    // Add recommendations request to conversation
    this.conversation.push({
      role: 'user',
      content: prompt,
    });
    
    // Prepare chat completion request
    const request: ChatCompletionRequest = {
      id: uuidv4(),
      type: AIRequestType.CHAT,
      modelId: this.config.modelId,
      messages: this.conversation,
      system: this.config.systemPrompt,
      temperature: 0.5, // Moderate temperature for creative but focused recommendations
      maxTokens: this.config.maxTokens,
    };
    
    // Execute chat completion
    const response = await this.aiService.chatCompletion(request);
    
    // Add assistant response to conversation
    this.conversation.push(response.data);
    
    // Manage conversation length
    this.pruneConversation();
    
    // Extract recommendations from response
    const recommendations: string[] = [];
    
    // Look for numbered items or bullet points
    const lines = response.data.content.split('\n');
    
    for (const line of lines) {
      // Match numbered items like "1. ", "2. ", etc.
      const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
      
      if (numberedMatch) {
        recommendations.push(numberedMatch[2].trim());
        continue;
      }
      
      // Match bullet points like "• ", "- ", "* "
      const bulletMatch = line.match(/^\s*[•\-\*]\s+(.+)$/);
      
      if (bulletMatch) {
        recommendations.push(bulletMatch[1].trim());
      }
    }
    
    // If no structured format was found, use the whole response
    if (recommendations.length === 0) {
      return [response.data.content.trim()];
    }
    
    return recommendations;
  }
  
  /**
   * Reset conversation history
   */
  private resetConversation(): void {
    this.conversation = [];
    
    // Add system message if configured
    if (this.config.systemPrompt) {
      this.conversation.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
    }
  }
  
  /**
   * Prune conversation to prevent it from growing too large
   */
  private pruneConversation(): void {
    // Keep only the most recent messages
    const maxMessages = 10; // Adjust as needed
    
    if (this.conversation.length > maxMessages) {
      // Always keep system messages
      const systemMessages = this.conversation.filter(msg => msg.role === 'system');
      
      // Keep most recent non-system messages
      const recentMessages = this.conversation
        .filter(msg => msg.role !== 'system')
        .slice(-maxMessages + systemMessages.length);
      
      // Combine system messages with recent messages
      this.conversation = [...systemMessages, ...recentMessages];
    }
  }
  
  /**
   * Format context message from context object
   * @param context Context object
   */
  private formatContextMessage(context: Record<string, unknown>): string {
    let message = 'CONTEXT:\n';
    
    // Add each context item
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'object' && value !== null) {
        message += `${key}: ${JSON.stringify(value, null, 2)}\n`;
      } else {
        message += `${key}: ${value}\n`;
      }
    }
    
    return message;
  }
}