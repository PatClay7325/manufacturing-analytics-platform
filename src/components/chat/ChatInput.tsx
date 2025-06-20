import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage?: (message?: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  isDisabled = false, 
  placeholder = "Type your message here..."
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input?.trim() || isDisabled) return;
    
    onSendMessage(input);
    setInput('');
  };

  // Handle Shift+Enter for new line and Enter for submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2" data-testid="chat-input-form">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none pl-4 pr-10 py-3 min-h-[44px] max-h-[150px]"
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          data-testid="chat-input-textarea"
        />
        <div className="absolute right-2 bottom-2 text-xs text-gray-400">
          {input?.length > 0 && (
            <span>Press Enter to send</span>
          )}
        </div>
      </div>
      <button 
        type="submit" 
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 h-[44px]"
        disabled={isDisabled || !input?.trim()}
        data-testid="chat-send-button"
      >
        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www?.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
        Send
      </button>
    </form>
  );
}