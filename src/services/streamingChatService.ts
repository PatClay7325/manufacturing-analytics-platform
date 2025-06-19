/**
 * Optimized Streaming Chat Service
 * Handles real-time streaming responses with performance optimizations
 */

import { 
  ChatMessage, 
  ChatSession, 
  ChatCompletionRequest, 
  ChatCompletionResponse 
} from '@/models/chat';

export interface StreamingChatOptions {
  onToken?: (token: string) => void;
  onProgress?: (content: string, progress: number) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

class StreamingChatService {
  private baseUrl: string;
  private sessions: Map<string, ChatSession> = new Map();
  private activeStreams: Map<string, AbortController> = new Map();

  constructor() {
    // Fix: Don't use NEXT_PUBLIC_API_URL as it might include /api
    this.baseUrl = '';
  }

  /**
   * Send a streaming chat message
   */
  async sendStreamingMessage(
    sessionId: string,
    content: string,
    options: StreamingChatOptions = {}
  ): Promise<ChatMessage> {
    try {
      // Cancel any existing stream for this session
      this.cancelStream(sessionId);

      // Create new abort controller
      const abortController = new AbortController();
      this.activeStreams.set(sessionId, abortController);

      // Combine signals
      const signal = options.signal 
        ? AbortSignal.any([options.signal, abortController.signal])
        : abortController.signal;

      // Add user message to session
      const userMessage: ChatMessage = {
        id: this.generateId(),
        sessionId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // Get session history (limited for performance)
      const session = this.sessions.get(sessionId);
      const recentMessages = session?.messages.slice(-5) || [];

      // Prepare request
      const request: ChatCompletionRequest = {
        messages: [
          ...recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 500, // Limited for performance
      };

      // Make streaming request - use the manufacturing endpoint with database access
      const response = await fetch(`${this.baseUrl}/api/chat/manufacturing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          sessionId: sessionId,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      // Handle streaming response
      const assistantMessage = await this.handleStreamingResponse(
        response,
        sessionId,
        options
      );

      // Update session
      this.updateSession(sessionId, [userMessage, assistantMessage]);

      // Clean up
      this.activeStreams.delete(sessionId);

      return assistantMessage;

    } catch (error) {
      // Clean up on error
      this.activeStreams.delete(sessionId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      
      options.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Handle streaming response with optimizations
   */
  private async handleStreamingResponse(
    response: Response,
    sessionId: string,
    options: StreamingChatOptions
  ): Promise<ChatMessage> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let tokenCount = 0;
    const startTime = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          // Skip non-data lines
          if (!line.startsWith('data: ')) continue;
          
          // Parse SSE data
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            
            if (token) {
              fullContent += token;
              tokenCount++;
              
              // Call progress callbacks
              options.onToken?.(token);
              
              // Throttle progress updates for performance
              if (tokenCount % 5 === 0) {
                const progress = Math.min(tokenCount / 100, 0.95);
                options.onProgress?.(fullContent, progress);
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      // Final progress update
      options.onProgress?.(fullContent, 1.0);
      options.onComplete?.(fullContent);

      // Create assistant message
      return {
        id: this.generateId(),
        sessionId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
        metadata: {
          tokensGenerated: tokenCount,
          responseTime: Date.now() - startTime,
          streaming: true,
        }
      };

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Cancel active stream for a session
   */
  cancelStream(sessionId: string): void {
    const controller = this.activeStreams.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(sessionId);
    }
  }

  /**
   * Cancel all active streams
   */
  cancelAllStreams(): void {
    this.activeStreams.forEach(controller => controller.abort());
    this.activeStreams.clear();
  }

  /**
   * Update session with new messages
   */
  private updateSession(sessionId: string, messages: ChatMessage[]): void {
    const session = this.sessions.get(sessionId) || {
      id: sessionId,
      title: messages[0]?.content.substring(0, 50) || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    session.messages.push(...messages);
    session.updatedAt = new Date().toISOString();
    
    // Limit session history for performance
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Get session
   */
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Create new session
   */
  createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Clear old sessions (memory management)
   */
  clearOldSessions(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const toDelete: string[] = [];

    this.sessions.forEach((session, id) => {
      const age = now - new Date(session.updatedAt).getTime();
      if (age > maxAge) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => {
      this.cancelStream(id);
      this.sessions.delete(id);
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance stats
   */
  getPerformanceStats(): {
    activeSessions: number;
    activeStreams: number;
    memoryUsage: number;
  } {
    return {
      activeSessions: this.sessions.size,
      activeStreams: this.activeStreams.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalChars = 0;
    this.sessions.forEach(session => {
      session.messages.forEach(msg => {
        totalChars += msg.content.length;
      });
    });
    // Rough estimate: 2 bytes per character
    return totalChars * 2;
  }
}

// Export singleton instance
export const streamingChatService = new StreamingChatService();
export default streamingChatService;