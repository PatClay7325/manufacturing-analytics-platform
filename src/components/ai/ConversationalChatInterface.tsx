'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, CheckCircle, Clock, Database, Star, Brain, Lightbulb, TrendingUp } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any[];
  suggestions?: string[];
  critiqueScore?: number;
  confidence?: number;
  intent?: string;
  analysisType?: string;
  visualizations?: any[];
  error?: boolean;
  processingTime?: number;
}

interface ConversationalChatInterfaceProps {
  className?: string;
  useConversationalApi?: boolean;
}

export function ConversationalChatInterface({ 
  className = '',
  useConversationalApi = true 
}: ConversationalChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm your enhanced manufacturing analytics assistant with advanced conversational abilities. 

I can help you with:
• 📊 OEE analysis and equipment performance
• 🎯 Quality metrics and defect analysis  
• 🔧 Maintenance predictions and downtime analysis
• 📈 Production tracking and optimization
• 🔍 Root cause analysis

I use ontology-based understanding and self-critique to provide accurate, comprehensive responses. What would you like to know?`,
      timestamp: new Date(),
      critiqueScore: 10,
      confidence: 1.0
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check service health
  useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const endpoint = useConversationalApi ? '/api/chat/conversational' : '/api/chat';
        const response = await fetch(endpoint, { method: 'GET' });
        setIsOnline(response.ok);
      } catch (error) {
        setIsOnline(false);
      }
    };
    
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 30000);
    return () => clearInterval(interval);
  }, [useConversationalApi]);

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
    setShowSuggestions(false);

    try {
      const startTime = Date.now();
      
      if (useConversationalApi) {
        // Use the new conversational API with self-critique
        const response = await fetch('/api/chat/conversational', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: sessionId,
            userId: 'demo-user'
          }),
        });

        const result = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.response || result.message || result.error || 'Sorry, I encountered an error.',
          timestamp: new Date(),
          suggestions: result.suggestions,
          critiqueScore: result.context?.critiqueScore || result.selfCritique?.score,
          confidence: result.context?.confidence || result.confidence,
          intent: result.context?.intent,
          analysisType: result.context?.analysisType,
          visualizations: result.visualizations,
          processingTime: Date.now() - startTime,
          error: !response.ok || !!result.error,
          data: result.dataSources
        };

        setMessages(prev => [...prev, assistantMessage]);
        if (result.sessionId) setSessionId(result.sessionId);
        
      } else {
        // Fallback to standard chat API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            messages: [
              { role: 'user', content: userMessage.content }
            ]
          }),
        });

        const result = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.message?.content || result.error || 'Sorry, I encountered an error.',
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          error: !response.ok || !!result.error
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I\'m having trouble connecting to the service. Please check if the AI service is running.',
        timestamp: new Date(),
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getCritiqueScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCritiqueScoreEmoji = (score?: number) => {
    if (!score) return '❓';
    if (score >= 9) return '✨';
    if (score >= 7) return '👍';
    return '⚠️';
  };

  const formatVisualization = (viz: any) => {
    if (!viz || !viz.data) return null;
    
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {viz.title || 'Data Visualization'}
        </h4>
        {viz.type === 'bar_chart' && (
          <div className="space-y-2">
            {viz.data.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-32 truncate">{item.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                    style={{ width: `${(item.value / Math.max(...viz.data.map((d: any) => d.value))) * 100}%` }}
                  />
                  <span className="absolute right-2 top-0 text-xs text-gray-700 leading-4">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const exampleQueries = [
    "Show me OEE for all equipment today",
    "What are the top 5 defect types this week?",
    "Why is Line 2 having so many issues?",
    "Compare performance between shifts",
    "What maintenance is due this week?"
  ];

  // Get last assistant message for suggestions
  const lastAssistantMessage = messages.filter(m => m.type === 'assistant').pop();
  const currentSuggestions = showSuggestions ? (lastAssistantMessage?.suggestions || []) : [];

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Conversational Manufacturing Assistant</h3>
            <p className="text-sm text-gray-600">
              Enhanced with ontology & self-critique (v2.0)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {useConversationalApi && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Self-Critique Enabled</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <Brain className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : message.error
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-50 text-gray-900 border border-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {/* Metadata for assistant messages */}
                {message.type === 'assistant' && (
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                    {message.critiqueScore !== undefined && (
                      <div className={`flex items-center gap-1 ${getCritiqueScoreColor(message.critiqueScore)}`}>
                        <span>{getCritiqueScoreEmoji(message.critiqueScore)}</span>
                        <span className="font-medium">Quality: {message.critiqueScore}/10</span>
                      </div>
                    )}
                    {message.confidence !== undefined && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Brain className="w-3 h-3" />
                        Confidence: {(message.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                    {message.intent && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="font-medium">Intent:</span> {message.intent}
                      </div>
                    )}
                    {message.processingTime && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        {message.processingTime}ms
                      </div>
                    )}
                    {message.error ? (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                )}
              </div>

              {/* Visualizations */}
              {message.visualizations?.map((viz, idx) => (
                <div key={idx}>
                  {formatVisualization(viz)}
                </div>
              ))}
            </div>

            {message.type === 'user' && (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-gray-600">Analyzing with self-critique...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {currentSuggestions.length > 0 && (
        <div className="px-4 py-3 border-t bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-gray-700">Suggested follow-ups:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-sm bg-white border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 hover:border-blue-400 text-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick suggestions (show when no messages except initial) */}
      {messages.length === 1 && (
        <div className="px-4 py-3 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Try these queries:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exampleQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => setInput(query)}
                className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-400 text-gray-700 text-left transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isOnline ? "Ask about your manufacturing data..." : "AI service is offline"}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 transition-all"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={!isOnline}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isOnline}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {!isOnline && (
          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            AI service is currently offline. Please check your connection.
          </p>
        )}
      </form>
    </div>
  );
}