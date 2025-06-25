'use client';

import React, { useState, useEffect } from 'react';
import { Play, Save, History, Code, AlertCircle } from 'lucide-react';
import { DataSourceInstanceSettings, DataQuery } from '@/types/datasource';

interface QueryEditorProps {
  datasource?: DataSourceInstanceSettings;
  query?: DataQuery;
  onChange?: (query?: DataQuery) => void;
  onRunQuery?: () => void;
  loading?: boolean;
  className?: string;
}

const QueryEditor: React.FC<QueryEditorProps> = ({
  datasource,
  query,
  onChange,
  onRunQuery,
  loading = false,
  className = ''
}) => {
  const [queryText, setQueryText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [localHistory, setLocalHistory] = useState<string[]>([]);

  useEffect(() => {
    // Initialize query text from query object
    if (query && typeof query === 'object') {
      setQueryText((query as any).expr || (query as any).query || '');
    }
  }, [query]);

  const handleQueryChange = (newQueryText: string) => {
    setQueryText(newQueryText);
    
    // Update query object based on datasource type
    const updatedQuery: DataQuery = {
      ...query,
      refId: query.refId || 'A'
    };

    // Add query text to appropriate field based on datasource type
    if (datasource?.type === 'prometheus') {
      (updatedQuery as any).expr = newQueryText;
    } else if (datasource?.type === 'postgres' || datasource?.type === 'mysql') {
      (updatedQuery as any).rawSql = newQueryText;
    } else {
      (updatedQuery as any).query = newQueryText;
    }

    onChange(updatedQuery);
  };

  const handleRun = () => {
    if (!queryText?.trim()) return;
    
    // Add to local history
    setLocalHistory(prev => [queryText, ...prev?.filter(q => q !== queryText).slice(0, 9)]);
    
    onRunQuery();
  };

  const getPlaceholder = () => {
    switch (datasource?.type) {
      case 'prometheus':
        return 'Enter a PromQL query, e?.g., rate(http_requests_total[5m])';
      case 'postgres':
        return 'Enter a SQL query, e?.g., SELECT * FROM equipment_metrics LIMIT 100';
      case 'influxdb':
        return 'Enter an InfluxQL query, e?.g., SELECT mean("value") FROM "temperature" WHERE time > now() - 1h';
      case 'elasticsearch':
        return 'Enter an Elasticsearch query...';
      default:
        return 'Enter your query...';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Query Editor</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Query History"
            >
              <History className="h-4 w-4" />
            </button>
            {/* Save button removed as it's not in the interface */}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={queryText}
            onChange={(e) => handleQueryChange(e?.target.value)}
            placeholder={getPlaceholder()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            rows={4}
            onKeyDown={(e) => {
              if (e?.key === 'Enter' && (e?.ctrlKey || e?.metaKey)) {
                handleRun();
              }
            }}
          />
          
          {/* Query History Dropdown */}
          {showHistory && localHistory?.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {localHistory?.map((historicalQuery, index) => (
                <button
                  key={index}
                  onClick={() => {
                    handleQueryChange(historicalQuery);
                    setShowHistory(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md font-mono truncate"
                >
                  {historicalQuery}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press Ctrl+Enter to run query
          </div>
          <button
            onClick={handleRun}
            disabled={!queryText?.trim() || loading}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${queryText?.trim() && !loading
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Play className="h-4 w-4" />
            <span>{loading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Query Helpers */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
          <div className="text-xs text-gray-600">
            {datasource?.type === 'prometheus' && (
              <span>
                Example queries: <code className="bg-gray-200 px-1 rounded">up</code>,{' '}
                <code className="bg-gray-200 px-1 rounded">rate(http_requests_total[5m])</code>,{' '}
                <code className="bg-gray-200 px-1 rounded">avg_over_time(temperature[1h])</code>
              </span>
            )}
            {datasource?.type === 'postgres' && (
              <span>
                Example queries: <code className="bg-gray-200 px-1 rounded">SELECT * FROM metrics</code>,{' '}
                <code className="bg-gray-200 px-1 rounded">SELECT AVG(value) FROM sensors WHERE time &gt; NOW() - INTERVAL &apos;1 hour&apos;</code>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryEditor;
export { QueryEditor };