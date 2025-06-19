/**
 * Hook for streaming chat functionality with performance optimizations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import streamingChatService, { StreamingChatOptions } from '@/services/streamingChatService';
import { ChatMessage, ChatSession } from '@/models/chat';

export interface UseStreamingChatOptions {
  sessionId?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

export interface StreamingState {
  isStreaming: boolean;
  streamingContent: string;
  progress: number;
  error: string | null;
}

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingContent: '',
    progress: 0,
    error: null,
  });
  
  const [session, setSession] = useState<ChatSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  
  // Initialize or load session
  useEffect(() => {
    if (options.sessionId) {
      const existingSession = streamingChatService.getSession(options.sessionId);
      if (existingSession) {
        setSession(existingSession);
        setMessages(existingSession.messages);
      }
    } else {
      const newSession = streamingChatService.createSession();
      setSession(newSession);
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [options.sessionId]);

  /**
   * Send a message with streaming response
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!session || streamingState.isStreaming) return;
    
    // Reset state
    setStreamingState({
      isStreaming: true,
      streamingContent: '',
      progress: 0,
      error: null,
    });
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    // Add user message immediately for better UX
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId: session.id,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    options.onStreamStart?.();
    
    try {
      const streamingOptions: StreamingChatOptions = {
        signal: abortControllerRef.current.signal,
        
        onToken: (token) => {
          setStreamingState(prev => ({
            ...prev,
            streamingContent: prev.streamingContent + token,
          }));
        },
        
        onProgress: (content, progress) => {
          setStreamingState(prev => ({
            ...prev,
            streamingContent: content,
            progress: progress,
          }));
        },
        
        onComplete: (fullContent) => {
          // Add complete assistant message
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            sessionId: session.id,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          
          // Reset streaming state
          setStreamingState({
            isStreaming: false,
            streamingContent: '',
            progress: 1,
            error: null,
          });
          
          // Reset retry count on success
          retryCountRef.current = 0;
          options.onStreamEnd?.();
        },
        
        onError: (error) => {
          handleError(error, content);
        },
      };
      
      await streamingChatService.sendStreamingMessage(
        session.id,
        content,
        streamingOptions
      );
      
    } catch (error) {
      handleError(error as Error, content);
    }
  }, [session, streamingState.isStreaming, options]);

  /**
   * Handle errors with retry logic
   */
  const handleError = useCallback((error: Error, originalContent: string) => {
    const maxRetries = options.maxRetries ?? 2;
    const retryDelay = options.retryDelay ?? 2000;
    
    if (error.name === 'AbortError') {
      setStreamingState({
        isStreaming: false,
        streamingContent: '',
        progress: 0,
        error: 'Request cancelled',
      });
      options.onStreamEnd?.();
      return;
    }
    
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      
      setStreamingState(prev => ({
        ...prev,
        error: `Error: ${error.message}. Retrying... (${retryCountRef.current}/${maxRetries})`,
      }));
      
      // Retry after delay
      setTimeout(() => {
        sendMessage(originalContent);
      }, retryDelay);
      
    } else {
      // Max retries reached
      setStreamingState({
        isStreaming: false,
        streamingContent: '',
        progress: 0,
        error: `Failed after ${maxRetries} retries: ${error.message}`,
      });
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId: session?.id || '',
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { error: true },
      };
      
      setMessages(prev => [...prev, errorMessage]);
      retryCountRef.current = 0;
      options.onStreamEnd?.();
    }
  }, [options, sendMessage, session]);

  /**
   * Cancel current streaming
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (session) {
      streamingChatService.cancelStream(session.id);
    }
    
    setStreamingState({
      isStreaming: false,
      streamingContent: '',
      progress: 0,
      error: 'Streaming cancelled',
    });
  }, [session]);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    if (session) {
      const newSession = streamingChatService.createSession();
      setSession(newSession);
      setMessages([]);
      setStreamingState({
        isStreaming: false,
        streamingContent: '',
        progress: 0,
        error: null,
      });
    }
  }, [session]);

  /**
   * Get performance stats
   */
  const getStats = useCallback(() => {
    return streamingChatService.getPerformanceStats();
  }, []);

  return {
    // State
    messages,
    session,
    isStreaming: streamingState.isStreaming,
    streamingContent: streamingState.streamingContent,
    streamingProgress: streamingState.progress,
    error: streamingState.error,
    
    // Actions
    sendMessage,
    cancelStreaming,
    clearChat,
    getStats,
  };
}