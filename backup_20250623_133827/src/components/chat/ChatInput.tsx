'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Mic, StopCircle } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onSendMessage?: (message?: string) => void; // Legacy prop for compatibility
  isDisabled?: boolean; // Legacy prop for compatibility
}

export default function ChatInput({ 
  onSend,
  disabled = false,
  placeholder = "Send a message...",
  onSendMessage,
  isDisabled = false
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use new props or fall back to legacy props
  const isDisabledFinal = disabled || isDisabled;
  const onSendFinal = onSend || onSendMessage;

  const handleSubmit = () => {
    if (text.trim() && !isDisabledFinal && onSendFinal) {
      onSendFinal(text.trim());
      setText('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle file upload - for now just show alert
      alert(`File selected: ${file.name} (file upload not implemented yet)`);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording logic
      alert('Voice recording not implemented yet');
    }
  };

  return (
    <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end space-x-2">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabledFinal}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx"
          />

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={isDisabledFinal}
              placeholder={placeholder}
              className="w-full px-4 py-3 pr-12 resize-none rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
              data-testid="chat-input-textarea"
            />
            
            {/* Character count */}
            {text.length > 0 && (
              <div className="absolute bottom-1 right-12 text-xs text-gray-400">
                {text.length}/4000
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <button
            onClick={toggleRecording}
            disabled={isDisabledFinal}
            className={`p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'text-red-500 hover:text-red-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={isDisabledFinal || !text.trim()}
            className={`p-2 rounded-full transition-colors ${
              text.trim() && !isDisabledFinal
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            title="Send message"
            data-testid="chat-send-button"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
