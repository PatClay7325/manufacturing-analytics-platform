'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

// Global error tracking
class ErrorTracker {
  private errors: Map<string, { error: Error; errorInfo: ErrorInfo; timestamp: Date; context?: string }> = new Map();
  
  public reportError(error: Error, errorInfo: ErrorInfo, context?: string): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.errors.set(errorId, {
      error,
      errorInfo,
      timestamp: new Date(),
      context
    });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔴 Error [${errorId}]`);
      console.log('Context:', context);
      console.error('Error:', error);
      console.log('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService({
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
    
    return errorId;
  }
  
  private async sendToMonitoringService(errorData: any): Promise<void> {
    try {
      // Replace with actual monitoring service (e.g., Sentry, DataDog, etc.)
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (err) {
      console.error('Failed to send error to monitoring service:', err);
    }
  }
  
  public getErrorHistory(): Array<{ id: string; error: Error; errorInfo: ErrorInfo; timestamp: Date; context?: string }> {
    return Array.from(this.errors.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }
  
  public clearErrors(): void {
    this.errors.clear();
  }
}

const globalErrorTracker = new ErrorTracker();

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = globalErrorTracker.reportError(error, errorInfo, this.props.context);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      context: this.props.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // Open bug report in new tab or modal
    const reportUrl = `/support/bug-report?data=${encodeURIComponent(JSON.stringify(bugReport))}`;
    window.open(reportUrl, '_blank');
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const isCritical = level === 'critical' || level === 'page';

      return (
        <div className={`flex flex-col items-center justify-center rounded-lg border p-8 ${
          isCritical 
            ? 'min-h-96 border-red-300 bg-red-50' 
            : 'min-h-64 border-yellow-200 bg-yellow-50'
        }`}>
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg
                className={`mx-auto h-12 w-12 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h3 className={`mb-2 text-lg font-medium ${
              isCritical ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {isCritical ? 'Critical Error' : 'Something went wrong'}
            </h3>
            
            <p className={`mb-4 text-sm ${
              isCritical ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {isCritical 
                ? 'A critical error occurred that prevented this page from loading properly.'
                : 'An unexpected error occurred in this component. You can try refreshing or continue using other parts of the application.'
              }
            </p>
            
            {this.state.errorId && (
              <p className={`mb-4 text-xs font-mono ${
                isCritical ? 'text-red-500' : 'text-yellow-500'
              }`}>
                Error ID: {this.state.errorId}
              </p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isCritical 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={this.handleReportBug}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Report Bug
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className={`cursor-pointer text-sm font-medium ${
                  isCritical ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  Error Details (Development)
                </summary>
                <div className={`mt-2 overflow-auto rounded p-3 text-xs ${
                  isCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <div className="mb-2">
                    <strong>Error:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error.toString()}</pre>
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                  </div>
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: string) => {
    const errorInfo: ErrorInfo = {
      componentStack: ''
    };
    return globalErrorTracker.reportError(error, errorInfo, context);
  };

  const getErrorHistory = () => globalErrorTracker.getErrorHistory();
  const clearErrors = () => globalErrorTracker.clearErrors();

  return { reportError, getErrorHistory, clearErrors };
};

export default ErrorBoundary;