import React from 'react';
import { ChatMessage as ChatMessageType } from '@/models/chat';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: Pick<ChatMessageType, 'role' | 'content'>;
  timestamp?: string;
  isLoading?: boolean;
}

export default function ChatMessage({ message, timestamp, isLoading = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Format timestamp if provided
  const formattedTime = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : '';

  return (
    <div
      className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`chat-message-${isUser ? 'user' : 'assistant'}`}
    >
      <div
        className={`max-w-3/4 rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {/* For loading state */}
        {isLoading ? (
          <div className="flex space-x-2" data-testid="message-loading">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-line">{message.content}</div>
            {timestamp && (
              <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
                {formattedTime}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}