'use client';

import React, { useState } from 'react';
import { History, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface HistoryItem {
  id: string;
  query: any;
  datasource: string;
  timestamp: Date;
  execution_time: number;
  error?: string;
}

interface QueryHistoryProps {
  history?: HistoryItem[];
  onSelectHistory?: (item?: HistoryItem) => void;
  className?: string;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({
  history,
  onSelectHistory,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now?.getTime() - date?.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date?.toLocaleDateString();
  };

  return (
    <div className={`bg-white ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <History className="h-4 w-4" />
          <span>Query History</span>
          {history?.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {history?.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-200">
          {history.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No query history yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history?.map((item) => (
                <button
                  key={item?.id}
                  onClick={() => onSelectHistory(item)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {item?.error ? (
                          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        ) : (
                          <Clock className="h-3 w-3 text-green-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(item?.timestamp)}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatExecutionTime(item?.execution_time)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-mono text-gray-700 truncate">
                        {item?.query && typeof item.query === 'object' && item.query.expr 
                          ? item?.query.expr 
                          : JSON.stringify(item?.query).substring(0, 50) + '...'}
                      </div>
                      {item?.error && (
                        <div className="mt-1 text-xs text-red-600 truncate">
                          {item?.error}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryHistory;