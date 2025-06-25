import apiService from './apiService';
import { 
  ChatMessage, 
  ChatSession, 
  ChatCompletionRequest, 
  ChatCompletionResponse 
} from '@/models/chat';

/**
 * Chat API Service
 * 
 * Provides methods for interacting with the chat API endpoints
 */
export class ChatApiService {
  private resource = 'chat';

  /**
   * Get all chat sessions
   */
  async getAllSessions(): Promise<ChatSession[]> {
    return apiService.get<ChatSession[]>({
      resource: this.resource,
      endpoint: '/sessions',
      cache: { ttl: 1 * 60 * 1000 } // Cache for 1 minute
    });
  }

  /**
   * Get chat session by ID
   */
  async getSessionById(id: string): Promise<ChatSession> {
    return apiService.get<ChatSession>({
      resource: this.resource,
      endpoint: `/sessions/${id}`,
      cache: { ttl: 30 * 1000 } // Cache for 30 seconds
    });
  }

  /**
   * Create a new chat session
   */
  async createSession(title?: string): Promise<ChatSession> {
    const result = await apiService.post<ChatSession>({
      resource: this.resource,
      endpoint: '/sessions'
    }, { title });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(
    sessionId: string, 
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const result = await apiService.post<ChatMessage>({
      resource: this.resource,
      endpoint: `/sessions/${sessionId}/messages`
    }, message);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Get AI response to a message
   */
  async getAIResponse(
    sessionId: string,
    messages: Pick<ChatMessage, 'role' | 'content' | 'name'>[]
  ): Promise<Pick<ChatMessage, 'role' | 'content' | 'name'>> {
    const request: ChatCompletionRequest = {
      messages,
      model: 'manufacturing-assistant-1'
    };
    
    const response = await apiService.post<ChatCompletionResponse>({
      resource: this.resource,
      endpoint: '/completions'
    }, request);
    
    return response.choices[0].message;
  }

  /**
   * Delete a chat session
   */
  async deleteSession(id: string): Promise<void> {
    await apiService.delete({
      resource: this.resource,
      endpoint: `/sessions/${id}`
    });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
  }

  /**
   * Rename a chat session
   */
  async renameSession(id: string, title: string): Promise<ChatSession> {
    const result = await apiService.patch<ChatSession>({
      resource: this.resource,
      endpoint: `/sessions/${id}`
    }, { title });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }
}

// Create and export a default instance
const chatApi = new ChatApiService();
export default chatApi;