'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface ExploreMetricsProps {
  data?: any[];
  loading?: boolean;
  error?: string | null;
  queryHistory?: any[];
  className?: string;
}

const ExploreMetrics: React.FC<ExploreMetricsProps> = ({
  data,
  loading,
  error,
  queryHistory,
  className = ''
}) => {
  // Calculate metrics
  const totalDataPoints = data?.reduce((acc, frame) => {
    if (frame && frame?.length) {
      return acc + frame?.length;
    }
    return acc;
  }, 0);

  const successfulQueries = queryHistory?.filter(q => !q?.error).length;
  const failedQueries = queryHistory?.filter(q => q?.error).length;
  const avgExecutionTime = queryHistory?.length > 0
    ? queryHistory?.reduce((acc, q) => acc + q?.execution_time, 0) / queryHistory?.length
    : 0;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString();
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`flex items-center space-x-6 text-sm ${className}`}>
      {/* Data Points */}
      <div className="flex items-center space-x-2">
        <Activity className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <>
              <span className="font-medium">{formatNumber(totalDataPoints)}</span>
              <span className="text-gray-500"> points</span>
            </>
          )}
        </span>
      </div>

      {/* Success Rate */}
      {queryHistory?.length > 0 && (
        <div className="flex items-center space-x-2">
          {failedQueries === 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className="text-gray-600">
            <span className="font-medium">{successfulQueries}/{queryHistory?.length}</span>
            <span className="text-gray-500"> success</span>
          </span>
        </div>
      )}

      {/* Average Execution Time */}
      {queryHistory?.length > 0 && (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">
            <span className="font-medium">{formatTime(avgExecutionTime)}</span>
            <span className="text-gray-500"> avg</span>
          </span>
        </div>
      )}

      {/* Error Indicator */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Query Error</span>
        </div>
      )}
    </div>
  );
};

// Import Clock icon
import { Clock } from 'lucide-react';

export default ExploreMetrics;