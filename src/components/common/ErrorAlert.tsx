import React from 'react';

interface ErrorAlertProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export default function ErrorAlert({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  type = 'error',
}: ErrorAlertProps) {
  const baseClasses = 'rounded-md p-4 mb-4';
  const typeClasses = {
    error: 'bg-red-50 border border-red-200',
    warning: 'bg-yellow-50 border border-yellow-200',
    info: 'bg-blue-50 border border-blue-200',
  };

  const iconClasses = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const textClasses = {
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  const buttonClasses = {
    error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h?.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        );
      case 'warning':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h?.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        );
      case 'info':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
    }
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${iconClasses[type]}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {getIcon()}
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${textClasses[type]}`}>
            {title}
          </h3>
          <div className={`mt-2 text-sm ${textClasses[type]}`}>
            <p>{message}</p>
          </div>
          {(onRetry || onDismiss) && (
            <div className="mt-4">
              <div className="flex space-x-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClasses[type]}`}
                  >
                    Try Again
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className={`inline-flex items-center rounded-md border border-transparent bg-transparent px-3 py-2 text-sm font-medium ${textClasses[type]} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClasses[type].split(' ')[2]}`}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}