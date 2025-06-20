import React from 'react';
import Link from 'next/link';
import { ChatSession } from '@/models/chat';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryProps {
  sessions?: ChatSession[];
  currentSessionId?: string;
  onDeleteSession?: (sessionId?: string) => void;
  onRenameSession?: (sessionId?: string, title?: string) => void;
  className?: string;
}

export default function ChatHistory({ 
  sessions, 
  currentSessionId, 
  onDeleteSession,
  onRenameSession,
  className = ''
}: ChatHistoryProps) {
  const [isEditing, setIsEditing] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing
  React.useEffect(() => {
    if (isEditing && inputRef?.current) {
      inputRef?.current.focus();
    }
  }, [isEditing]);

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsEditing(session?.id);
    setEditTitle(session?.title);
  };

  const handleRename = (sessionId: string, e: React.FormEvent) => {
    e?.preventDefault();
    if (onRenameSession && editTitle?.trim()) {
      onRenameSession(sessionId, editTitle?.trim());
    }
    setIsEditing(null);
  };

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onDeleteSession && confirm('Are you sure you want to delete this chat?')) {
      onDeleteSession(sessionId);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <p>No chat history yet.</p>
        <p className="text-sm mt-2">Start a new chat to begin!</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${className}`}>
      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        Chat History
      </div>
      <ul className="space-y-1">
        {sessions?.map((session) => (
          <li key={session?.id}>
            {isEditing === session?.id ? (
              <form 
                onSubmit={(e) => handleRename(session?.id, e)}
                className="px-3 py-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e?.target.value)}
                  className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onBlur={() => setIsEditing(null)}
                />
              </form>
            ) : (
              <Link
                href={`/manufacturing-chat/${session?.id}`}
                className={`flex justify-between items-center px-3 py-2 text-sm rounded-lg ${
                  currentSessionId === session?.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="truncate font-medium">{session?.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(session?.updatedAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => handleStartRename(session, e)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="Rename chat"
                  >
                    <svg xmlns="http://www?.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(session?.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    aria-label="Delete chat"
                  >
                    <svg xmlns="http://www?.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}