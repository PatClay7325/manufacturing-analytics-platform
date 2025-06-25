'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any[];
  explanation?: string;
  executionTime?: number;
  rowCount?: number;
  error?: boolean;
}

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your manufacturing analytics assistant. I can help you query equipment data, calculate OEE metrics, analyze quality trends, and more. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-login in development and check service health on mount
  useEffect(() => {
    const initializeService = async () => {
      // Auto-login in development mode
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true') {
        try {
          await fetch('/api/auth/dev-login', { method: 'POST' });
        } catch (error) {
          console.warn('Dev auto-login failed:', error);
        }
      }
      
      // Check service health
      checkServiceHealth();
    };
    
    initializeService();
    const interval = setInterval(checkServiceHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServiceHealth = async () => {
    try {
      const response = await fetch('/api/health-check');
      const health = await response.json();
      setIsOnline(health.status === 'ok' || health.status === 'degraded');
    } catch (error) {
      setIsOnline(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isOnline) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: userMessage.content }
          ]
        }),
      });

      const result = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.message?.content || result.error || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
        data: result.context?.equipment || result.context?.metrics || [],
        explanation: result.debug?.queryAnalyzed,
        executionTime: result.executionTime,
        rowCount: result.rowCount,
        error: !response.ok || !!result.error
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I\'m having trouble connecting to the analytics service. Please try again later.',
        timestamp: new Date(),
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatData = (data: any[]) => {
    if (!data || data.length === 0) return null;

    // Simple table format for now
    const keys = Object.keys(data[0]);
    
    return (
      <div className="mt-4 border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Database className="w-4 h-4" />
            Results ({data.length} rows)
          </div>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {keys.map(key => (
                  <th key={key} className="px-3 py-2 text-left font-medium text-gray-700">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-t">
                  {keys.map(key => (
                    <td key={key} className="px-3 py-2 text-gray-900">
                      {typeof row[key] === 'number' ? row[key].toFixed(3) : String(row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
              ... and {data.length - 10} more rows
            </div>
          )}
        </div>
      </div>
    );
  };

  const exampleQueries = [
    "Show me OEE for all equipment in the last 24 hours",
    "What are the top 5 defect types this week?",
    "Calculate MTBF for critical equipment",
    "Show production vs target for Line 1",
    "Which equipment has the highest downtime?"
  ];

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Manufacturing Assistant</h3>
            <p className="text-sm text-gray-500">
              Powered by local Ollama AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'assistant' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.error
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* Metadata for assistant messages */}
                {message.type === 'assistant' && (
                  <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                    {message.executionTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.executionTime}ms
                      </div>
                    )}
                    {message.rowCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {message.rowCount} rows
                      </div>
                    )}
                    {message.error ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>

              {/* Data table */}
              {message.data && formatData(message.data)}
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="text-sm text-gray-500 ml-2">Analyzing your query...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions (show when no messages except initial) */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.slice(0, 3).map((query, idx) => (
              <button
                key={idx}
                onClick={() => setInput(query)}
                className="text-xs bg-white border rounded-full px-3 py-1 hover:bg-gray-50 text-gray-700"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isOnline ? "Ask about your manufacturing data..." : "AI service is offline"}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={!isOnline}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isOnline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {!isOnline && (
          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            AI service is currently offline. Please check your Ollama container.
          </p>
        )}
      </form>
    </div>
  );
}