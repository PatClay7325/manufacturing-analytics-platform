'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ChatMessage as ChatMessageType } from '@/models/chat';
import { streamingChatService } from '@/services/streamingChatService';

export default function OptimizedChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>('');

  // Initialize session
  useEffect(() => {
    const session = streamingChatService.createSession('Optimized Chat');
    sessionIdRef.current = session.id;
  }, []);

  // Scroll to bottom only when near bottom and new messages are added
  useEffect(() => {
    const scrollContainer = messagesEndRef.current?.parentElement;
    if (scrollContainer && messages.length > 0) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      // Only auto-scroll if user is near bottom or it's a new conversation
      if (isNearBottom || messages.length <= 2) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages.length]); // Only trigger on message count change

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setStreamingContent('');

    // Add user message immediately
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      sessionId: sessionIdRef.current,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      // Add temporary assistant message for streaming
      const tempAssistantId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: tempAssistantId,
        sessionId: sessionIdRef.current,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }]);

      // Send message with streaming
      await streamingChatService.sendStreamingMessage(
        sessionIdRef.current,
        content,
        {
          onToken: (token) => {
            setStreamingContent(prev => prev + token);
          },
          onComplete: (fullResponse) => {
            // Update the assistant message with final content
            setMessages(prev => prev.map(msg => 
              msg.id === tempAssistantId 
                ? { ...msg, content: fullResponse }
                : msg
            ));
            setStreamingContent('');
          },
          onError: (error) => {
            setError(error.message);
            // Remove the empty assistant message on error
            setMessages(prev => prev.filter(msg => msg.id !== tempAssistantId));
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Performance stats display
  const stats = streamingChatService.getPerformanceStats();

  return (
    <PageLayout 
      title="Optimized Chat (Gemma:2B)" 
      description="Resource-efficient streaming chat interface"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Main Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={{
                    ...message,
                    content: message.role === 'assistant' && message.id === messages[messages.length - 1]?.id && streamingContent
                      ? streamingContent
                      : message.content
                  }} 
                />
              ))}
              
              {/* Loading */}
              {isLoading && !streamingContent && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <LoadingSpinner />
                  <span>Thinking...</span>
                </div>
              )}
              
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t p-4">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={isLoading}
                placeholder="Ask about manufacturing metrics, equipment, or processes..."
              />
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Performance Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Sessions:</span>
                <span className="font-medium">{stats.activeSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Streams:</span>
                <span className="font-medium">{stats.activeStreams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Memory Usage:</span>
                <span className="font-medium">
                  {(stats.memoryUsage / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
          
          {/* Model Info */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Model Configuration</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Model:</span>
                <div className="font-medium">Gemma:2B</div>
              </div>
              <div>
                <span className="text-gray-600">Optimizations:</span>
                <ul className="mt-1 space-y-1 text-xs">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-1">✓</span>
                    Response streaming
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-1">✓</span>
                    Context reduction (2048 tokens)
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-1">✓</span>
                    CPU-only mode
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-1">✓</span>
                    Response caching
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Sample Questions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Sample Questions</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage("What is the current OEE?")}
                className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded transition-colors"
              >
                📊 Current OEE
              </button>
              <button
                onClick={() => handleSendMessage("Show me the equipment status")}
                className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded transition-colors"
              >
                🔧 Equipment Status
              </button>
              <button
                onClick={() => handleSendMessage("Are there any active alerts?")}
                className="w-full text-left px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded transition-colors"
              >
                🚨 Active Alerts
              </button>
              <button
                onClick={() => handleSendMessage("Show me today's production metrics")}
                className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 rounded transition-colors"
              >
                📈 Production Metrics
              </button>
              <button
                onClick={() => handleSendMessage("Calculate the average performance for the last 24 hours")}
                className="w-full text-left px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 rounded transition-colors"
              >
                ⏱️ Performance Average
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  streamingChatService.clearOldSessions();
                  alert('Old sessions cleared');
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Clear Old Sessions
              </button>
              <button
                onClick={() => router.push('/test-chat')}
                className="w-full px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                Test API Endpoints
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}