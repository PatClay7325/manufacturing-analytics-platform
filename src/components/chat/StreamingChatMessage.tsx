import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface StreamingChatMessageProps {
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  timestamp?: string;
  isStreaming?: boolean;
  streamingContent?: string;
}

export default function StreamingChatMessage({ 
  role, 
  content = '', 
  timestamp, 
  isStreaming = false,
  streamingContent = ''
}: StreamingChatMessageProps) {
  const isUser = role === 'user';
  const [displayContent, setDisplayContent] = useState(content);
  const [showCursor, setShowCursor] = useState(isStreaming);

  // Update content when streaming
  useEffect(() => {
    if (isStreaming && streamingContent) {
      setDisplayContent(streamingContent);
    } else if (!isStreaming && content) {
      setDisplayContent(content);
      setShowCursor(false);
    }
  }, [isStreaming, streamingContent, content]);

  // Blinking cursor effect
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const formattedTime = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : '';

  return (
    <div
      className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
      data-testid="chat-message"
      data-sender={isUser ? 'user' : 'ai'}
    >
      <div
        className={`max-w-3/4 rounded-lg px-4 py-2 shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
        data-testid={`chat-message-${role}`}
      >
        {/* Show loading dots only if no content yet */}
        {isStreaming && !displayContent ? (
          <div className="flex space-x-2" data-testid="message-loading">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-line">
              {displayContent}
              {isStreaming && showCursor && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5" />
              )}
            </div>
            {timestamp && !isStreaming && (
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