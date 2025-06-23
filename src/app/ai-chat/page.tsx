'use client';

import React from 'react';

import { useEffect, useRef, useState } from 'react';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatInput from '@/components/chat/ChatInput';
import ThoughtCard from '@/components/chat/ThoughtCard';
import { MessageSquare, Bot, User, Settings, Download, RefreshCw } from 'lucide-react';
import { MANUFACTURING_EXAMPLES } from '@/config/ai-system-prompt';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  thoughts?: Thought[];
}

interface Thought {
  type: 'reasoning' | 'critique' | 'insight' | 'planning';
  title: string;
  body: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemma:2b');
  const [showThoughts, setShowThoughts] = useState(true);
  const [showMarkdown, setShowMarkdown] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<{ status: string; details?: any } | null>(null);
  const [usePipeline, setUsePipeline] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<string>('');

  useEffect(() => {
    // Check agent status on mount
    fetch('/api/agents/manufacturing-engineering/status')
      .then(res => res.json())
      .then(data => setAgentStatus(data))
      .catch(err => console.error('Failed to check agent status:', err));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setIsStreaming(true);
    streamingRef.current = '';
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      thoughts: []
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const endpoint = usePipeline 
        ? '/api/agents/manufacturing-engineering/pipeline/stream'
        : '/api/chat/manufacturing-agent';
      
      const requestBody = usePipeline
        ? {
            query: text,
            parameters: {
              sessionId: currentSession || Date.now().toString(),
              context: { messages }
            }
          }
        : {
            messages: [...messages, newMessage],
            sessionId: currentSession || Date.now().toString()
          };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            // Skip the [DONE] message
            if (dataStr === '[DONE]') {
              continue;
            }
            
            try {
              const data = JSON.parse(dataStr);
              
              // Handle pipeline mode responses
              if (usePipeline && data.type) {
                switch (data.type) {
                  case 'agent_start':
                  case 'agent_progress':
                    // Add to thoughts
                    setThoughts(prev => [...prev, {
                      type: 'planning',
                      title: `Agent: ${data.agentName}`,
                      body: `Status: ${data.status || 'starting'}`
                    }]);
                    break;
                  case 'complete':
                    if (data.result) {
                      streamingRef.current = data.result.content || '';
                      setMessages(prev => 
                        prev.map(msg => 
                          msg.id === assistantMessage.id 
                            ? { 
                                ...msg, 
                                content: streamingRef.current,
                                thoughts: data.result.thoughts || thoughts
                              }
                            : msg
                        )
                      );
                    }
                    break;
                  case 'error':
                    streamingRef.current = `Error: ${data.error}`;
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, content: streamingRef.current }
                          : msg
                      )
                    );
                    break;
                }
              } else {
                // Handle regular agent responses
                if (data.content) {
                  streamingRef.current += data.content;
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: streamingRef.current }
                        : msg
                    )
                  );
                }
                
                if (data.thoughts) {
                  setThoughts(data.thoughts);
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, thoughts: data.thoughts }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              // Only log non-[DONE] parsing errors
              if (dataStr !== '[DONE]') {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const regenerateResponse = async () => {
    if (messages.length < 2) return;
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;
    
    // Remove last assistant message
    setMessages(prev => prev.slice(0, -1));
    
    // Resend the last user message
    await sendMessage(lastUserMessage.content);
  };

  const exportChat = () => {
    const content = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}\n`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChatLayout
      sessions={sessions}
      currentSession={currentSession}
      onNewSession={() => {
        setMessages([]);
        setThoughts([]);
        setCurrentSession(null);
      }}
      onSelectSession={(sessionId) => {
        // Load session messages
        setCurrentSession(sessionId);
      }}
    >
      <div className="flex h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="border-b dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Manufacturing Engineering Agent
                </h1>
                <span className="ml-4 px-3 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                  ISO Compliant
                </span>
                {agentStatus && (
                  <span className={`ml-2 px-3 py-1 text-xs rounded-full ${
                    agentStatus.status === 'operational' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {agentStatus.status === 'operational' 
                      ? `✓ ${agentStatus.details?.totalMetrics || 0} metrics` 
                      : '⚠ No Data'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setUsePipeline(!usePipeline)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    usePipeline 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  title={usePipeline ? 'Using Multi-Agent Pipeline' : 'Using Single Agent'}
                >
                  {usePipeline ? 'Pipeline Mode' : 'Legacy Mode'}
                </button>
                <button
                  onClick={regenerateResponse}
                  disabled={messages.length < 2 || isStreaming}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                  title="Regenerate response"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button
                  onClick={exportChat}
                  disabled={messages.length === 0}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                  title="Export chat"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowMarkdown(!showMarkdown)}
                  className={`p-2 ${showMarkdown ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} hover:text-gray-900 dark:hover:text-white`}
                  title="Toggle markdown"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-16 w-16 mb-4 text-gray-400" />
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">Manufacturing Engineering Agent</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">ISO-compliant analysis for OEE, quality, downtime, and maintenance optimization</p>
                
                {/* Sample Questions */}
                <div className="w-full max-w-2xl">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Try these questions:</p>
                  <div className="space-y-4">
                    {MANUFACTURING_EXAMPLES.slice(0, 3).map((category, idx) => (
                      <div key={idx}>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          {category.category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.questions.slice(0, 2).map((question, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => sendMessage(question)}
                              className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-700 dark:text-gray-300"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex space-x-3 max-w-[80%] ${
                        msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          {msg.content || (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                        </div>
                        
                        {msg.model && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                            {msg.model} • {msg.timestamp.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </div>

        {/* Thought Cards Sidebar */}
        {showThoughts && (
          <div className="w-96 border-l dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Thought Process
                </h2>
                <button
                  onClick={() => setShowThoughts(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              {thoughts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Thoughts will appear here as the AI processes your request
                </p>
              ) : (
                <div className="space-y-4">
                  {thoughts.map((thought, idx) => (
                    <ThoughtCard key={idx} {...thought} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ChatLayout>
  );
}