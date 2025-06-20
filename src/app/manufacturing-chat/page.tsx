'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/models/chat';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import PageLayout from '@/components/layout/PageLayout';
import { v4 as uuidv4 } from 'uuid';

// Sample thought suggestions based on context
const getThoughtSuggestions = (lastMessage: string): string[] => {
  const lowerMessage = lastMessage.toLowerCase();
  
  if (lowerMessage.includes('oee') || lowerMessage.includes('efficiency')) {
    return [
      'Show me OEE trends for the past week',
      'What factors are impacting our OEE?',
      'Compare OEE across different production lines',
      'How can we improve equipment efficiency?'
    ];
  }
  
  if (lowerMessage.includes('equipment') || lowerMessage.includes('machine')) {
    return [
      'Which equipment needs maintenance?',
      'Show equipment downtime analysis',
      'What is the current equipment status?',
      'Equipment performance metrics'
    ];
  }
  
  if (lowerMessage.includes('quality') || lowerMessage.includes('defect')) {
    return [
      'Show quality metrics dashboard',
      'What are the top defect categories?',
      'Quality trend analysis for this month',
      'How to reduce defect rates?'
    ];
  }
  
  if (lowerMessage.includes('production') || lowerMessage.includes('output')) {
    return [
      'Current production vs targets',
      'Production bottlenecks analysis',
      'Shift-wise production comparison',
      'How to optimize production flow?'
    ];
  }
  
  // Default suggestions
  return [
    'Show me today\'s production overview',
    'What is the current OEE?',
    'Any critical equipment alerts?',
    'Performance metrics summary'
  ];
};

export default function ManufacturingChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: 'Hello! I\'m your manufacturing analytics assistant. How can I help you today?',
      timestamp: new Date().toISOString(),
      thoughts: [
        'Show me today\'s production overview',
        'What is the current OEE?',
        'Check equipment status',
        'View quality metrics'
      ]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call API
      const response = await fetch('/api/chat/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant message with thoughts
      const assistantMessage: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date().toISOString(),
        thoughts: getThoughtSuggestions(data.choices[0].message.content)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        thoughts: ['Try a different question', 'Check system status', 'Contact support']
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThoughtSelect = (thought: string) => {
    handleSendMessage(thought);
  };

  return (
    <PageLayout 
      title="Manufacturing Chat Assistant"
      description="AI-powered insights for your manufacturing operations"
    >
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                timestamp={message.timestamp}
                onThoughtSelect={handleThoughtSelect}
              />
            ))}
            {isLoading && (
              <ChatMessage isLoading />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput 
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about production metrics, equipment status, or quality data..."
        />
      </div>
    </PageLayout>
  );
}