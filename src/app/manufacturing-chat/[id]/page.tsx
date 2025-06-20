'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType, ChatSession } from '@/models/chat';
import chatService from '@/services/chatService';

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params?.id as string;
  const router = useRouter();
  
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const scrollTimeoutRef = useRef<NodeJSTimeout>();

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const sessionData = await chatService?.getSessionById(sessionId);
        if (sessionData) {
          setSession(sessionData);
          setMessages(sessionData?.messages);
        } else {
          setError('Chat session not found');
        }
      } catch (err) {
        setError('Failed to load chat session');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSession();
  }, [sessionId]);

  // Scroll to bottom only when new messages are added (not on every render)
  useEffect(() => {
    // Only scroll if we're not loading and if user hasn't scrolled up
    if (!isLoading && messages?.length > 0 && !userHasScrolled) {
      // Check if user is near bottom (within 100px)
      const scrollContainer = messagesEndRef?.current?.parentElement;
      if (scrollContainer) {
        const isNearBottom = scrollContainer?.scrollHeight - scrollContainer?.scrollTop - scrollContainer?.clientHeight < 100;
        if (isNearBottom) {
          messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages?.length, userHasScrolled]); // Only trigger on length change, not content changes

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const scrollContainer = messagesEndRef?.current?.parentElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const isNearBottom = scrollContainer?.scrollHeight - scrollContainer?.scrollTop - scrollContainer?.clientHeight < 100;
      
      // User has scrolled up
      if (!isNearBottom) {
        setUserHasScrolled(true);
        
        // Clear existing timeout
        if (scrollTimeoutRef?.current) {
          clearTimeout(scrollTimeoutRef?.current);
        }
        
        // Reset after 5 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          setUserHasScrolled(false);
        }, 5000);
      } else {
        setUserHasScrolled(false);
      }
    };

    scrollContainer?.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef?.current) {
        clearTimeout(scrollTimeoutRef?.current);
      }
    };
  }, []);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!session || !content?.trim()) return;

    // Add user message to UI
    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);

    // Check if this query needs database access
    const queryLower = content?.toLowerCase();
    const needsDatabase = queryLower?.includes('oee') || 
                        queryLower?.includes('equipment') || 
                        queryLower?.includes('status') || 
                        queryLower?.includes('alert') || 
                        queryLower?.includes('production') || 
                        queryLower?.includes('metric') ||
                        queryLower?.includes('current') ||
                        queryLower?.includes('show');
    
    if (needsDatabase) {
      // Add "Checking database..." message
      setMessages(prev => [...prev, {
        id: `checking-${Date.now()}`,
        role: 'assistant',
        content: 'Checking database...',
        timestamp: new Date().toISOString()
      }]);
    }

    try {
      // Add user message to session
      await chatService?.addMessage(session?.id, {
        role: 'user',
        content
      });

      // Get all messages in the session for context
      const updatedSession = await chatService?.getSessionById(session?.id);
      if (!updatedSession) throw new Error('Session not found');

      // Get AI response
      const aiResponse = await chatService?.getAIResponse(
        session?.id,
        (updatedSession?.messages || []).map(msg => ({
          role: msg.role,
          content: msg.content,
          name: msg.name
        }))
      );

      // Add AI response to session
      await chatService?.addMessage(session?.id, aiResponse);

      // Refresh session to get updated messages
      const finalSession = await chatService?.getSessionById(session?.id);
      if (finalSession) {
        setSession(finalSession);
        // If we showed "Checking database...", replace it with the actual response
        if (needsDatabase) {
          setMessages(prev => {
            const filtered = prev?.filter(msg => !msg?.content.includes('Checking database...'));
            return [...filtered, {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              content: aiResponse.content,
              timestamp: new Date().toISOString()
            }];
          });
        } else {
          setMessages(finalSession?.messages);
        }
      }
    } catch (error) {
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again later.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Action button to go back to all chats
  const actionButton = (
    <Link
      href="/manufacturing-chat"
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      All Chats
    </Link>
  );

  if (isLoading) {
    return (
      <PageLayout
        title="Loading Chat..."
        actionButton={actionButton}
      >
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="ml-2 text-gray-500">Loading chat session...</p>
        </div>
      </PageLayout>
    );
  }

  if (error || !session) {
    return (
      <PageLayout
        title="Chat Not Found"
        actionButton={actionButton}
      >
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || 'Chat session not found'}</p>
            </div>
          </div>
        </div>
        <Link 
          href="/manufacturing-chat" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          &larr; Back to all chats
        </Link>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={session?.title}
      actionButton={actionButton}
    >
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-[calc(75vh-2rem)] flex flex-col relative">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages
              .filter(msg => msg?.role !== 'system') // Filter out system messages
              .map((msg) => (
                <ChatMessage
                  key={msg?.id}
                  message={msg}
                  timestamp={msg?.timestamp}
                />
              ))}
            
            {isLoadingResponse && (
              <ChatMessage
                message={{ role: 'assistant', content: '' }}
                isLoading={true}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom indicator */}
          {userHasScrolled && (
            <div className="absolute bottom-20 right-4">
              <button
                onClick={() => {
                  setUserHasScrolled(false);
                  messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors"
                title="Scroll to bottom"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}

          {/* Chat input */}
          <div className="border-t border-gray-200 p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              isDisabled={isLoadingResponse}
              placeholder="Ask about production metrics, equipment status, maintenance, etc."
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}