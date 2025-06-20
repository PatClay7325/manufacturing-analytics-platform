'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import ChatHistory from '@/components/chat/ChatHistory';
import SampleQuestions from '@/components/chat/SampleQuestions';
import ChatInfo from '@/components/chat/ChatInfo';
import { ChatSession } from '@/models/chat';
import chatService from '@/services/chatService';

export default function ManufacturingChatPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch chat sessions
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const sessions = await chatService?.getAllSessions();
        setChatSessions(sessions);
      } catch (err) {
        setError('Failed to load chat sessions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessions();
  }, []);

  // Handle creating a new chat
  const handleNewChat = async () => {
    try {
      const newSession = await chatService?.createSession();
      router?.push(`/manufacturing-chat/${newSession?.id}`);
    } catch (err) {
      setError('Failed to create new chat session');
    }
  };

  // Handle selecting a sample question
  const handleSampleQuestion = async (question: string) => {
    try {
      // Create a new session with the question as the title
      const newSession = await chatService?.createSession(question);
      
      // Add the question as a user message
      await chatService?.addMessage(newSession?.id, {
        role: 'user',
        content: question
      });
      
      // Navigate to the new session
      router?.push(`/manufacturing-chat/${newSession?.id}`);
    } catch (err) {
      setError('Failed to create new chat session');
    }
  };

  // Handle deleting a chat session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatService?.deleteSession(sessionId);
      setChatSessions(prev => prev?.filter(session => session?.id !== sessionId));
    } catch (err) {
      setError('Failed to delete chat session');
    }
  };

  // Handle renaming a chat session
  const handleRenameSession = async (sessionId: string, title: string) => {
    try {
      const updatedSession = await chatService?.renameSession(sessionId, title);
      if (updatedSession) {
        setChatSessions(prev => prev?.map(session => 
          session?.id === sessionId ? updatedSession : session
        ));
      }
    } catch (err) {
      setError('Failed to rename chat session');
    }
  };

  // Action button for new chat
  const actionButton = (
    <button
      onClick={handleNewChat}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      data-testid="new-chat-button"
    >
      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
      New Chat
    </button>
  );

  return (
    <PageLayout
      title="Manufacturing Intelligence Chat"
      actionButton={actionButton}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={handleNewChat}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Start New Chat
              </button>
            </div>
            
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600 mb-2" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p>Loading chat history...</p>
              </div>
            ) : (
              <ChatHistory
                sessions={chatSessions}
                onDeleteSession={handleDeleteSession}
                onRenameSession={handleRenameSession}
                className="h-[calc(100vh-16rem)]"
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            {/* Welcome Banner */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Manufacturing Chat
              </h2>
              <p className="text-gray-700 mb-4">
                Start a new conversation or select a previous chat from the history. 
                The Manufacturing Assistant is connected to your manufacturing systems 
                and can provide insights and answers to your questions.
              </p>
              <button
                onClick={handleNewChat}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Start New Chat
              </button>
            </div>

            {/* Sample Questions */}
            <SampleQuestions
              onSelectQuestion={handleSampleQuestion}
              isDisabled={isLoading}
            />
            
            {/* Chat Info */}
            <ChatInfo />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
