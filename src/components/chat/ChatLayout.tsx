'use client';

import React from 'react';
import { Plus, MessageSquare, Calendar } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatLayoutProps {
  sessions: ChatSession[];
  currentSession: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  children: React.ReactNode;
}

export default function ChatLayout({
  sessions,
  currentSession,
  onNewSession,
  onSelectSession,
  children
}: ChatLayoutProps) {
  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.updatedAt);
      if (sessionDate.toDateString() === today.toDateString()) {
        groups.Today.push(session);
      } else if (sessionDate.toDateString() === yesterday.toDateString()) {
        groups.Yesterday.push(session);
      } else if (sessionDate > lastWeek) {
        groups['Previous 7 Days'].push(session);
      } else {
        groups.Older.push(session);
      }
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {Object.entries(sessionGroups).map(([groupName, groupSessions]) => {
            if (groupSessions.length === 0) return null;
            
            return (
              <div key={groupName} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {groupName}
                </h3>
                <div className="space-y-1">
                  {groupSessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        currentSession === session.id
                          ? 'bg-white dark:bg-gray-800 shadow-sm'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(session.updatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          
          {sessions.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No conversations yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Start a new chat to begin
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}