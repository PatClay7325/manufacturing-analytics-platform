/**
 * Error State Components with Retry Controls
 * Implements Phase 1.3: Contextual Error Messages
 */

import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Database, Clock } from 'lucide-react';

export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  context?: 'connection' | 'data' | 'timeout' | 'permission' | 'generic';
  suggestions?: string[];
  className?: string;
}

export function ErrorState({ 
  error, 
  onRetry, 
  context = 'generic',
  suggestions = [],
  className = ''
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Get icon and color based on context
  const getErrorIcon = () => {
    switch (context) {
      case 'connection':
        return <WifiOff className="h-12 w-12 text-red-500" />;
      case 'data':
        return <Database className="h-12 w-12 text-orange-500" />;
      case 'timeout':
        return <Clock className="h-12 w-12 text-yellow-500" />;
      case 'permission':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  // Get contextual title
  const getErrorTitle = () => {
    switch (context) {
      case 'connection':
        return 'Connection Error';
      case 'data':
        return 'Data Loading Error';
      case 'timeout':
        return 'Request Timeout';
      case 'permission':
        return 'Access Denied';
      default:
        return 'Something went wrong';
    }
  };

  // Get default suggestions based on context
  const getDefaultSuggestions = () => {
    switch (context) {
      case 'connection':
        return [
          'Check your internet connection',
          'Verify the server is running',
          'Try refreshing the page'
        ];
      case 'data':
        return [
          'The requested data may not be available',
          'Check if the equipment is properly configured',
          'Verify your time range selection'
        ];
      case 'timeout':
        return [
          'The server is taking too long to respond',
          'Try reducing the time range',
          'Select fewer metrics to display'
        ];
      case 'permission':
        return [
          'You may not have access to this resource',
          'Contact your administrator',
          'Try logging in again'
        ];
      default:
        return ['Try refreshing the page', 'Contact support if the issue persists'];
    }
  };

  const allSuggestions = suggestions.length > 0 ? suggestions : getDefaultSuggestions();

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="text-center max-w-md">
        {getErrorIcon()}
        
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {getErrorTitle()}
        </h3>
        
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {errorMessage}
        </p>

        {allSuggestions.length > 0 && (
          <ul className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {allSuggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// Inline error for widgets
export function InlineError({ 
  message, 
  onRetry,
  className = '' 
}: { 
  message: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md ${className}`}>
      <div className="flex items-center">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
        <span className="text-sm text-red-700 dark:text-red-300">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 focus:outline-none"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; name?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; name?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Chart Error in ${this.props.name || 'Unknown'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <ErrorState
            error={this.state.error || 'Failed to render chart'}
            onRetry={this.handleReset}
            context="data"
            suggestions={[
              'This chart encountered an error while rendering',
              'The data format may be incorrect',
              'Try refreshing to reload the chart'
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = React.useCallback((error: Error) => {
    console.error('Dashboard error:', error);
    setError(error);
  }, []);

  const retry = React.useCallback(async (retryFn: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    try {
      await retryFn();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, isRetrying, handleError, retry, clearError };
}