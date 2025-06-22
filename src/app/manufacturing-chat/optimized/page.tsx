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
    const session = streamingChatService?.createSession('Optimized Chat');
    sessionIdRef.current = session?.id || '';
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setStreamingContent('');

    // Create user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const tempAssistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      await streamingChatService?.sendMessage(
        sessionIdRef.current,
        content,
        {
          onToken: (token) => {
            setStreamingContent(prev => prev + token);
          },
          onComplete: (fullResponse) => {
            setStreamingContent('');
            setMessages(prev => prev?.map(msg => 
              msg?.id === tempAssistantId 
                ? { ...msg, content: fullResponse }
                : msg
            ));
          },
          onError: (error) => {
            setError(error?.message);
            setMessages(prev => prev?.filter(msg => msg?.id !== tempAssistantId));
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err?.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = streamingChatService?.getPerformanceStats();

  return (
    <PageLayout 
      title="Optimized Chat (Gemma:2B)" 
      description="Resource-efficient streaming chat interface"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages?.map((message) => (
                <ChatMessage 
                  key={message?.id} 
                  message={{
                    ...message,
                    content: message.role === 'assistant' && message?.id === messages[messages?.length - 1]?.id && streamingContent
                      ? streamingContent
                      : message.content
                  }} 
                />
              ))}
              
              {isLoading && !streamingContent && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <LoadingSpinner />
                  <span>Thinking...</span>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="border-t p-4">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={isLoading}
                placeholder="Ask about manufacturing metrics, equipment, or processes..."
              />
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Sessions:</span>
                <span className="font-medium">{stats?.activeSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Streams:</span>
                <span className="font-medium">{stats?.activeStreams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Memory Usage:</span>
                <span className="font-medium">{stats?.memoryUsage}MB</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Sample Questions</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage("What is the current OEE?")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                What is the current OEE?
              </button>
              <button
                onClick={() => handleSendMessage("Show me the equipment status")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                Show me the equipment status
              </button>
              <button
                onClick={() => handleSendMessage("Are there any active alerts?")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                Are there any active alerts?
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  streamingChatService?.clearOldSessions();
                  alert('Old sessions cleared');
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Clear Old Sessions
              </button>
              <button
                onClick={() => router?.push('/test-chat')}
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